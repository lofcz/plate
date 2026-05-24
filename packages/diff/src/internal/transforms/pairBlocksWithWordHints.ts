/**
 * Pair-wise block diff with optional word-level hints, declarative strategy
 * dispatch, and structural-heuristic recursion as a fallback.
 *
 * Given two arrays of top-level blocks coming from a single DMP delete/insert
 * pair, this returns a single flat ordered list of diff'd descendants. The
 * per-pair decision tree, applied in order, is:
 *
 *   0. **Byte equality.** If both halves are deep-equal (modulo
 *      `options.ignoreProps`), pass through the new side verbatim. No diff
 *      op, no `pairId`. This matters during recursion: an unchanged child
 *      sibling MUST stay clean.
 *   1. **Declarative strategy** (preferred): if the caller has supplied
 *      `options.getDiffStrategy`, ask it for both halves. When both return
 *      the same `kind`, follow that strategy:
 *        - `container { identityProps? }`: compare the listed props (or all
 *          own props if omitted, minus `children` & `ignoreProps`). On
 *          match → recurse into children; the wrapper itself is emitted
 *          UNCHANGED. On mismatch → fall through to atomic.
 *        - `prose`: word-hint tokenise both children streams and emit two
 *          tagged blocks with shared `pairId`.
 *        - `atomic`: whole-block delete + insert with shared `pairId`.
 *   2. **Structural-recursion heuristic** (`canRecurseContainer`): same
 *      `type`, same own props, both have only block-element children → emit
 *      ONE unchanged wrapper with recursed children. Only fires when the
 *      caller hasn't already decided via strategy.
 *   3. **Prose word-hint heuristic** (`canWordHint`): same `type`, both
 *      have leafy (text/inline) children → word-hint pair.
 *   4. **Whole-block fallback**: everything else → marked pair with shared
 *      `pairId`.
 *   5. **Overflow**: when one side has more blocks than the other, the
 *      extras are emitted as standalone pure inserts / deletes (no
 *      `pairId`).
 *
 * Output ordering: per-pair, the delete half precedes the insert half by
 * default (`pairOrder = 'delete-first'`, mimics `git diff` unified output).
 * `pairOrder = 'insert-first'` flips each pair so the new content reads
 * first. Unchanged wrappers and standalone overflow nodes are not affected
 * by `pairOrder` (they have nothing to interleave with).
 */

import {
  type Descendant,
  type TElement,
  type TText,
  ElementApi,
  TextApi,
} from 'platejs';

import type { ComputeDiffOptions, DiffStrategy } from '../../lib/computeDiff';

import { dmp } from '../utils/dmp';
import { isEqual } from '../utils/is-equal';
import { StringCharMapping } from '../utils/string-char-mapping';

const DEFAULT_WORD_BOUNDARY = /(\s+)/u;

let pairIdCounter = 0;
const defaultGeneratePairId = () => {
  pairIdCounter += 1;
  // Prefix keeps it readable in dev tools / snapshots; uniqueness is per pair
  // within a single computeDiff run which is more than enough — callers that
  // need globally-unique ids (e.g. suggestion plugin) override via
  // `options.generatePairId`.
  return `pair_${pairIdCounter}_${Math.random().toString(36).slice(2, 8)}`;
};

