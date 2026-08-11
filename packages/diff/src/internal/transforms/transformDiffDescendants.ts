/**
 * This Apache-2.0 licensed file has been modified by Udecode and other
 * contributors. See /packages/diff/LICENSE for more information.
 */

import { type Descendant, TextApi } from 'platejs';

import type { ComputeDiffOptions } from '../../lib/computeDiff';
import type { StringCharMapping } from '../utils/string-char-mapping';

import { pairBlocksWithWordHints } from '../transforms/pairBlocksWithWordHints';
import { transformDiffNodes } from '../transforms/transformDiffNodes';
import { transformDiffTexts } from '../transforms/transformDiffTexts';
import { type NodeRelatedItem, diffNodes } from '../utils/diff-nodes';
import { isEqual } from '../utils/is-equal';

export interface TransformDiffDescendantsOptions extends ComputeDiffOptions {
  stringCharMapping: StringCharMapping;
}

const OP_UNCHANGED = 0;
const OP_DELETE = -1;
const OP_INSERT = 1;

type Op = -1 | 0 | 1;

export function transformDiffDescendants(
  diff: [Op, string][],
  { stringCharMapping, ...options }: TransformDiffDescendantsOptions
): Descendant[] {
  const { getDeleteProps, getInsertProps, ignoreProps, isInline } = options;
  const granularity = options.granularity ?? 'inline';
  const pairOrder = options.pairOrder ?? 'delete-first';

  // Current index in the diff array
  let i = 0;
  const children: Descendant[] = [];

  let insertBuffer: Descendant[] = [];
  let deleteBuffer: Descendant[] = [];

  const flushBuffers = () => {
    // Pair ordering: deletes-above-inserts (git unified default) or
    // inserts-above-deletes (read-the-new-content-first presentation).
    if (pairOrder === 'insert-first') {
      children.push(...insertBuffer, ...deleteBuffer);
    } else {
      children.push(...deleteBuffer, ...insertBuffer);
    }
    insertBuffer = [];
    deleteBuffer = [];
  };

  // Cursors into the two source docs. `computeDiff` maps doc0 then doc1 into
  // a shared char space; an OP_UNCHANGED chunk of length N consumes the next
  // N nodes from BOTH docs (they are positionally aligned by DMP). We track
  // both cursors so a structural pairing (same char, byte-UNEQUAL nodes) can
  // recover the new-side node by position rather than relying on
  // `stringToNodes`, which only ever resolves the old side. The source docs
  // are attached to the mapping by `computeDiff`.
  let doc0Cursor = 0;
  let doc1Cursor = 0;
  const doc0 = stringCharMapping.sourceDoc0 ?? [];
  const doc1 = stringCharMapping.sourceDoc1 ?? [];

  const insertNode = (node: Descendant) =>
    insertBuffer.push({
      ...node,
      ...getInsertProps(node),
    });

  const deleteNode = (node: Descendant) =>
    deleteBuffer.push({
      ...node,
      ...getDeleteProps(node),
    });

  const passThroughNodes = (...nodes: Descendant[]) => {
    flushBuffers();
    children.push(...nodes);
  };

  const isInlineList = (nodes: Descendant[]) =>
    nodes.every((node) => TextApi.isText(node) || isInline(node));

  while (i < diff.length) {
    const chunk = diff[i];
    const op = chunk[0];
    const val = chunk[1];

    // Convert the string value to document nodes based on the stringCharMapping
    const nodes = stringCharMapping.stringToNodes(val);

    switch (op) {
      case OP_UNCHANGED: {
        // Advance both cursors by the chunk length: an unchanged run
        // consumes the next `val.length` nodes from BOTH docs.
        const len = val.length;
        const newSlice = doc1.slice(doc1Cursor, doc1Cursor + len);
        const oldSlice = doc0.slice(doc0Cursor, doc0Cursor + len);

        // Structural pairing: when the chunk's char sequence contains a
        // byte-UNEQUAL (old, new) pair kept on the same char by structural
        // identity, `stringToNodes` only resolved the OLD side. Routing the
        // run through `pairBlocksWithWordHints` lets the per-element
        // strategy reconcile the pair (granular prop update + child
        // recursion) instead of silently emitting the pre-edit nodes.
        const hasStructuralPair =
          typeof stringCharMapping.structuralOldForChar === 'function' &&
          val
            .split('')
            .some(
              (c) => stringCharMapping.structuralOldForChar(c) !== undefined
            );

        if (granularity === 'block' && hasStructuralPair) {
          const paired = pairBlocksWithWordHints(oldSlice, newSlice, options);
          flushBuffers();
          children.push(...paired);
        } else {
          passThroughNodes(...nodes);
        }

        doc0Cursor += len;
        doc1Cursor += len;
        // Move to the next diff chunk
        i += 1;
        continue;
      }

      case OP_DELETE: {
        // Check if the next chunk is an insertion, indicating a replace operation
        if (i < diff.length - 1 && diff[i + 1][0] === OP_INSERT) {
          // Value of the next chunk (to be inserted)
          const nextVal = diff[i + 1][1];
          const nextLen = nextVal.length;
          // Convert next value to nodes
          const nextNodes = stringCharMapping.stringToNodes(nextVal);

          /**
           * If the node lists are identical when ignored props are excluded,
           * just return nextNodes.
           */
          if (isEqual(nodes, nextNodes, { ignoreDeep: ignoreProps })) {
            passThroughNodes(...nextNodes);
            doc0Cursor += val.length;
            doc1Cursor += nextLen;
            // Consume two diff chunks (delete and insert)
            i += 2;

            continue;
          }

          // Block-granularity mode: each top-level block is one diff unit.
          // `pairBlocksWithWordHints` produces a fully-ordered list of
          // diff'd descendants (unchanged container wrappers, paired
          // delete/insert blocks interleaved by `pairOrder`, standalone
          // overflows). We bypass the delete/insert buffers entirely so the
          // per-pair ordering survives — but we still flush any pending
          // inline buffer from a preceding chunk first.
          if (granularity === 'block') {
            const pairedBlocks = pairBlocksWithWordHints(
              nodes,
              nextNodes,
              options
            );
            flushBuffers();
            children.push(...pairedBlocks);
            doc0Cursor += val.length;
            doc1Cursor += nextLen;
            i += 2;
            continue;
          }

          // If both current and next chunks are text nodes, use transformTextNodes
          if (isInlineList(nodes) && isInlineList(nextNodes)) {
            passThroughNodes(...transformDiffTexts(nodes, nextNodes, options));
            // Consume two diff chunks (delete and insert)
            i += 2;
            doc0Cursor += val.length;
            doc1Cursor += nextLen;

            continue;
          }

          // If not all nodes are text nodes, use diffNodes to generate operations
          const diffResult = diffNodes(nodes, nextNodes, options);
          diffResult.forEach((item: NodeRelatedItem) => {
            if (item.delete) {
              deleteNode(item.originNode);
            }
            if (item.insert) {
              insertNode(item.originNode);
            }
            if (item.relatedNode) {
              const diffNodesResult = transformDiffNodes(
                item.originNode,
                item.relatedNode,
                options
              );

              if (diffNodesResult) {
                passThroughNodes(...diffNodesResult);
              } else {
                deleteNode(item.originNode);
                insertNode(item.relatedNode);
              }
            }
          });
          i += 2; // This consumed two entries from the diff array.
          doc0Cursor += val.length;
          doc1Cursor += nextLen;

          continue;
        }
        // Plain delete of some nodes (with no insert immediately after)
        for (const node of nodes) {
          deleteNode(node);
        }
        doc0Cursor += val.length;

        i += 1; // Consumes only one entry from diff array.

        continue;
      }
      case OP_INSERT: {
        // insert new nodes.
        for (const node of nodes) {
          insertNode(node);
        }
        doc1Cursor += val.length;

        i += 1;

        continue;
      }
    }
  }

  flushBuffers();

  return children;
}
