/**
 * Post-processing transform that turns the engine's per-pair diff output into
 * a "git-diff style" presentation. Two orthogonal switches, both off by
 * default to preserve the engine's stable per-pair contract for downstream
 * consumers that depend on it (e.g. the suggestion plugin's accept/reject
 * pair grouping):
 *
 *   - `groupConsecutiveChanges`: reorder each contiguous run of change
 *     blocks (bounded by unchanged blocks) so all of one side comes first,
 *     then the other. Mirrors `git diff` unified output. The leading side
 *     is taken from the first op in the run, so `pairOrder` is honoured.
 *
 *   - `runScopeWordHints`: replace the per-pair leaf-level word hints with
 *     ones computed across the WHOLE run. Concatenate every delete block's
 *     content into one logical "old body" and every insert block's content
 *     into one logical "new body", run a single word-level diff between
 *     those two bodies, then re-emit each block's children from the
 *     resulting ops. Words common to old & new survive as unchanged on
 *     both sides regardless of which block they originated in.
 *
 * The two switches are independent. `groupConsecutiveChanges` is purely
 * layout. `runScopeWordHints` only meaningfully fires on runs that contain
 * BOTH inserts AND deletes (otherwise there's nothing to compare); pure-
 * insert / pure-delete runs are passed through verbatim.
 *
 * Recursion: the transform walks down through UNCHANGED element wrappers
 * (e.g. `<lesson_phase>` > `<lesson_activity>` > diff'd paragraphs) so
 * nested document structures get the same treatment at each level. It does
 * NOT recurse into nodes that themselves carry a `diffOperation` — their
 * children are inline tokens, not sibling blocks.
 *
 * Performance:
 *   - One pass over each level to identify runs (O(n)).
 *   - Per run with both sides AND `runScopeWordHints`: one DMP word diff
 *     over the concatenated content. DMP's `Diff_Timeout` (0.2 s in
 *     `dmp.ts`) caps worst-case quadratic behaviour on pathological input.
 *   - Per run with only one side, or `runScopeWordHints` disabled: no DMP
 *     work, just the reorder pass.
 *   - The leaf rebuild walks each block's tokens once and merges adjacent
 *     leaves with identical props, so the resulting trees stay flat.
 */

import {
  type Descendant,
  type TElement,
  type TText,
  ElementApi,
  TextApi,
} from 'platejs';

import type {
  ComputeDiffOptions,
  DiffPropsContext,
} from '../../lib/computeDiff';

import {
  type Token,
  type TokenOp,
  diffTokens,
  mergeAdjacentLeaves,
  tokenize,
} from './pairBlocksWithWordHints';

const DEFAULT_WORD_BOUNDARY = /(\s+)/u;

type DiffRole = 'insert' | 'delete' | 'update';

/**
 * Resolve the diff role of a node, supporting BOTH marker styles the engine
 * emits depending on the caller's `getInsertProps` / `getDeleteProps`:
 *
 *   - Default markers (used when callers rely on `defaultGetInsertProps` /
 *     `defaultGetDeleteProps`): `diffOperation: { type: 'insert' | 'delete'
 *     | 'update' }`.
 *
 *   - Suggestion-plugin markers (used when `@platejs/suggestion`'s
 *     `diffToSuggestions` is the consumer): the user props REPLACE
 *     `diffOperation` with `suggestion: { id, type: 'insert' | 'remove' |
 *     'update' }`. Note the `'remove'` ↔ `'delete'` rename.
 *
 * Without this dual-recognition, every consumer of suggestion props lost
 * `groupConsecutiveChanges` / `runScopeWordHints` silently — `findRuns`
 * would see no `diffOperation` markers and skip the whole transform.
 */
const getDiffRole = (node: Descendant): DiffRole | null => {
  const op = (node as { diffOperation?: { type?: string } }).diffOperation;
  if (op && typeof op === 'object') {
    if (op.type === 'insert') return 'insert';
    if (op.type === 'delete') return 'delete';
    if (op.type === 'update') return 'update';
  }
  const sug = (node as { suggestion?: { type?: string } | boolean }).suggestion;
  if (sug && typeof sug === 'object') {
    if (sug.type === 'insert') return 'insert';
    if (sug.type === 'remove') return 'delete';
    if (sug.type === 'update') return 'update';
  }
  return null;
};

/**
 * Resolve the `pairId` of a paired block, supporting both marker styles
 * (see `getDiffRole`).
 *   - Default props: top-level `pairId` property.
 *   - Suggestion props: id lives in `suggestion.id`.
 */