export function pairBlocksWithWordHints(
  oldBlocks: Descendant[],
  newBlocks: Descendant[],
  options: ComputeDiffOptions
): Descendant[] {
  const generatePairId = options.generatePairId ?? defaultGeneratePairId;
  const pairOrder = options.pairOrder ?? 'delete-first';
  const out: Descendant[] = [];

  const pushPair = (deletedNode: Descendant, insertedNode: Descendant) => {
    if (pairOrder === 'insert-first') {
      out.push(insertedNode, deletedNode);
    } else {
      out.push(deletedNode, insertedNode);
    }
  };

  // === Phase 1: structural alignment via DMP ===
  //
  // Naive position pairing (old[i] vs new[i]) is correct ONLY when both
  // halves come from a single DMP delete+insert chunk at the TOP level
  // (where the engine already aligned everything else). The moment we
  // recurse into a container whose children gained or lost a block in
  // the middle, position pairing creates phantom "replace" pairs for
  // every shifted block, and overflows the surviving copies as
  // standalone inserts. Concretely: a list that went from
  //   [A, B, C, D]
  // to
  //   [A, B, X, Y, C, D]
  // would be paired as (A↔A)(B↔B)(C↔X)(D↔Y) + standalone-insert C, D —
  // i.e. C and D show up TWICE (once as the "delete" half of a bogus
  // replace, once as an overflow insert) even though they are unchanged.
  //
  // The fix: run DMP on the two arrays with the same `ignoreProps`-aware
  // char mapping the top-level pass uses. Equal chunks pass through
  // verbatim; consecutive delete+insert chunks are pair-by-position
  // INSIDE the chunk (where position pairing IS correct because DMP has
  // already aligned the unchanged neighbours away); lone delete/insert
  // chunks emit as pure overflow.
  const mapping = new StringCharMapping({ ignoreProps: options.ignoreProps });
  const oldStr = mapping.nodesToString(oldBlocks);
  const newStr = mapping.nodesToString(newBlocks);
  const rawDiff = dmp.diff_main(oldStr, newStr);
  // NOTE: do NOT call diff_cleanupSemantic here. It is designed for
  // human-readable TEXT diffs and merges small equal runs (e.g. a single
  // unchanged char surrounded by inserts/deletes) into the neighbouring
  // change region. For STRUCTURAL block diff each char represents an
  // entire Slate node, so collapsing a 1-char equal makes the engine
  // treat an unchanged block as a replace pair — exactly the
  // "phantom replace" bug this function was rewritten to avoid.

  // === Phase 2: walk chunks, dispatch per-pair logic for replace regions ===
  let oi = 0; // pointer into oldBlocks
  let ni = 0; // pointer into newBlocks

  for (let chunkIdx = 0; chunkIdx < rawDiff.length; chunkIdx++) {
    const [op, val] = rawDiff[chunkIdx] as [number, string];

    if (op === 0) {
      // Equal modulo ignoreProps. Emit the NEW side verbatim so any
      // non-ignored prop changes propagate (mirrors step 0 of the old
      // per-pair flow). `val.length` counts how many nodes this equal
      // chunk represents in the StringCharMapping encoding (1 BMP char
      // per node — codes well below the surrogate range).
      for (const _ of val) {
        out.push(newBlocks[ni]);
        oi++;
        ni++;
      }
      continue;
    }

    if (op === -1) {
      const nextChunk = rawDiff[chunkIdx + 1];
      if (nextChunk && (nextChunk[0] as number) === 1) {
        // Delete-followed-by-insert: a "replace region" in DMP-speak.
        //
        // Pair by POSITION within the region (delete[k] ↔ insert[k]),
        // mirroring `git diff` line-pair semantics: the first removed
        // line sits visually next to the first added line, the second
        // next to the second, etc. Any overflow on either side becomes
        // lone deletes / lone inserts. No similarity heuristic — the
        // engine never tries to guess that delete[0] is "really" the
        // edit of insert[2]; that would require semantic understanding
        // we don't have.
        const deletedNodes: Descendant[] = [];
        for (const _ of val) {
          deletedNodes.push(oldBlocks[oi++]);
        }
        const insertedNodes: Descendant[] = [];
        const insertVal = nextChunk[1] as string;
        for (const _ of insertVal) {
          insertedNodes.push(newBlocks[ni++]);
        }

        const numDel = deletedNodes.length;
        const numIns = insertedNodes.length;
        const numPaired = Math.min(numDel, numIns);

        // Walk inserts in NEW-document order. The first `numPaired`
        // inserts are paired with the deletes at the same index;
        // anything beyond emits as a lone insert AT its natural
        // position (so trailing inserts read as appended additions,
        // matching the test's "trailing new blocks as pure inserts"
        // expectation and the way `git diff` shows extra `+` lines
        // after the paired hunk).
        for (let i = 0; i < numIns; i++) {
          if (i < numPaired) {
            handleReplacePair({
              generatePairId,
              newBlock: insertedNodes[i],
              oldBlock: deletedNodes[i],
              options,
              out,
              pushPair,
            });
          } else {
            const node = insertedNodes[i];
            out.push(attachProps(node, options.getInsertProps(node)));
          }
        }

        // Sweep trailing deletes (when the old region was longer than
        // the new region) AFTER the paired hunk. They land in the
        // output as standalone `-` lines following the matched pairs —
        // again the `git diff` convention. Putting them at the END
        // (rather than the top of the hunk) keeps `deletedBlocks[0]`
        // of the filter-by-tag projection equal to the PAIRED delete,
        // which downstream tests and UI both rely on.
        for (let d = numPaired; d < numDel; d++) {
          const node = deletedNodes[d];
          out.push(attachProps(node, options.getDeleteProps(node)));
        }

        chunkIdx++; // consume the paired insert chunk
        continue;
      }

      // Lone delete.
      for (const _ of val) {
        const node = oldBlocks[oi++];
        out.push(attachProps(node, options.getDeleteProps(node)));
      }
      continue;
    }

    if (op === 1) {
      // Lone insert (didn't immediately follow a delete — already
      // consumed in the paired case above).
      for (const _ of val) {
        const node = newBlocks[ni++];
        out.push(attachProps(node, options.getInsertProps(node)));
      }
    }
  }

  return out;
}

