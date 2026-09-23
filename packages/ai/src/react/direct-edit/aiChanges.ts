import type {
  Descendant,
  Operation,
  Path,
  PathRef,
  SlateEditor,
  Value,
} from 'platejs';

import { ElementApi, NodeApi, PathApi } from 'platejs';

import {
  type AIEditGroupKind,
  type AIEditTextDiff,
  diffAIEdit,
} from './diffAIEdit';
import {
  createIgnoredProp,
  replaceChildren,
  replaceSiblings,
  setOwnProps,
} from './planAIEdit';

/**
 * - `new`: highlighted until acknowledged.
 * - `seen`: acknowledged by hovering; still revertible until accepted.
 */
export type AIChangeStatus = 'new' | 'seen';

/** One AI-authored change, relative to the session baseline. */
export interface AIChange {
  id: string;
  kind: AIEditGroupKind;
  status: AIChangeStatus;
  /** Hidden while edit playback has not reached it yet. */
  pending: boolean;
  /** Resulting nodes, in order. Empty for pure removals. */
  refs: PathRef[];
  /** Sibling marking where removed content used to be. */
  anchor?: { after: boolean; ref: PathRef };
  /** Original nodes, restored on reject. For `text`/`props`: the original node. */
  removed: Descendant[];
  /** Word-level difference, for `text` changes. */
  text?: AIEditTextDiff;
  /** Baseline location, while the session baseline is live. */
  base?: { parent: Path; index: number; count: number };
  /** Node identities when last computed; unchanged tokens carry status over. */
  tokens: object[];
}

type Tree = { children?: Tree[]; [key: string]: unknown };

const TOUCHING = new Set<Operation['type']>([
  'insert_node',
  'insert_text',
  'merge_node',
  'move_node',
  'remove_node',
  'remove_text',
  'split_node',
]);

let sequence = 0;

const nodeAt = (root: Descendant[], path: Path): Tree | undefined =>
  path.reduce<Tree | undefined>((node, index) => node?.children?.[index], {
    children: root as Tree[],
  });

const covers = (outer: Path, inner: Path) =>
  PathApi.equals(outer, inner) || PathApi.isAncestor(outer, inner);

/**
 * Per-editor record of AI changes.
 *
 * Within one session (typically one user request, possibly spanning many
 * agent tool calls) changes are recomputed as `diff(baseline, current)`, so
 * repeated edits of one block merge and reject restores the pre-session
 * content. A user operation seals the baseline; one inside a changed block
 * also accepts that change. A new session accepts all previous changes.
 */
export class AIChangeLedger {
  changes: AIChange[] = [];
  private baseline: Value | undefined;
  private session: string | undefined;
  private muted = 0;
  private version = 0;
  private readonly listeners = new Set<() => void>();
  /** Node identity cache for diffs using this ledger's `ignoreProps`. */
  readonly keyCache = new WeakMap<object, string>();
  readonly ignoreProps: readonly string[];
  private readonly editor: SlateEditor;
  private readonly isIgnored: (key: string) => boolean;

