import type { Descendant, Path, PathRef, SlateEditor, Value } from 'platejs';

import { ElementApi, PathApi } from 'platejs';

import {
  type AIEditGroup,
  type AIEditGroupKind,
  type AIEditTextDiff,
  diffAIEdit,
} from './diffAIEdit';

/** One change mapped onto the live editor, before it is committed. */
export interface AIEditPlanItem {
  kind: AIEditGroupKind;
  /** Live parent path. */
  parent: Path;
  /** Live index of the first affected child. */
  index: number;
  /** Live nodes that are replaced (the edited node for `text` / `props`). */
  removed: Descendant[];
  /** Target nodes (the target node for `text` / `props`). */
  inserted: Descendant[];
  text?: AIEditTextDiff;
}

/** A committed plan item, tracked in the live editor. */
export interface AIEditCommitted {
  item: AIEditPlanItem;
  /** Resulting nodes, in order. Empty for pure removals. */
  refs: PathRef[];
  /** Sibling that marks where removed content used to be. */
  anchor?: { after: boolean; ref: PathRef };
}

type Tree = { children?: Tree[]; type?: unknown; [key: string]: unknown };

const isRun = (kind: AIEditGroupKind) =>
  kind === 'insert' || kind === 'remove' || kind === 'replace';

const nodeAt = (root: Descendant[], path: Path): Tree | undefined =>
  path.reduce<Tree | undefined>((node, index) => node?.children?.[index], {
    children: root as Tree[],
  });

export const createIgnoredProp =
  (ignoreProps: readonly string[] = []) =>
  (key: string) =>
    key === 'id' || ignoreProps.includes(key);

/**
 * Map the structural difference between `before` and `after` onto the live
 * editor. `before` may be a canonical (for example markdown round-tripped)
 * form of the live value: wherever the live tree's shape diverges from it, the
 * change is promoted to the nearest ancestor that still lines up, so the
 * result is always correct and never touches unchanged nodes.
 */
export function planAIEdit(
  editor: SlateEditor,
  before: Descendant[],
  after: Descendant[],
  options: {
    ignoreProps?: readonly string[];
    keyCache?: WeakMap<object, string>;
  } = {}
): AIEditPlanItem[] {
  const groups = diffAIEdit(before, after, {
    isIgnoredProp: createIgnoredProp(options.ignoreProps),
    isInline: (node) => ElementApi.isElement(node) && editor.api.isInline(node),
    keyCache: options.keyCache,
  });
  const live = editor.children as Tree[];
  const items: AIEditPlanItem[] = [];

  const replaceAt = ([beforePath, afterPath]: [Path, Path]) => {
    const parent = beforePath.slice(0, -1);
    const siblings = nodeAt(live as Descendant[], parent)?.children ?? [];
    const index = Math.min(beforePath.at(-1)!, siblings.length);
    const current = siblings[index];
    items.push({
      kind: current ? 'replace' : 'insert',
      parent,
      index,
      removed: current ? [current as Descendant] : [],
      inserted: [nodeAt(after, afterPath) as Descendant],
    });
  };

  for (const group of groups) {
    let container: Tree = { children: live };
    let broken = -1;
    for (const [depth, [beforePath]] of group.ancestors.entries()) {
      const candidate = container.children?.[beforePath.at(-1)!];
      if (
        !candidate ||
        !Array.isArray(candidate.children) ||
        candidate.type !== nodeAt(before, beforePath)?.type
      ) {
        broken = depth;
        break;
      }
      container = candidate;
    }
    if (broken !== -1) {
      replaceAt(group.ancestors[broken]);
      continue;
    }
    mapGroup(group, container.children ?? [], before, after, items, replaceAt);
  }

  return dedupe(items);
}