/**
 * Per-pair decision tree for a single (deleted, inserted) replacement
 * pair where the two halves are known to be unequal modulo
 * `options.ignoreProps`. Implements steps 1-4 of the original
 * pairBlocksWithWordHints flow:
 *
 *   1. Declarative strategy (container / prose / atomic).
 *   2. Structural-recursion heuristic (same-type wrapper, block-only
 *      children, identical own props).
 *   3. Prose word-hinting (same-type, leafy children).
 *   4. Whole-block fallback.
 */
function handleReplacePair(params: {
  generatePairId: () => string;
  newBlock: Descendant;
  oldBlock: Descendant;
  options: ComputeDiffOptions;
  out: Descendant[];
  pushPair: (d: Descendant, i: Descendant) => void;
}): void {
  const { generatePairId, newBlock, oldBlock, options, out, pushPair } = params;
  // 1. Declarative strategy: plugin author has told the engine how to
  // diff this element type. Takes precedence over heuristics.
  const sharedStrategy = pickPairStrategy(
    resolveStrategy(oldBlock, options),
    resolveStrategy(newBlock, options)
  );

  if (sharedStrategy) {
    if (sharedStrategy.kind === 'container') {
      if (
        ElementApi.isElement(oldBlock) &&
        ElementApi.isElement(newBlock) &&
        (oldBlock as TElement).type === (newBlock as TElement).type &&
        containerIdentityMatches(
          oldBlock as TElement,
          newBlock as TElement,
          sharedStrategy,
          options
        )
      ) {
        const recursed = pairBlocksWithWordHints(
          (oldBlock as TElement).children,
          (newBlock as TElement).children,
          options
        );
        out.push({
          ...(newBlock as TElement),
          children: recursed,
        } as Descendant);
        return;
      }
      // Container identity changed — strategy says these are NOT the
      // same wrapper. Whole-block.
      const pairId = generatePairId();
      pushPair(
        attachProps(oldBlock, options.getDeleteProps(oldBlock, { pairId })),
        attachProps(newBlock, options.getInsertProps(newBlock, { pairId }))
      );
      return;
    }

    if (
      sharedStrategy.kind === 'prose' &&
      ElementApi.isElement(oldBlock) &&
      ElementApi.isElement(newBlock)
    ) {
      const pairId = generatePairId();
      const { taggedOld, taggedNew } = applyWordHintsToPair(
        oldBlock as TElement,
        newBlock as TElement,
        pairId,
        options
      );
      pushPair(taggedOld, taggedNew);
      return;
    }
    // Prose strategy on a non-element half — silently fall through.

    if (sharedStrategy.kind === 'atomic') {
      const pairId = generatePairId();
      pushPair(
        attachProps(oldBlock, options.getDeleteProps(oldBlock, { pairId })),
        attachProps(newBlock, options.getInsertProps(newBlock, { pairId }))
      );
      return;
    }
  }

  // 2. Structural-recursion heuristic: same wrapper, block-element
  // children only.
  if (canRecurseContainer(oldBlock, newBlock, options)) {
    const recursed = pairBlocksWithWordHints(
      (oldBlock as TElement).children,
      (newBlock as TElement).children,
      options
    );
    out.push({
      ...(newBlock as TElement),
      children: recursed,
    } as Descendant);
    return;
  }

  const pairId = generatePairId();

  // 3. Prose word-hinting.
  if (canWordHint(oldBlock, newBlock, options.isInline)) {
    const { taggedOld, taggedNew } = applyWordHintsToPair(
      oldBlock as TElement,
      newBlock as TElement,
      pairId,
      options
    );
    pushPair(taggedOld, taggedNew);
    return;
  }

  // 4. Whole-block fallback.
  pushPair(
    attachProps(oldBlock, options.getDeleteProps(oldBlock, { pairId })),
    attachProps(newBlock, options.getInsertProps(newBlock, { pairId }))
  );
}