  constructor(editor: SlateEditor, ignoreProps: readonly string[] = []) {
    this.editor = editor;
    this.ignoreProps = ignoreProps;
    this.isIgnored = createIgnoredProp(ignoreProps);
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getVersion = () => this.version;

  get isMuted() {
    return this.muted > 0;
  }

  /** Run AI-authored operations that must not count as user edits. */
  mute<T>(fn: () => T): T {
    this.muted++;
    try {
      return fn();
    } finally {
      this.muted--;
    }
  }

  private notify() {
    this.version++;
    for (const listener of this.listeners) listener();
  }

  get(id: string) {
    return this.changes.find((change) => change.id === id);
  }

  /**
   * Record a committed AI edit. `before` is the live value right before the
   * commit. `pending` hides changes until playback reveals them.
   */
  record(before: Value, options: { pending?: boolean; session?: string } = {}) {
    if (!options.session || options.session !== this.session) {
      this.clear();
      this.session = options.session;
    }
    if (!this.baseline) this.baseline = before;
    this.recompute(options.pending ?? false);
  }

  private recompute(pending = false) {
    const baseline = this.baseline;
    if (!baseline) return;
    const editor = this.editor;
    const current = editor.children;
    const groups = diffAIEdit(baseline, current, {
      isIgnoredProp: this.isIgnored,
      isInline: (node) =>
        ElementApi.isElement(node) && editor.api.isInline(node),
      keyCache: this.keyCache,
    });
    const previous = new Map<object, AIChange>();
    for (const change of this.changes)
      if (change.base && change.tokens[0])
        previous.set(change.tokens[0], change);
    const kept = this.changes.filter((change) => !change.base);
    const next: AIChange[] = [];

    for (const group of groups) {
      const beforeParent = group.ancestors.at(-1)?.[0] ?? [];
      const afterParent = group.ancestors.at(-1)?.[1] ?? [];
      const removed = (nodeAt(baseline, beforeParent)?.children ?? []).slice(
        group.beforeIndex,
        group.beforeIndex + group.removeCount
      ) as Descendant[];
      const siblings = nodeAt(current, afterParent)?.children ?? [];
      const nodes = siblings.slice(
        group.afterIndex,
        group.afterIndex + group.insertCount
      );
      const refs = nodes.map((_, offset) =>
        editor.api.pathRef([...afterParent, group.afterIndex + offset])
      );
      let anchor: AIChange['anchor'];
      if (!refs.length) {
        if (siblings[group.afterIndex])
          anchor = {
            after: false,
            ref: editor.api.pathRef([...afterParent, group.afterIndex]),
          };
        else if (group.afterIndex > 0)
          anchor = {
            after: true,
            ref: editor.api.pathRef([...afterParent, group.afterIndex - 1]),
          };
      }
      const tokens: object[] = nodes.length ? nodes : removed;
      const prior = previous.get(tokens[0]);
      const same =
        prior?.kind === group.kind &&
        prior.tokens.length === tokens.length &&
        prior.tokens.every((token, index) => token === tokens[index]);
      next.push({
        id: same ? prior.id : `ai-change-${++sequence}`,
        kind: group.kind,
        status: same ? prior.status : 'new',
        pending: same ? prior.pending : pending,
        refs,
        anchor,
        removed,
        text: group.text,
        base: {
          parent: beforeParent,
          index: group.beforeIndex,
          count: group.removeCount,
        },
        tokens,
      });
    }

    const paths = (change: AIChange) =>
      [...change.refs, change.anchor?.ref].flatMap((ref) =>
        ref?.current ? [ref.current] : []
      );
    const fresh = next.flatMap(paths);
    const survivors = kept.filter((change) => {
      const overlaps = paths(change).some((path) =>
        fresh.some((other) => covers(path, other) || covers(other, path))
      );
      if (overlaps) release(change);
      return !overlaps;
    });
    for (const change of this.changes) if (change.base) release(change);
    this.changes = [...survivors, ...next].sort((a, b) =>
      PathApi.compare(paths(a)[0] ?? [], paths(b)[0] ?? [])
    );
    this.notify();
  }

  /** Called before every non-AI operation. */
  onUserOperation(operation: Operation) {
    if (operation.type === 'set_selection') return;
    if (this.baseline) {
      // User content can't be expressed against the baseline any more; keep
      // current changes as standalone, revertible records.
      this.baseline = undefined;
      for (const change of this.changes) change.base = undefined;
    }
    if (!TOUCHING.has(operation.type) || !this.changes.length) return;
    const touched = this.changes.filter((change) => touches(operation, change));
    if (touched.length) this.drop(touched);
  }

  /** Called after every operation; forgets changes whose content is gone. */
  prune() {
    const gone = this.changes.filter((change) =>
      change.refs.length
        ? change.refs.every((ref) => !ref.current)
        : !change.anchor?.ref.current
    );
    if (gone.length) this.drop(gone);
  }

  private drop(changes: AIChange[]) {
    for (const change of changes) release(change);
    this.changes = this.changes.filter((change) => !changes.includes(change));
    this.notify();
  }

  /** Reveal pending changes at or around `paths`; all when omitted. */
  reveal(paths?: Path[]) {
    let changed = false;
    for (const change of this.changes) {
      if (!change.pending) continue;
      const own = [...change.refs, change.anchor?.ref].flatMap((ref) =>
        ref?.current ? [ref.current] : []
      );
      if (
        !paths ||
        own.some((path) =>
          paths.some((other) => covers(path, other) || covers(other, path))
        )
      ) {
        change.pending = false;
        changed = true;
      }
    }
    if (changed) this.notify();
  }

  markSeen(id: string) {
    const change = this.get(id);
    if (!change || change.status === 'seen') return;
    change.status = 'seen';
    this.notify();
  }

  /** Keep a change: it stops being highlighted or revertible. */
  accept(id: string) {
    const change = this.get(id);
    if (!change) return;
    if (this.baseline && change.base) {
      const nodes = change.refs.flatMap((ref) =>
        ref.current ? [NodeApi.get(this.editor, ref.current) as Descendant] : []
      );
      this.baseline = splice(
        this.baseline,
        change.base.parent,
        change.base.index,
        change.base.count,
        nodes
      ) as Value;
      this.recompute();
      return;
    }
    this.drop([change]);
  }

  /** Restore the original content of a change as one undoable step. */
  reject(id: string) {
    const change = this.get(id);
    if (!change) return;
    this.mute(() =>
      this.editor.tf.withNewBatch(() =>
        this.editor.tf.withoutNormalizing(() => this.revert(change))
      )
    );
    if (this.baseline) this.recompute();
    else this.drop([change]);
  }

  acceptAll() {
    this.clear();
    this.notify();
  }

  rejectAll() {
    const changes = this.changes.toReversed();
    this.mute(() =>
      this.editor.tf.withNewBatch(() =>
        this.editor.tf.withoutNormalizing(() => {
          for (const change of changes) this.revert(change);
        })
      )
    );
    this.clear();
    this.notify();
  }

  private clear() {
    for (const change of this.changes) release(change);
    this.changes = [];
    this.baseline = undefined;
  }

  private revert(change: AIChange) {
    const editor = this.editor;
    if (change.kind === 'text' || change.kind === 'props') {
      const path = change.refs[0]?.current;
      if (!path) return;
      const node = NodeApi.get(editor, path) as Tree;
      const original = change.removed[0] as Tree;
      setOwnProps(editor, path, node, original, this.isIgnored);
      if (change.kind === 'text')
        replaceChildren(
          editor,
          path,
          node.children ?? [],
          original.children ?? []
        );
      return;
    }
    const paths = change.refs.flatMap((ref) =>
      ref.current ? [ref.current] : []
    );
    let at = paths[0];
    if (!at && change.anchor?.ref.current)
      at = change.anchor.after
        ? PathApi.next(change.anchor.ref.current)
        : change.anchor.ref.current;
    if (!at) return;
    const parent = PathApi.parent(at);
    const siblings = paths.filter((path) =>
      PathApi.equals(PathApi.parent(path), parent)
    );
    replaceSiblings(
      editor,
      parent,
      at.at(-1)!,
      siblings.map((path) => NodeApi.get(editor, path) as Descendant),
      change.removed,
      { inheritIds: false }
    );
  }
}

function release(change: AIChange) {
  for (const ref of change.refs) ref.unref();
  change.anchor?.ref.unref();
}

function touches(operation: Operation, change: AIChange): boolean {
  if (!('path' in operation)) return false;
  const path = operation.path as Path;
  const targets = [path];
  if (operation.type === 'move_node') targets.push(operation.newPath);
  // Merging node `i` into `i - 1` edits node `i - 1` too.
  const previous = operation.type === 'merge_node' && PathApi.previous(path);
  if (previous) targets.push(previous);
  for (const ref of change.refs) {
    const own = ref.current;
    if (own && targets.some((target) => covers(own, target))) return true;
  }
  const anchor = change.anchor?.ref.current;
  if (!anchor || change.refs.length || path.length !== anchor.length)
    return false;
  const gap = anchor.at(-1)! + (change.anchor!.after ? 1 : 0);
  return (
    PathApi.equals(PathApi.parent(path), PathApi.parent(anchor)) &&
    path.at(-1) === gap
  );
}

function splice(
  root: Descendant[],
  parent: Path,
  index: number,
  count: number,
  nodes: Descendant[]
): Descendant[] {
  if (!parent.length) return root.toSpliced(index, count, ...nodes);
  const [head, ...rest] = parent;
  const container = root[head] as Tree;
  return root.with(head, {
    ...container,
    children: splice(
      container.children as Descendant[],
      rest,
      index,
      count,
      nodes
    ),
  } as Descendant);
}

const ledgers = new WeakMap<SlateEditor, AIChangeLedger>();

/** The editor's change ledger, created on first use. */
export function getAIChangeLedger(
  editor: SlateEditor,
  ignoreProps?: readonly string[]
): AIChangeLedger {
  let ledger = ledgers.get(editor);
  if (!ledger) {
    ledger = new AIChangeLedger(editor, ignoreProps);
    ledgers.set(editor, ledger);
  }
  return ledger;
}

/** Existing ledger without creating one. */
export const peekAIChangeLedger = (editor: SlateEditor) => ledgers.get(editor);