const getPairId = (node: Descendant): string | undefined => {
  const direct = (node as { pairId?: string }).pairId;
  if (typeof direct === 'string') return direct;
  const sug = (node as { suggestion?: { id?: string } }).suggestion;
  if (sug && typeof sug === 'object' && typeof sug.id === 'string') {
    return sug.id;
  }
  return;
};

export type RunScopeTransformOptions = {
  /**
   * Reorder contiguous runs of change blocks so all of one side appears
   * before the other (git-diff layout). Default false: preserves the
   * engine's per-pair interleaved output.
   */
  groupConsecutiveChanges?: boolean;
  /**
   * Re-compute leaf-level word marks at run scope instead of per pair.
   * Default false: keeps the engine's per-pair word hints intact.
   */
  runScopeWordHints?: boolean;
};

export function groupRunsAndRehintWords(
  nodes: Descendant[],
  options: ComputeDiffOptions & RunScopeTransformOptions
): Descendant[] {
  if (!options.groupConsecutiveChanges && !options.runScopeWordHints) {
    return nodes;
  }
  return transformLevel(nodes, options);
}

/**
 * Apply the transform at one nesting level: first depth-first recurse into
 * unchanged container wrappers (so deeper runs are settled before we look
 * at this level's runs), then identify and transform runs at this level.
 */
const transformLevel = (
  nodes: Descendant[],
  options: ComputeDiffOptions & RunScopeTransformOptions
): Descendant[] => {
  // Depth-first into unchanged container wrappers. The recursion gate is
  // "is this an unchanged element whose children are themselves a list of
  // block elements?" — that skips paragraph leaves (children are text /
  // inline) and skips self-changed nodes (children are inline tokens).
  const recursed = nodes.map((n) => recurseIntoUnchangedContainer(n, options));

  // Identify runs of consecutive change blocks at this level.
  const runs = findRuns(recursed);
  if (runs.length === 0) return recursed;

  // Walk from end to start so splices don't invalidate earlier indices.
  const result = recursed.slice();
  for (let i = runs.length - 1; i >= 0; i--) {
    const run = runs[i];
    const transformed = transformRun(run.nodes, options);
    result.splice(run.start, run.length, ...transformed);
  }
  return result;
};

const recurseIntoUnchangedContainer = (
  node: Descendant,
  options: ComputeDiffOptions & RunScopeTransformOptions
): Descendant => {
  if (!ElementApi.isElement(node)) return node;
  // Self-changed: children are inline tokens / leaves carrying word marks.
  // Reordering them would scramble within-paragraph inline diffs.
  if (getDiffRole(node) !== null) return node;
  const children = (node as TElement).children;
  if (!isBlockList(children, options)) return node;
  const newChildren = transformLevel(children, options);
  return { ...(node as TElement), children: newChildren } as Descendant;
};

/**
 * True when every child is a block element (i.e. NOT text, NOT inline).
 * That's the marker for "this is a list of sibling blocks", which is the
 * only shape we descend into.
 */
const isBlockList = (
  children: Descendant[],
  options: ComputeDiffOptions
): boolean => {
  if (children.length === 0) return false;
  const isInline = options.isInline;
  return children.every((c) => ElementApi.isElement(c) && !isInline(c));
};

type Run = { start: number; length: number; nodes: Descendant[] };

const findRuns = (nodes: Descendant[]): Run[] => {
  const runs: Run[] = [];
  let runStart = -1;
  let runNodes: Descendant[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (getDiffRole(nodes[i]) !== null) {
      if (runStart === -1) runStart = i;
      runNodes.push(nodes[i]);
    } else if (runStart !== -1) {
      runs.push({ start: runStart, length: runNodes.length, nodes: runNodes });
      runStart = -1;
      runNodes = [];
    }
  }
  if (runStart !== -1) {
    runs.push({ start: runStart, length: runNodes.length, nodes: runNodes });
  }
  return runs;
};

/**
 * Apply rehinting (optional) and grouping (optional) to a single run.
 * Returns the transformed run's nodes in their new order.
 */