const attachProps = (node: Descendant, props: any): Descendant => ({
  ...node,
  ...props,
});

/**
 * Look up a node's declared diff strategy via `options.getDiffStrategy`.
 * Returns `undefined` when no resolver is configured, when the node isn't an
 * element, or when the resolver itself opts out for this node.
 */
const resolveStrategy = (
  node: Descendant,
  options: ComputeDiffOptions
): DiffStrategy | undefined => {
  if (!options.getDiffStrategy || !ElementApi.isElement(node)) return;
  return options.getDiffStrategy(node as TElement);
};

/**
 * Reconcile the two halves' strategies. We only commit to a strategy when
 * both sides agree on the `kind` — otherwise the change IS structural (an
 * element changed from `container` to `prose`, say) and we should let the
 * heuristics / fallback handle it.
 */
const pickPairStrategy = (
  oldStrategy: DiffStrategy | undefined,
  newStrategy: DiffStrategy | undefined
): DiffStrategy | undefined => {
  if (!oldStrategy || !newStrategy) return;
  if (oldStrategy.kind !== newStrategy.kind) return;
  if (oldStrategy.kind === 'container') {
    // Merge identityProps: the union of both sides' lists. If either side
    // is unspecified, fall back to "all own props" by leaving it out.
    const oldProps = oldStrategy.identityProps;
    const newProps = (newStrategy as { identityProps?: string[] })
      .identityProps;
    if (!oldProps || !newProps) {
      return { kind: 'container' };
    }
    const merged = Array.from(new Set([...oldProps, ...newProps]));
    return { kind: 'container', identityProps: merged };
  }
  return newStrategy;
};

/**
 * Test whether the two halves of a declared `container` pair are
 * identity-equivalent. When `identityProps` is provided, only those keys are
 * compared. Otherwise we fall back to deep-equality on every own property
 * (excluding `children` and `options.ignoreProps`).
 */
const containerIdentityMatches = (
  oldEl: TElement,
  newEl: TElement,
  strategy: DiffStrategy & { kind: 'container' },
  options: ComputeDiffOptions
): boolean => {
  if (strategy.identityProps) {
    const a = oldEl as Record<string, unknown>;
    const b = newEl as Record<string, unknown>;
    for (const key of strategy.identityProps) {
      const av = a[key];
      const bv = b[key];
      if (typeof av === 'object' || typeof bv === 'object') {
        if (!isEqual(av, bv, { ignoreDeep: options.ignoreProps })) {
          return false;
        }
      } else if (av !== bv) {
        return false;
      }
    }
    return true;
  }
  return isEqual(oldEl, newEl, {
    ignoreShallow: ['children'],
    ignoreDeep: options.ignoreProps,
  });
};

/**
 * Container recursion is appropriate when:
 *   - Both halves are elements of the same `type`.
 *   - Own properties (everything except `children` and `options.ignoreProps`)
 *     are deep-equal. This is the "wrapper is unchanged" condition.
 *   - Both halves have at least one child AND every child is a non-inline
 *     element. We deliberately bail when either side has any text or inline
 *     children — those are the prose-path's territory, not ours.
 *
 * The element-type & attribute checks prevent pretending an `<activity
 * name="A">` → `<activity name="B">` swap is just a child edit; that should
 * still show as a whole-block change so the user sees the attribute moved.
 */
