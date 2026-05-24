/**
 * This Apache-2.0 licensed file has been modified by Udecode and other
 * contributors. See /packages/diff/LICENSE for more information.
 */

import type { Descendant, EditorApi, TElement } from 'platejs';

import type { DiffProps } from './types';

import { groupRunsAndRehintWords } from '../internal/transforms/groupRunsAndRehintWords';
import { transformDiffDescendants } from '../internal/transforms/transformDiffDescendants';
import { dmp } from '../internal/utils/dmp';
import { StringCharMapping } from '../internal/utils/string-char-mapping';

/**
 * Context passed to `getInsertProps` / `getDeleteProps` so the caller can
 * decorate paired blocks with a shared id. Block-granularity mode generates
 * one `pairId` per matched (delete-block, insert-block) tuple and passes it
 * here; downstream consumers (e.g. the suggestion plugin) can use the
 * `pairId` as the `suggestion.id` so accept / reject treats both halves as a
 * single change.
 */
export type DiffPropsContext = {
  pairId?: string;
};

/**
 * Declarative per-element diff behaviour. Lets a plugin author tell the
 * diff engine exactly how its element type should compose into a diff,
 * instead of relying on the engine's structural heuristics. Strategies
 * compose bottom-up: each pair of elements consults its own strategy, and
 * a `container` strategy recursively pair-diffs its children — each of
 * which then consults THEIR own strategy.
 *
 * Returned by `ComputeDiffOptions.getDiffStrategy` per node.
 *
 * - `container`: the element is a transparent wrapper. Its identity is
 *   defined by the `identityProps` listed (or, if omitted, by every own
 *   property except `children` and `options.ignoreProps`). When both
 *   halves of a pair share identity, the wrapper passes through
 *   UNCHANGED (no diff op, no pairId) and the engine recurses into its
 *   children. When identity differs, falls back to whole-block.
 * - `prose`: the element's children are tokenisable as text/inline.
 *   Use word-hint diffing (DMP at token granularity). Both halves carry
 *   a shared `pairId`; only the actually-changed words inside get marks.
 * - `atomic`: never recurse, never word-hint. Always emit whole-block
 *   delete + insert with a shared `pairId`. Use this for voids, embeds,
 *   or anything whose internal structure is meaningful only as a whole.
 */
export type DiffStrategy =
  | { kind: 'container'; identityProps?: string[] }
  | { kind: 'prose' }
  | { kind: 'atomic' };

export type GetDiffStrategy = (node: TElement) => DiffStrategy | undefined;

export type ComputeDiffOptions = {
  isInline: EditorApi['isInline'];
  getDeleteProps: (node: Descendant, context?: DiffPropsContext) => any;
  getInsertProps: (node: Descendant, context?: DiffPropsContext) => any;
  getUpdateProps: (
    node: Descendant,
    properties: any,
    newProperties: any
  ) => any;
  ignoreProps?: string[];
  lineBreakChar?: string;
  elementsAreRelated?: (
    element: TElement,
    nextElement: TElement
  ) => boolean | null;
  /**
   * Diff granularity at the top level.
   * - `'inline'` (default): existing behavior — paired delete/insert pairs are
   *   merged into a single block whenever possible via `transformDiffNodes` /
   *   `transformDiffTexts`, producing inline character-level diffs.
   * - `'block'`: each top-level descendant is the atomic diff unit. A
   *   delete/insert pair emits the inserted blocks AND the deleted blocks
   *   separately. Paired blocks may carry a secondary word-level highlight
   *   inside (see `pairBlocksWithWordHints`).
   */
  granularity?: 'inline' | 'block';
  /**
   * Order in which paired delete/insert top-level blocks are flushed.
   * - `'delete-first'` (default): deleted blocks above inserted blocks
   *   (matches `git diff` unified output).
   * - `'insert-first'`: inserted blocks above deleted blocks (lets the user
   *   read the new content first; matches an "above the line" presentation).
   */
  pairOrder?: 'delete-first' | 'insert-first';
  /**
   * Token boundary used by `pairBlocksWithWordHints` to snap character-level
   * DMP diffs to word boundaries inside paired blocks. The regex is used with
   * `split()` and MUST keep the separators in the resulting array (use a
   * capture group, e.g. `/(\s+)/`). Default is a Unicode-aware word boundary.
   */
  wordBoundary?: RegExp;
  /**
   * Used in `granularity: 'block'` mode to mint one shared id per matched
   * (delete-block, insert-block) pair. The id is forwarded to
   * `getInsertProps` / `getDeleteProps` via the `DiffPropsContext` so the
   * caller (typically the suggestion plugin) can flag both halves with the
   * same `suggestion.id`. Defaults to a per-run counter — callers that need
   * globally-unique ids should pass a nanoid-based generator.
   */
  generatePairId?: () => string;
  /**
   * Per-element diff strategy resolver. When provided (and the element is
   * encountered as one half of a paired diff in `granularity: 'block'`
   * mode), the strategy takes precedence over the engine's structural
   * heuristics. Return `undefined` for elements you want the engine to
   * handle with its default heuristics.
   *
   * Strategy composition is bottom-up: a `container` strategy recursively
   * pair-diffs its children, and each child then consults `getDiffStrategy`
   * on its own. The caller typically maps `node.type` → `DiffStrategy` via
   * a static registry maintained alongside the plugin definitions.
   */
  getDiffStrategy?: GetDiffStrategy;
  /**
   * Presentation transform: reorder contiguous runs of change blocks so all
   * inserts (resp. deletes) are emitted together, matching `git diff`
   * unified output. The leading side comes from `pairOrder`, so the engine's
   * delete-first / insert-first contract is honoured.
   *
   * Default `false`: emit one interleaved pair at a time. The engine's
   * per-pair output stays untouched for consumers (e.g. the suggestion
   * plugin) that depend on adjacent pair halves.
   *
   * Block-level `pairId`s survive the reorder, so accept/reject grouping
   * downstream still works — only the visual order changes. Runs are
   * bounded by unchanged blocks; independent edits never merge.
   *
   * Only affects `granularity: 'block'`. Inline granularity has no run
   * concept.
   */
  groupConsecutiveChanges?: boolean;
  /**
   * Presentation transform: re-compute leaf-level word marks at run scope
   * instead of per pair. Each contiguous run of change blocks (bounded by
   * unchanged blocks) is treated as ONE old body vs ONE new body; a single
   * word-level diff is computed across the combined content; the resulting
   * marks are projected back onto each block's leaves. Words common to
   * old & new — even across block boundaries — survive as unchanged on
   * both sides.
   *
   * Default `false`: keep the engine's per-pair word hints. The per-pair
   * hints are correct for any single (delete, insert) pair viewed in
   * isolation, but become misleading once the surrounding presentation
   * groups multiple pairs into a single "before / after" block. Turn this
   * on when you also enable `groupConsecutiveChanges`, or when downstream
   * UI conceptually treats the run as a single change.
   *
   * Pure-insert and pure-delete runs are passed through verbatim (no
   * comparable other side). Runs containing nested-block content (lists,
   * tables, code blocks) are also passed through — those keep the engine's
   * per-pair marks because run-scope concatenation across nested blocks is
   * ill-defined.
   *
   * Only affects `granularity: 'block'`.
   */
  runScopeWordHints?: boolean;
};

