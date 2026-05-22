import { type ComputeDiffOptions, computeDiff } from '@platejs/diff';
import {
  type Descendant,
  type SlateEditor,
  type ValueOf,
  ElementApi,
  KEYS,
  nanoid,
  TextApi,
} from 'platejs';

import { BaseSuggestionPlugin } from './BaseSuggestionPlugin';
import { getSuggestionProps } from './transforms';
import { getSuggestionKey } from './utils';

export function diffToSuggestions<E extends SlateEditor>(
  editor: E,
  doc0: Descendant[],
  doc1: Descendant[],
  {
    getDeleteProps = (node, ctx) =>
      getSuggestionProps(editor, node, {
        id: ctx?.pairId,
        suggestionDeletion: true,
      }),
    getInsertProps = (node, ctx) =>
      getSuggestionProps(editor, node, { id: ctx?.pairId }),
    getUpdateProps = (node, _properties, newProperties) =>
      getSuggestionProps(editor, node, {
        suggestionUpdate: newProperties,
      }),
    isInline = editor.api.isInline,
    // Use nanoid so the pair id is in the same format the suggestion plugin
    // generates everywhere else. Without this override, the diff package would
    // fall back to a counter-based id which wouldn't collide with anything in
    // practice but is harder to spot in dev tools.
    generatePairId = () => nanoid(),
    ...options
  }: Partial<ComputeDiffOptions> = {}
): ValueOf<E> {
  const values = computeDiff(doc0, doc1, {
    getDeleteProps,
    getInsertProps,
    getUpdateProps,
    isInline,
    generatePairId,
    ...options,
  }) as ValueOf<E>;

  // Recursively traverse all nodes to process elements and their children
  const traverseNodes = (nodes: Descendant[]): Descendant[] => {
    return nodes.map((node, index) => {
      if (ElementApi.isElement(node) && 'children' in node) {
        // If the node is an element with children, recursively process its children
        return {
          ...node,
          children: traverseNodes(node.children),
        };
      }

      if (TextApi.isText(node) && node[KEYS.suggestion]) {
        return unifyAdjacentSuggestionIds(node, index, nodes, editor);
      }
      return node;
    });
  };

  return traverseNodes(values) as ValueOf<E>;
}

/**
 * Unifies the ID of adjacent insert and remove suggestions so the UI treats
 * them as a single reviewable change.
 *
 * Two orderings are handled:
 *
 *   - Remove → Insert (default / `delete-first` flush order):
 *     the insert leaf inherits the remove leaf's id + createdAt.
 *   - Insert → Remove (`insert-first` flush order):
 *     the remove leaf inherits the insert leaf's id + createdAt.
 *
 * Without this pass, the new-above-old presentation would emit two separate
 * suggestion groups for what is conceptually one change.
 */
function unifyAdjacentSuggestionIds<E extends SlateEditor>(
  node: Descendant,
  index: number,
  nodes: Descendant[],
  editor: E
): Descendant {
  const api = editor.getApi(BaseSuggestionPlugin);
  const currentNodeData = api.suggestion.suggestionData(node as any);

  if (!currentNodeData) return node;

  const previousNode = index > 0 ? nodes[index - 1] : null;
  const nextNode = index < nodes.length - 1 ? nodes[index + 1] : null;

  // Case 1: current insert follows a remove (delete-first order).
  if (currentNodeData.type === 'insert' && previousNode?.[KEYS.suggestion]) {
    const previousData = api.suggestion.suggestionData(previousNode as any);

    if (previousData?.type === 'remove') {
      return rewriteSuggestionId(
        node,
        currentNodeData,
        previousData.id,
        previousData.createdAt
      );
    }
  }

  // Case 2: current remove follows an insert (insert-first order).
  if (currentNodeData.type === 'remove' && previousNode?.[KEYS.suggestion]) {
    const previousData = api.suggestion.suggestionData(previousNode as any);

    if (previousData?.type === 'insert') {
      return rewriteSuggestionId(
        node,
        currentNodeData,
        previousData.id,
        previousData.createdAt
      );
    }
  }

  // Case 3: current insert is followed by a remove (also insert-first order;
  // covers the case where we walk the insert first and need to forward our id
  // to the upcoming remove). In practice case 2 catches this on the next
  // iteration, so we leave the insert as-is here.
  void nextNode;

  return node;
}

function rewriteSuggestionId(
  node: Descendant,
  currentNodeData: { id: string; createdAt: number; type: string },
  targetId: string,
  targetCreatedAt: number
): Descendant {
  const updatedNode = {
    ...node,
    [getSuggestionKey(targetId)]: {
      ...currentNodeData,
      id: targetId,
      createdAt: targetCreatedAt,
    },
  };

  const oldKey = getSuggestionKey(currentNodeData.id);
  if (oldKey !== getSuggestionKey(targetId)) {
    delete updatedNode[oldKey];
  }

  return updatedNode;
}