const canRecurseContainer = (
  oldBlock: Descendant,
  newBlock: Descendant,
  options: ComputeDiffOptions
): boolean => {
  if (!ElementApi.isElement(oldBlock) || !ElementApi.isElement(newBlock)) {
    return false;
  }
  const oldEl = oldBlock as TElement;
  const newEl = newBlock as TElement;
  if (oldEl.type !== newEl.type) return false;

  // No children to recurse into — fall through to prose / whole-block paths
  // so the empty-content case is handled there (it's effectively a no-op
  // change but the caller still expects diff marks).
  if (oldEl.children.length === 0 && newEl.children.length === 0) return false;

  const isInline = options.isInline;
  const hasOnlyBlockElementChildren = (children: Descendant[]): boolean =>
    children.length > 0 &&
    children.every(
      (c) =>
        ElementApi.isElement(c) &&
        !isInline(c) &&
        // Voids are atomic. Recursing into a void's children (which Slate
        // requires to be `[{ text: '' }]`) would be meaningless and would
        // incorrectly trigger word-hinting on the empty leaf.
        !isVoid(c, options)
    );

  if (
    !hasOnlyBlockElementChildren(oldEl.children) ||
    !hasOnlyBlockElementChildren(newEl.children)
  ) {
    return false;
  }

  // Wrapper own-props must match (ignoring `children` and any caller-marked
  // ignored props such as `id`).
  return isEqual(oldEl, newEl, {
    ignoreShallow: ['children'],
    ignoreDeep: options.ignoreProps,
  });
};

/**
 * Best-effort void detection. `ComputeDiffOptions` doesn't currently expose
 * an `isVoid` predicate, so we approximate: an element is a void if it has
 * exactly one empty-text child (Slate's standard void shape). False
 * negatives just mean we attempt to recurse — `canRecurseContainer` will
 * then fail at the `hasOnlyBlockElementChildren` check anyway because the
 * void's `[{ text: '' }]` child is not an element.
 */
const isVoid = (el: Descendant, _options: ComputeDiffOptions): boolean => {
  if (!ElementApi.isElement(el)) return false;
  const children = (el as TElement).children;
  return (
    children.length === 1 &&
    TextApi.isText(children[0]) &&
    (children[0] as TText).text === ''
  );
};

/**
 * Word-hinting is appropriate when both blocks:
 *   - Are elements of the same `type`
 *   - Have only text / inline children (no nested blocks; no void)
 *
 * The element-type check prevents pretending a paragraph→heading swap is a
 * "minor edit". Anything else (different types, nested blocks, code, MDX
 * components, voids) falls back to whole-block delete + insert.
 */
const canWordHint = (
  oldBlock: Descendant,
  newBlock: Descendant,
  isInline: ComputeDiffOptions['isInline']
): boolean => {
  if (!ElementApi.isElement(oldBlock) || !ElementApi.isElement(newBlock)) {
    return false;
  }
  if ((oldBlock as TElement).type !== (newBlock as TElement).type) {
    return false;
  }

  const isLeafyChildren = (children: Descendant[]) =>
    children.every(
      (c) => TextApi.isText(c) || (ElementApi.isElement(c) && isInline(c))
    );

  return (
    isLeafyChildren((oldBlock as TElement).children) &&
    isLeafyChildren((newBlock as TElement).children)
  );
};

/**
 * Compute a token-level diff between the two blocks' text content and produce
 * two new blocks whose text leaves carry per-token insert / delete marks for
 * the changed words. Both blocks also carry block-level delete / insert
 * suggestion props with the shared `pairId`.
 */
const applyWordHintsToPair = (
  oldBlock: TElement,
  newBlock: TElement,
  pairId: string,
  options: ComputeDiffOptions
): { taggedOld: Descendant; taggedNew: Descendant } => {
  const wordBoundary = options.wordBoundary ?? DEFAULT_WORD_BOUNDARY;

  const oldTokens = tokenize(oldBlock.children, wordBoundary);
  const newTokens = tokenize(newBlock.children, wordBoundary);

  const tokenDiff = diffTokens(oldTokens, newTokens);

  const taggedOldChildren = emitMarkedChildren({
    tokens: oldTokens,
    ops: tokenDiff,
    side: 'delete',
    getProps: options.getDeleteProps,
    pairId,
  });
  const taggedNewChildren = emitMarkedChildren({
    tokens: newTokens,
    ops: tokenDiff,
    side: 'insert',
    getProps: options.getInsertProps,
    pairId,
  });

  return {
    taggedOld: {
      ...oldBlock,
      children: taggedOldChildren,
      ...options.getDeleteProps(oldBlock, { pairId }),
    },
    taggedNew: {
      ...newBlock,
      children: taggedNewChildren,
      ...options.getInsertProps(newBlock, { pairId }),
    },
  };
};