export const computeDiff = (
  doc0: Descendant[],
  doc1: Descendant[],
  {
    elementsAreRelated,
    getDeleteProps = defaultGetDeleteProps,
    getInsertProps = defaultGetInsertProps,
    getUpdateProps = defaultGetUpdateProps,
    ignoreProps,
    isInline = () => false,
    ...options
  }: Partial<ComputeDiffOptions> = {}
): Descendant[] => {
  // Honour `ignoreProps` at the char-mapping layer too. Without this, two
  // nodes with identical content but different ignored props (e.g. fresh
  // `id`s from `deserializeMd` on every parse) get mapped to different
  // characters, which forces DMP to emit a delete+insert pair across the
  // whole region. The downstream `transformDiffDescendants` already passes
  // `ignoreProps` through to `isEqual` — this just makes the layers
  // consistent.
  const stringCharMapping = new StringCharMapping({ ignoreProps });

  const m0 = stringCharMapping.nodesToString(doc0);
  const m1 = stringCharMapping.nodesToString(doc1);

  const diff = dmp.diff_main(m0, m1);

  const transformOptions = {
    elementsAreRelated,
    getDeleteProps,
    getInsertProps,
    ignoreProps,
    isInline,
    stringCharMapping,
    getUpdateProps: (node: Descendant, properties: any, newProperties: any) => {
      // Ignore the update if only ignored props have changed
      if (
        ignoreProps &&
        Object.keys(newProperties).every((key) => ignoreProps.includes(key))
      )
        return {};

      return getUpdateProps(node, properties, newProperties);
    },
    ...options,
  };

  const descendants = transformDiffDescendants(diff, transformOptions);

  // Optional presentation pass. Both switches default off, preserving the
  // engine's stable per-pair contract for downstream consumers (suggestion
  // plugin, AI accept/reject UI). When either is set, the transform walks
  // the output, identifies change runs, and applies reorder / rehint as
  // requested. See `groupRunsAndRehintWords` for the contract.
  if (
    transformOptions.granularity === 'block' &&
    (transformOptions.groupConsecutiveChanges ||
      transformOptions.runScopeWordHints)
  ) {
    return groupRunsAndRehintWords(descendants, transformOptions);
  }

  return descendants;
};

export const defaultGetInsertProps = (
  _node: Descendant,
  ctx?: DiffPropsContext
): DiffProps & { pairId?: string } => ({
  diff: true,
  diffOperation: {
    type: 'insert',
  },
  // Forward the per-pair id when the engine supplies one (block-granularity
  // pairs). Consumers that don't care can ignore the key; consumers that
  // care (e.g. the suggestion plugin, the playground's pair-grouping stats)
  // already read `node.pairId`.
  ...(ctx?.pairId ? { pairId: ctx.pairId } : {}),
});

export const defaultGetDeleteProps = (
  _node: Descendant,
  ctx?: DiffPropsContext
): DiffProps & { pairId?: string } => ({
  diff: true,
  diffOperation: {
    type: 'delete',
  },
  ...(ctx?.pairId ? { pairId: ctx.pairId } : {}),
});

export const defaultGetUpdateProps = (
  _node: Descendant,
  properties: any,
  newProperties: any
): DiffProps => ({
  diff: true,
  diffOperation: {
    newProperties,
    properties,
    type: 'update',
  },
});
