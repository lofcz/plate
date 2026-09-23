import type {
  Descendant,
  Operation,
  Path,
  PathRef,
  SlateEditor,
  Value,
} from 'platejs';

import { ElementApi, NodeApi, PathApi } from 'platejs';

import { type AIEditGroupKind, diffAIEdit } from './diffAIEdit';
import { createIgnoredProp } from './planAIEdit';

/**
 * - `new`: highlighted until acknowledged.
 * - `seen`: acknowledged; fading out, then forgotten.
 */
export type AIChangeStatus = 'new' | 'seen';

/** One AI-authored change, relative to the session baseline. */
export interface AIChange {
  id: string;
  kind: AIEditGroupKind;
  status: AIChangeStatus;
  /** Hidden while edit playback has not reached it yet. */
  pending: boolean;
  /** Resulting nodes, in order. */
  refs: PathRef[];
  /** Baseline location, while the session baseline is live. */
  base?: { parent: Path; index: number; count: number };
  /** Node identities when last computed; unchanged tokens carry status over. */
  tokens: object[];
}

/** How long an acknowledged change fades before it is forgotten. */
export const AI_CHANGE_FADE = 1200;

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

const pathsOf = (change: AIChange) =>
  change.refs.flatMap((ref) => (ref.current ? [ref.current] : []));

/**
 * Per-editor record of content the AI wrote, highlighted until the user
 * acknowledges it.
 *
 * Within one session (typically one user request, possibly spanning many
 * agent tool calls) changes are recomputed as `diff(baseline, current)`, so
 * repeated edits of one block merge. Acknowledged changes fold into the
 * baseline and never reappear unless the AI edits them again. A user
 * operation seals the baseline; one inside a changed block also settles that
 * change. A new session settles all previous changes.
 */
export class AIChangeLedger {
  changes: AIChange[] = [];
  private baseline: Value | undefined;
  private session: string | undefined;
  private muted = 0;
  private version = 0;
  private readonly fades = new Map<string, ReturnType<typeof setTimeout>>();
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
      // Removals have nothing left to highlight; playback shows them leaving.
      if (!group.insertCount) continue;
      const beforeParent = group.ancestors.at(-1)?.[0] ?? [];
      const afterParent = group.ancestors.at(-1)?.[1] ?? [];
      const tokens: object[] = (
        nodeAt(current, afterParent)?.children ?? []
      ).slice(group.afterIndex, group.afterIndex + group.insertCount);
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
        refs: tokens.map((_, offset) =>
          editor.api.pathRef([...afterParent, group.afterIndex + offset])
        ),
        base: {
          parent: beforeParent,
          index: group.beforeIndex,
          count: group.removeCount,
        },
        tokens,
      });
    }

    const fresh = next.flatMap(pathsOf);
    const survivors = kept.filter((change) => {
      const overlaps = pathsOf(change).some((path) =>
        fresh.some((other) => covers(path, other) || covers(other, path))
      );
      if (overlaps) this.release(change);
      return !overlaps;
    });
    const ids = new Set(next.map((change) => change.id));
    for (const change of this.changes)
      if (change.base) {
        for (const ref of change.refs) ref.unref();
        if (!ids.has(change.id)) this.stopFade(change.id);
      }
    this.changes = [...survivors, ...next].sort((a, b) =>
      PathApi.compare(pathsOf(a)[0] ?? [], pathsOf(b)[0] ?? [])
    );
    this.notify();
  }

  /** Called before every non-AI operation. */
  onUserOperation(operation: Operation) {
    if (operation.type === 'set_selection') return;
    if (this.baseline) {
      // User content can't be expressed against the baseline any more; keep
      // current changes as standalone records.
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
      change.refs.every((ref) => !ref.current)
    );
    if (gone.length) this.drop(gone);
  }

  private drop(changes: AIChange[]) {
    for (const change of changes) this.release(change);
    this.changes = this.changes.filter((change) => !changes.includes(change));
    this.notify();
  }

  /** Reveal pending changes at or around `paths`; all when omitted. */
  reveal(paths?: Path[]) {
    let changed = false;
    for (const change of this.changes) {
      if (!change.pending) continue;
      if (
        !paths ||
        pathsOf(change).some((path) =>
          paths.some((other) => covers(path, other) || covers(other, path))
        )
      ) {
        change.pending = false;
        changed = true;
      }
    }
    if (changed) this.notify();
  }

  /** Fade a change out, then forget it. */
  acknowledge(id: string) {
    const change = this.get(id);
    if (!change || change.status === 'seen') return;
    change.status = 'seen';
    this.fades.set(
      id,
      setTimeout(() => {
        this.fades.delete(id);
        this.settle(id);
      }, AI_CHANGE_FADE)
    );
    this.notify();
  }

  /** Forget a change immediately, keeping its content. */
  settle(id: string) {
    const change = this.get(id);
    if (!change) return;
    this.stopFade(id);
    if (this.baseline && change.base) {
      const nodes = pathsOf(change).map(
        (path) => NodeApi.get(this.editor, path) as Descendant
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

  /** Forget every change, keeping content. */
  settleAll() {
    this.clear();
    this.notify();
  }

  private clear() {
    for (const change of this.changes) this.release(change);
    this.changes = [];
    this.baseline = undefined;
  }

  private release(change: AIChange) {
    for (const ref of change.refs) ref.unref();
    this.stopFade(change.id);
  }

  private stopFade(id: string) {
    clearTimeout(this.fades.get(id));
    this.fades.delete(id);
  }
}

function touches(operation: Operation, change: AIChange): boolean {
  if (!('path' in operation)) return false;
  const path = operation.path as Path;
  const targets = [path];
  if (operation.type === 'move_node') targets.push(operation.newPath);
  // Merging node `i` into `i - 1` edits node `i - 1` too.
  const previous = operation.type === 'merge_node' && PathApi.previous(path);
  if (previous) targets.push(previous);
  return pathsOf(change).some((own) =>
    targets.some((target) => covers(own, target))
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