/**
 * Flatten a block's inline children into a stream of "tokens".
 *
 * A token carries:
 *   - `text`: a single contiguous word OR whitespace run
 *   - `props`: the source text leaf's properties (so inline marks like bold,
 *     italic, link refs survive the round-trip)
 *
 * Non-text inline children (e.g. mentions, inline equations) are emitted as
 * single opaque tokens with `inline: <node>` so they never get split.
 *
 * Exported (alongside `diffTokens` and `mergeAdjacentLeaves`) so the
 * run-scope rehinter (see `groupRunsAndRehintWords`) can build its
 * multi-block token streams from the same primitives this per-pair path
 * uses. Keeping one tokenizer guarantees identical word boundaries,
 * signature rules, and inline-element handling across the two paths.
 */
export type Token = {
  text: string;
  /** Source text leaf properties to copy onto the emitted leaf. */
  props?: Record<string, unknown>;
  /** When set, this token is an inline non-text element; emit it verbatim. */
  inline?: Descendant;
};

export const tokenize = (
  children: Descendant[],
  wordBoundary: RegExp
): Token[] => {
  // The boundary regex MUST have a capturing group so split() keeps the
  // separators. Wrap if necessary, and ensure the global flag is set.
  const flags = wordBoundary.flags.includes('g')
    ? wordBoundary.flags
    : `${wordBoundary.flags}g`;
  const source = wordBoundary.source.includes('(')
    ? wordBoundary.source
    : `(${wordBoundary.source})`;
  const safeBoundary = new RegExp(source, flags);

  const tokens: Token[] = [];

  for (const child of children) {
    if (TextApi.isText(child)) {
      const { text, ...props } = child as TText & Record<string, unknown>;
      if (text === '') {
        // Preserve empty leaves so the block's mark structure round-trips.
        tokens.push({ text: '', props });
        continue;
      }
      const parts = text.split(safeBoundary).filter((p) => p.length > 0);
      for (const part of parts) {
        tokens.push({ text: part, props });
      }
      continue;
    }
    // Inline element (link, mention, equation, void) — opaque single token.
    tokens.push({ text: '', inline: child });
  }

  return tokens;
};

/**
 * Run DMP on the two token streams by mapping each unique token signature to
 * a single unicode char. Returns an array of `{ op, idx }` entries pointing
 * back to positions in `oldTokens` / `newTokens`.
 *
 * op: -1 = delete from old, 0 = unchanged, 1 = insert into new
 */
export type TokenOp = {
  op: -1 | 0 | 1;
  oldIdx?: number;
  newIdx?: number;
};

export const diffTokens = (
  oldTokens: Token[],
  newTokens: Token[]
): TokenOp[] => {
  // Build a token signature → char map. Identical tokens (same text + same
  // mark set + same inline reference) share a char so DMP treats them as
  // equal.
  const sigToChar = new Map<string, string>();
  let nextCode = 0xe0_00; // private use area, avoid clashing with content

  const signatureOf = (t: Token) => {
    if (t.inline) {
      // Identify the inline node by reference (unique per occurrence).
      // We can't compare two different mention nodes by content alone because
      // they might have different ids. Use a position-stable signature.
      return `inline:${inlineSig(t.inline) ?? 'unknown'}`;
    }
    const propsKey = JSON.stringify(t.props ?? {});
    return `text:${propsKey}|${t.text}`;
  };

  const toChar = (t: Token): string => {
    const sig = signatureOf(t);
    let c = sigToChar.get(sig);
    if (!c) {
      c = String.fromCodePoint(nextCode++);
      sigToChar.set(sig, c);
    }
    return c;
  };

  const oldStr = oldTokens.map(toChar).join('');
  const newStr = newTokens.map(toChar).join('');

  const rawDiff = dmp.diff_main(oldStr, newStr);
  dmp.diff_cleanupSemantic(rawDiff);

  const ops: TokenOp[] = [];
  let oi = 0;
  let ni = 0;

  for (const [op, text] of rawDiff as [number, string][]) {
    // One emit per char in the chunk. The chars themselves are private-use
    // markers from `toChar`; we don't care about their value, only the count.
    for (const _ of text) {
      if (op === 0) {
        ops.push({ op: 0, oldIdx: oi++, newIdx: ni++ });
      } else if (op === -1) {
        ops.push({ op: -1, oldIdx: oi++ });
      } else {
        ops.push({ op: 1, newIdx: ni++ });
      }
    }
  }

  return ops;
};