function mapGroup(
  group: AIEditGroup,
  siblings: Tree[],
  before: Descendant[],
  after: Descendant[],
  items: AIEditPlanItem[],
  replaceAt: (paths: [Path, Path]) => void
) {
  const parent = group.ancestors.at(-1)?.[0] ?? [];
  const afterParent = group.ancestors.at(-1)?.[1] ?? [];
  const beforeSiblings = nodeAt(before, parent)?.children ?? [];
  const inserted = (nodeAt(after, afterParent)?.children ?? []).slice(
    group.afterIndex,
    group.afterIndex + group.insertCount
  ) as Descendant[];

  if (!isRun(group.kind)) {
    const current = siblings[group.beforeIndex];
    if (current?.type === beforeSiblings[group.beforeIndex]?.type) {
      items.push({
        kind: group.kind,
        parent,
        index: group.beforeIndex,
        removed: [current as Descendant],
        inserted,
        text: group.text,
      });
      return;
    }
    items.push({
      kind: current ? 'replace' : 'insert',
      parent,
      index: Math.min(group.beforeIndex, siblings.length),
      removed: current ? [current as Descendant] : [],
      inserted,
    });
    return;
  }

  const available = siblings.length - group.beforeIndex;
  const aligned = siblings
    .slice(group.beforeIndex, group.beforeIndex + group.removeCount)
    .every(
      (node, offset) =>
        node.type === beforeSiblings[group.beforeIndex + offset]?.type
    );
  if ((available < group.removeCount || !aligned) && group.ancestors.length) {
    replaceAt(group.ancestors.at(-1)!);
    return;
  }
  const index = Math.min(group.beforeIndex, siblings.length);
  const removed = siblings.slice(
    index,
    index + group.removeCount
  ) as Descendant[];
  items.push({
    kind:
      removed.length === 0
        ? 'insert'
        : inserted.length === 0
          ? 'remove'
          : 'replace',
    parent,
    index,
    removed,
    inserted,
  });
}

const location = (item: AIEditPlanItem): Path =>
  isRun(item.kind) && item.removed.length === 0
    ? item.parent
    : [...item.parent, item.index];

function compareItems(a: AIEditPlanItem, b: AIEditPlanItem) {
  const at = [...a.parent, a.index];
  const bt = [...b.parent, b.index];
  const order = PathApi.compare(at, bt);
  if (order !== 0) return order;
  // Ancestors precede their descendants.
  if (at.length !== bt.length) return at.length - bt.length;
  // An insertion before node `i` precedes an in-place edit of node `i`.
  return Number(!isRun(a.kind)) - Number(!isRun(b.kind));
}

/** Document order; drop items inside nodes another item replaces. */
function dedupe(items: AIEditPlanItem[]): AIEditPlanItem[] {
  const sorted = items.toSorted(compareItems);
  const kept: AIEditPlanItem[] = [];
  for (const item of sorted) {
    const at = location(item);
    const covered = kept.some(
      (other) =>
        isRun(other.kind) &&
        other.removed.some((_, offset) => {
          const removedPath = [...other.parent, other.index + offset];
          return (
            PathApi.equals(removedPath, at) ||
            PathApi.isAncestor(removedPath, at)
          );
        })
    );
    const duplicate = kept.some(
      (other) =>
        other.kind === item.kind &&
        other.index === item.index &&
        PathApi.equals(other.parent, item.parent)
    );
    if (!covered && !duplicate) kept.push(item);
  }
  return kept;
}

const ownProps = (node: Tree, isIgnored: (key: string) => boolean) =>
  Object.keys(node).filter(
    (key) => key !== 'children' && key !== 'text' && !isIgnored(key)
  );

/** `set_node` from `current` to `target`'s own properties, if they differ. */
function setOwnProps(
  editor: SlateEditor,
  path: Path,
  current: Tree,
  target: Tree,
  isIgnored: (key: string) => boolean
) {
  const properties: Record<string, unknown> = {};
  const newProperties: Record<string, unknown> = {};
  for (const key of new Set([
    ...ownProps(current, isIgnored),
    ...ownProps(target, isIgnored),
  ])) {
    if (JSON.stringify(current[key]) === JSON.stringify(target[key])) continue;
    properties[key] = current[key];
    newProperties[key] = target[key] ?? null;
  }
  if (Object.keys(newProperties).length)
    editor.tf.apply({ type: 'set_node', path, properties, newProperties });
}

const sameMarks = (a: Tree, b: Tree) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  keys.delete('text');
  for (const key of keys)
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) return false;
  return true;
};

/**
 * Replace an element's children. When both sides are the same run of text
 * leaves with identical marks, edit text in place so DOM text nodes and any
 * selection inside unchanged words survive.
 */