const transformRun = (
  runNodes: Descendant[],
  options: ComputeDiffOptions & RunScopeTransformOptions
): Descendant[] => {
  // Partition by op type. We keep `updates` as a separate bucket because
  // they're rare at block-granularity but the engine can emit them and
  // dropping them would silently lose data.
  const inserts: Descendant[] = [];
  const deletes: Descendant[] = [];
  const updates: Descendant[] = [];
  for (const n of runNodes) {
    const t = getDiffRole(n);
    if (t === 'insert') inserts.push(n);
    else if (t === 'delete') deletes.push(n);
    else if (t === 'update') updates.push(n);
  }

  let rehintedInserts = inserts;
  let rehintedDeletes = deletes;

  // Run-scope word rehinting fires only when:
  //   - the switch is on,
  //   - the run has BOTH sides (no comparison otherwise),
  //   - and every block in the run is prose-shaped (leafy children). For
  //     anything containing nested blocks (lists, code blocks with
  //     code_line children, tables) we leave the engine's per-pair marks
  //     alone — that's the conservative path the user picked.
  if (
    options.runScopeWordHints &&
    inserts.length > 0 &&
    deletes.length > 0 &&
    allProseShape([...inserts, ...deletes], options)
  ) {
    const rehinted = rehintRunAtWordScope(inserts, deletes, options);
    rehintedInserts = rehinted.inserts;
    rehintedDeletes = rehinted.deletes;
  }

  if (options.groupConsecutiveChanges) {
    // Leading side comes from the first op in the original run so the
    // caller's `pairOrder` is honoured. Updates sit in the middle —
    // they're neither pure insert nor pure delete and we don't want them
    // colliding with either side's block.
    const firstType = getDiffRole(runNodes[0]);
    if (firstType === 'insert') {
      return [...rehintedInserts, ...updates, ...rehintedDeletes];
    }
    return [...rehintedDeletes, ...updates, ...rehintedInserts];
  }

  // No grouping: preserve original order but with rehinted children.
  const insMap = new Map<Descendant, Descendant>();
  for (let i = 0; i < inserts.length; i++) {
    insMap.set(inserts[i], rehintedInserts[i]);
  }
  const delMap = new Map<Descendant, Descendant>();
  for (let i = 0; i < deletes.length; i++) {
    delMap.set(deletes[i], rehintedDeletes[i]);
  }
  return runNodes.map((n) => insMap.get(n) ?? delMap.get(n) ?? n);
};

const allProseShape = (
  blocks: Descendant[],
  options: ComputeDiffOptions
): boolean => {
  const isInline = options.isInline;
  return blocks.every((b) => {
    if (!ElementApi.isElement(b)) return false;
    const children = (b as TElement).children;
    if (children.length === 0) return false;
    return children.every(
      (c) => TextApi.isText(c) || (ElementApi.isElement(c) && isInline(c))
    );
  });
};

// ---------------------------------------------------------------------------
// Run-scope word rehinting
//
// The idea: glue every delete block's content into one "old stream" and
// every insert block's content into one "new stream", word-diff those two
// streams once, and route each emitted token back to the block it came
// from. The block-level `pairId` (and any other engine-set props) survive
// verbatim; only the LEAF-level marks change.
// ---------------------------------------------------------------------------

type RunRehintResult = {
  inserts: Descendant[];
  deletes: Descendant[];
};

const rehintRunAtWordScope = (
  inserts: Descendant[],
  deletes: Descendant[],
  options: ComputeDiffOptions
): RunRehintResult => {
  const wordBoundary = options.wordBoundary ?? DEFAULT_WORD_BOUNDARY;

  // Strip pre-existing leaf-level diff marks before tokenizing — those
  // were set per-pair by `pairBlocksWithWordHints` and would otherwise
  // get baked into token signatures, polluting our diff input.
  const cleanedInserts = inserts.map(stripLeafDiffMarks);
  const cleanedDeletes = deletes.map(stripLeafDiffMarks);

  const newStream = tokenizeBlocks(cleanedInserts as TElement[], wordBoundary);
  const oldStream = tokenizeBlocks(cleanedDeletes as TElement[], wordBoundary);

  const ops = diffTokens(oldStream.tokens, newStream.tokens);

  const rehintedInserts = emitPerBlockChildren({
    blocks: cleanedInserts as TElement[],
    stream: newStream,
    ops,
    side: 'insert',
    options,
  });
  const rehintedDeletes = emitPerBlockChildren({
    blocks: cleanedDeletes as TElement[],
    stream: oldStream,
    ops,
    side: 'delete',
    options,
  });

  return { inserts: rehintedInserts, deletes: rehintedDeletes };
};

/**
 * Remove the leaf-level diff marks the per-pair pass attached to each
 * text leaf. The block-level marks (`diffOperation`, `pairId`, `diff` on
 * the parent block) are kept — those describe THIS BLOCK's role in the
 * run and survive the rehint. We only blow away the inner per-pair word
 * hints, which are about to be replaced by run-scope ones.
 */