const inlineSig = (node: Descendant): string | null => {
  if (!ElementApi.isElement(node)) return null;
  const id =
    (node as Record<string, unknown>).id ?? (node as TElement).type ?? '';
  return `${(node as TElement).type ?? 'el'}:${String(id)}`;
};

/**
 * Walk the diff ops in document order for `side`, emitting one Slate text or
 * inline node per token. Changed tokens (delete on the old side, insert on
 * the new side) receive the per-token mark from `getProps`; unchanged tokens
 * are emitted unmarked.
 *
 * Adjacent tokens with identical resulting properties are merged so we don't
 * blow up the leaf count unnecessarily.
 */
type EmitMarkedChildrenArgs = {
  tokens: Token[];
  ops: TokenOp[];
  side: 'delete' | 'insert';
  getProps: (node: Descendant, ctx?: { pairId?: string }) => any;
  pairId: string;
};

const emitMarkedChildren = ({
  tokens,
  ops,
  side,
  getProps,
  pairId,
}: EmitMarkedChildrenArgs): Descendant[] => {
  const emitted: Descendant[] = [];

  const sideKey = side === 'delete' ? 'oldIdx' : 'newIdx';
  const sideOp: -1 | 1 = side === 'delete' ? -1 : 1;

  for (const op of ops) {
    if (op.op === 0 || op.op === sideOp) {
      const idx = op[sideKey];
      if (idx === undefined) continue;
      const token = tokens[idx];

      if (token.inline) {
        if (op.op === sideOp) {
          // The inline node itself was inserted/removed — mark the wrapper.
          emitted.push({
            ...(token.inline as object),
            ...getProps(token.inline, { pairId }),
          } as Descendant);
        } else {
          emitted.push(token.inline);
        }
        continue;
      }

      const baseLeaf: TText = {
        text: token.text,
        ...(token.props as object),
      };

      if (op.op === sideOp) {
        emitted.push({
          ...baseLeaf,
          ...getProps(baseLeaf, { pairId }),
        });
      } else {
        emitted.push(baseLeaf);
      }
    }
    // Other side's ops are skipped for this side's emission.
  }

  // Merge adjacent leaves that share identical props (apart from `text`) so
  // the resulting block has the minimum number of leaves. This is purely a
  // cleanliness pass — it doesn't change rendering, but it keeps the editor
  // tree tidy and reduces React reconciliation work.
  return mergeAdjacentLeaves(emitted);
};

export const mergeAdjacentLeaves = (nodes: Descendant[]): Descendant[] => {
  if (nodes.length <= 1) return nodes;
  const result: Descendant[] = [];

  for (const node of nodes) {
    const last = result.at(-1);
    if (
      last &&
      TextApi.isText(node) &&
      TextApi.isText(last) &&
      sameTextProps(last, node)
    ) {
      result[result.length - 1] = {
        ...last,
        text: (last as TText).text + (node as TText).text,
      };
      continue;
    }
    result.push(node);
  }

  return result;
};

const sameTextProps = (a: TText, b: TText): boolean => {
  const { text: _ta, ...ap } = a as TText & Record<string, unknown>;
  const { text: _tb, ...bp } = b as TText & Record<string, unknown>;
  const ak = Object.keys(ap).sort();
  const bk = Object.keys(bp).sort();
  if (ak.length !== bk.length) return false;
  for (let i = 0; i < ak.length; i++) {
    if (ak[i] !== bk[i]) return false;
    const k = ak[i];
    const av = (ap as Record<string, unknown>)[k];
    const bv = (bp as Record<string, unknown>)[k];
    if (typeof av === 'object' || typeof bv === 'object') {
      if (JSON.stringify(av) !== JSON.stringify(bv)) return false;
    } else if (av !== bv) {
      return false;
    }
  }
  return true;
};