function replaceChildren(
  editor: SlateEditor,
  path: Path,
  current: Tree[],
  target: Tree[]
) {
  const inPlace =
    current.length === target.length &&
    current.every(
      (leaf, index) =>
        typeof leaf.text === 'string' &&
        typeof target[index].text === 'string' &&
        sameMarks(leaf, target[index])
    );
  if (inPlace) {
    current.forEach((leaf, index) => {
      const from = leaf.text as string;
      const to = target[index].text as string;
      if (from === to) return;
      let prefix = 0;
      while (prefix < from.length && from[prefix] === to[prefix]) prefix++;
      let suffix = 0;
      while (
        suffix < from.length - prefix &&
        suffix < to.length - prefix &&
        from.at(-1 - suffix) === to.at(-1 - suffix)
      )
        suffix++;
      const leafPath = [...path, index];
      const removed = from.slice(prefix, from.length - suffix);
      const insertedText = to.slice(prefix, to.length - suffix);
      if (removed)
        editor.tf.apply({
          type: 'remove_text',
          path: leafPath,
          offset: prefix,
          text: removed,
        });
      if (insertedText)
        editor.tf.apply({
          type: 'insert_text',
          path: leafPath,
          offset: prefix,
          text: insertedText,
        });
    });
    return;
  }
  for (let index = current.length - 1; index >= 0; index--)
    editor.tf.apply({
      type: 'remove_node',
      path: [...path, index],
      node: current[index] as Descendant,
    });
  for (const [index, node] of target.entries())
    editor.tf.apply({
      type: 'insert_node',
      path: [...path, index],
      node: structuredClone(node) as Descendant,
    });
}

/** Replace `removed` siblings at `parent[index]` with `inserted` ones. */
function replaceSiblings(
  editor: SlateEditor,
  parent: Path,
  index: number,
  removed: Descendant[],
  inserted: Descendant[]
) {
  for (let offset = removed.length - 1; offset >= 0; offset--)
    editor.tf.apply({
      type: 'remove_node',
      path: [...parent, index + offset],
      node: removed[offset],
    });
  inserted.forEach((node, offset) => {
    const previous = removed[offset] as Tree | undefined;
    const clone = structuredClone(node) as Tree;
    // A same-type positional replacement keeps its identity for comments,
    // anchors and collaboration cursors.
    if (previous?.id !== undefined && previous.type === clone.type)
      clone.id = previous.id;
    editor.tf.apply({
      type: 'insert_node',
      path: [...parent, index + offset],
      node: clone as Descendant,
    });
  });
}

/**
 * Apply a plan with minimal operations: later positions first so earlier
 * paths stay valid, one normalization pass at the end. Returns tracked
 * results in document order.
 */
export function commitAIEditPlan(
  editor: SlateEditor,
  plan: AIEditPlanItem[],
  options: { ignoreProps?: readonly string[] } = {}
): AIEditCommitted[] {
  const isIgnored = createIgnoredProp(options.ignoreProps);
  const committed: AIEditCommitted[] = [];
  editor.tf.withoutNormalizing(() => {
    for (const item of plan.toReversed()) {
      const path = [...item.parent, item.index];
      if (!isRun(item.kind)) {
        const current = item.removed[0] as Tree;
        const target = item.inserted[0] as Tree;
        setOwnProps(editor, path, current, target, isIgnored);
        if (item.kind === 'text')
          replaceChildren(
            editor,
            path,
            current.children ?? [],
            target.children ?? []
          );
        committed.push({ item, refs: [editor.api.pathRef(path)] });
        continue;
      }
      replaceSiblings(
        editor,
        item.parent,
        item.index,
        item.removed,
        item.inserted
      );
      const refs = item.inserted.map((_, offset) =>
        editor.api.pathRef([...item.parent, item.index + offset])
      );
      let anchor: AIEditCommitted['anchor'];
      if (refs.length === 0) {
        const siblings =
          nodeAt(editor.children as Descendant[], item.parent)?.children ?? [];
        if (siblings[item.index])
          anchor = { after: false, ref: editor.api.pathRef(path) };
        else if (item.index > 0)
          anchor = {
            after: true,
            ref: editor.api.pathRef([...item.parent, item.index - 1]),
          };
      }
      committed.push({ item, refs, anchor });
    }
  });
  return committed.toReversed();
}

/** Plan and commit in one step. `before` defaults to the live value. */
export function commitAIEdit(
  editor: SlateEditor,
  value: Value,
  options: { beforeValue?: Value; ignoreProps?: readonly string[] } = {}
): AIEditCommitted[] {
  const plan = planAIEdit(
    editor,
    options.beforeValue ?? editor.children,
    value,
    options
  );
  return commitAIEditPlan(editor, plan, options);
}