const stripLeafDiffMarks = (node: Descendant): Descendant => {
  if (!ElementApi.isElement(node)) return node;
  const el = node as TElement;
  const cleanedChildren = el.children.map(cleanLeaf);
  return { ...el, children: cleanedChildren } as Descendant;
};

/**
 * Drop both the default-engine leaf marks (`diff`, `diffOperation`,
 * `pairId`) AND any suggestion-plugin leaf marks (`suggestion`, every
 * `suggestion_<id>` data key, `suggestionTransient`). The rehint about to
 * run will re-emit fresh per-token props for the chosen side; keeping
 * stale marks here would either bake them into the token signature
 * (polluting the diff input) or leave dead keys on the rebuilt leaf.
 */
const cleanLeaf = (child: Descendant): Descendant => {
  const source = child as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    if (key === 'diff') continue;
    if (key === 'diffOperation') continue;
    if (key === 'pairId') continue;
    if (key === 'suggestion') continue;
    if (key === 'suggestionTransient') continue;
    if (key.startsWith('suggestion_')) continue;
    out[key] = source[key];
  }
  return out as Descendant;
};

type Stream = { tokens: Token[]; blockIndices: number[] };

const tokenizeBlocks = (blocks: TElement[], wordBoundary: RegExp): Stream => {
  const tokens: Token[] = [];
  const blockIndices: number[] = [];
  for (let bi = 0; bi < blocks.length; bi++) {
    const blockTokens = tokenize(blocks[bi].children, wordBoundary);
    for (const t of blockTokens) {
      tokens.push(t);
      blockIndices.push(bi);
    }
  }
  return { tokens, blockIndices };
};

type EmitArgs = {
  blocks: TElement[];
  stream: Stream;
  ops: TokenOp[];
  side: 'insert' | 'delete';
  options: ComputeDiffOptions;
};

/**
 * Walk the diff ops in document order for `side`. Each op that touches a
 * token on this side (unchanged or this-side-only) is appended to that
 * token's source block's bucket. After the walk, each block's bucket is
 * `mergeAdjacentLeaves`d and slotted back into a fresh block node.
 *
 * The per-token mark is taken from the block-level `pairId` so that
 * suggestion-plugin-style consumers can still correlate the leaf marks
 * with their parent block (e.g. for atomic accept/reject).
 */
const emitPerBlockChildren = ({
  blocks,
  stream,
  ops,
  side,
  options,
}: EmitArgs): Descendant[] => {
  const buckets: Descendant[][] = blocks.map(() => []);
  const sideKey: 'oldIdx' | 'newIdx' = side === 'delete' ? 'oldIdx' : 'newIdx';
  const sideOp: -1 | 1 = side === 'delete' ? -1 : 1;
  const getProps =
    side === 'delete' ? options.getDeleteProps : options.getInsertProps;

  const { tokens, blockIndices } = stream;

  for (const op of ops) {
    if (op.op !== 0 && op.op !== sideOp) continue;
    const idx = op[sideKey];
    if (idx === undefined) continue;
    const token = tokens[idx];
    const blockIdx = blockIndices[idx];
    const bucket = buckets[blockIdx];
    // `pairId` may live in either of two places depending on the caller's
    // prop transforms — see `getPairId` for the dual-source resolution.
    const pairId = getPairId(blocks[blockIdx]);
    const ctx: DiffPropsContext | undefined = pairId ? { pairId } : undefined;

    if (token.inline) {
      if (op.op === sideOp) {
        bucket.push({
          ...(token.inline as object),
          ...getProps(token.inline, ctx),
        } as Descendant);
      } else {
        bucket.push(token.inline);
      }
      continue;
    }

    const baseLeaf: TText = {
      text: token.text,
      ...(token.props as object),
    };

    if (op.op === sideOp) {
      bucket.push({ ...baseLeaf, ...getProps(baseLeaf, ctx) });
    } else {
      bucket.push(baseLeaf);
    }
  }

  return blocks.map((b, i) => {
    const merged = mergeAdjacentLeaves(buckets[i]);
    // Slate invariant: every element must have at least one child. A
    // block whose old/new tokens are entirely on the OTHER side (rare
    // but possible — e.g. an "insert" block whose text fully matched
    // some delete block, leaving nothing for the insert side to emit)
    // gets an empty text leaf so we don't crash.
    return {
      ...b,
      children: merged.length > 0 ? merged : [{ text: '' }],
    } as Descendant;
  });
};
