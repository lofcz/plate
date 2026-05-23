/**
 * @file Engine tests for `groupRunsAndRehintWords`.
 *
 * The transform is two orthogonal switches layered on top of the engine's
 * per-pair output. These tests cover the cross-product:
 *
 *   1. Defaults (both off): per-pair output passes through unchanged.
 *   2. Grouping only: contiguous change runs reorder, all of one side then
 *      the other; word marks stay at per-pair scope (which means each
 *      paired block keeps its own per-pair word hints).
 *   3. Run-scope word hints only: layout stays interleaved, but leaf-level
 *      marks are recomputed across the full run so common prefixes /
 *      suffixes spanning multiple blocks survive as unchanged.
 *   4. Both on: git-diff layout AND run-scope word hints.
 *
 * Cross-cutting properties checked throughout:
 *   - Block-level `pairId` SURVIVES the transform (suggestion plugin
 *     accept/reject relies on this).
 *   - Independent edits separated by an unchanged block do NOT merge into
 *     one run. The transform must respect run boundaries.
 *   - Pure-insert and pure-delete runs are passed through verbatim (no
 *     other side to compare).
 *   - Runs containing nested-block content (lists with li > p children,
 *     etc.) fall back to per-pair marks — run-scope concatenation is
 *     ill-defined for nested-block shapes.
 *   - Unchanged container wrappers (e.g. `<lesson_phase>`) are recursed
 *     INTO: a run inside the wrapper's children gets the same transform.
 *   - Determinism: same inputs ⇒ same outputs.
 */

import { type Descendant } from 'platejs';

import { type ComputeDiffOptions, computeDiff } from '../../lib/computeDiff';

const p = (text: string) => ({
  type: 'paragraph' as const,
  children: [{ text }],
});

const li = (text: string) => ({
  type: 'li' as const,
  children: [{ type: 'lic' as const, children: [{ text }] }],
});

const ul = (...items: any[]) => ({
  type: 'ul' as const,
  children: items,
});

const phase = (...children: any[]) => ({
  type: 'lesson_phase' as const,
  children,
});

const activity = (...children: any[]) => ({
  type: 'lesson_activity' as const,
  children,
});

const baseOptions: Partial<ComputeDiffOptions> = {
  granularity: 'block',
  isInline: () => false,
};

/**
 * Build a fresh deterministic pairId generator. Reused per `computeDiff`
 * call so two invocations with identical inputs produce identical output
 * (the default minter randomises so tests can't `toEqual` two runs).
 */
const deterministicPairId = () => {
  let n = 0;
  return () => `pair-${++n}`;
};

const textOf = (block: any): string =>
  (block.children as any[])
    .map((c) =>
      typeof c.text === 'string' ? c.text : c.children ? textOf(c) : ''
    )
    .join('');

const opOf = (node: any): 'insert' | 'delete' | 'update' | undefined =>
  node?.diffOperation?.type;

const pairIdOf = (node: any): string | undefined => node?.pairId;

const childMarkedTexts = (block: any, op: 'insert' | 'delete'): string =>
  ((block.children as any[]) ?? [])
    .filter((c) => c?.diffOperation?.type === op)
    .map((c) => c.text)
    .join('');

const childUnmarkedTexts = (block: any): string =>
  ((block.children as any[]) ?? [])
    .filter((c) => !c?.diffOperation)
    .map((c) => (typeof c.text === 'string' ? c.text : ''))
    .join('');

describe('groupRunsAndRehintWords', () => {
  describe('defaults preserve per-pair output', () => {
    it('returns the engine output unchanged when both switches are off', () => {
      const before: Descendant[] = [p('alpha'), p('beta'), p('gamma')];
      const after: Descendant[] = [p('alpha'), p('BETA'), p('gamma')];

      const defaultOut = computeDiff(before, after, {
        ...baseOptions,
        generatePairId: deterministicPairId(),
      });

      const explicitOff = computeDiff(before, after, {
        ...baseOptions,
        generatePairId: deterministicPairId(),
        groupConsecutiveChanges: false,
        runScopeWordHints: false,
      });

      expect(explicitOff).toEqual(defaultOut);
    });

    it('does not touch inline-granularity output even when switches are set', () => {
      const before: Descendant[] = [p('alpha beta gamma')];
      const after: Descendant[] = [p('alpha BETA gamma')];

      const inlineOut = computeDiff(before, after, {
        isInline: () => false,
        granularity: 'inline',
        groupConsecutiveChanges: true,
        runScopeWordHints: true,
      });

      // Inline mode has no run concept, so the transform must be a no-op.
      const inlineOutDefault = computeDiff(before, after, {
        isInline: () => false,
        granularity: 'inline',
      });

      expect(inlineOut).toEqual(inlineOutDefault);
    });
  });

  describe('grouping only (groupConsecutiveChanges: true)', () => {
    it('reorders a 3-pair run so all deletes precede all inserts (delete-first)', () => {
      const before: Descendant[] = [p('A'), p('B'), p('C')];
      const after: Descendant[] = [p('X'), p('Y'), p('Z')];

      const out = computeDiff(before, after, {
        ...baseOptions,
        pairOrder: 'delete-first',
        groupConsecutiveChanges: true,
      });

      const ops = out.map(opOf);
      expect(ops).toEqual([
        'delete',
        'delete',
        'delete',
        'insert',
        'insert',
        'insert',
      ]);
      const texts = out.map(textOf);
      expect(texts).toEqual(['A', 'B', 'C', 'X', 'Y', 'Z']);
    });

    it('honours pairOrder: insert-first puts inserts before deletes', () => {
      const before: Descendant[] = [p('A'), p('B'), p('C')];
      const after: Descendant[] = [p('X'), p('Y'), p('Z')];

      const out = computeDiff(before, after, {
        ...baseOptions,
        pairOrder: 'insert-first',
        groupConsecutiveChanges: true,
      });

      const ops = out.map(opOf);
      expect(ops).toEqual([
        'insert',
        'insert',
        'insert',
        'delete',
        'delete',
        'delete',
      ]);
      const texts = out.map(textOf);
      expect(texts).toEqual(['X', 'Y', 'Z', 'A', 'B', 'C']);
    });

    it('preserves block-level pairId across the reorder', () => {
      const before: Descendant[] = [p('A'), p('B')];
      const after: Descendant[] = [p('X'), p('Y')];

      const out = computeDiff(before, after, {
        ...baseOptions,
        groupConsecutiveChanges: true,
      });

      const deletes = out.filter((n) => opOf(n) === 'delete');
      const inserts = out.filter((n) => opOf(n) === 'insert');

      // Each delete must have a matching insert that shares its pairId.
      const delPairIds = deletes.map(pairIdOf).sort();
      const insPairIds = inserts.map(pairIdOf).sort();
      expect(delPairIds).toEqual(insPairIds);
      expect(delPairIds.every(Boolean)).toBe(true);
      // No collision across pairs.
      expect(new Set(delPairIds).size).toBe(delPairIds.length);
    });

    it('keeps independent runs separated by an unchanged block', () => {
      // Two independent edits separated by an unchanged paragraph. The
      // transform must NOT merge them into one run.
      const before: Descendant[] = [p('alpha'), p('unchanged'), p('beta')];
      const after: Descendant[] = [p('ALPHA'), p('unchanged'), p('BETA')];

      const out = computeDiff(before, after, {
        ...baseOptions,
        groupConsecutiveChanges: true,
      });

      const ops = out.map(opOf);
      // delete-first by default; one (delete, insert) pair, then unchanged,
      // then another (delete, insert) pair. Group ordering within a single
      // pair is a no-op for `groupConsecutiveChanges`.
      expect(ops).toEqual(['delete', 'insert', undefined, 'delete', 'insert']);
      expect(textOf(out[2])).toBe('unchanged');
    });

    it('passes pure-insert runs through verbatim (no other side to swap)', () => {
      const before: Descendant[] = [p('alpha')];
      const after: Descendant[] = [p('alpha'), p('NEW1'), p('NEW2')];

      const out = computeDiff(before, after, {
        ...baseOptions,
        groupConsecutiveChanges: true,
      });

      const ops = out.map(opOf);
      expect(ops).toEqual([undefined, 'insert', 'insert']);
      expect(textOf(out[1])).toBe('NEW1');
      expect(textOf(out[2])).toBe('NEW2');
    });

    it('passes pure-delete runs through verbatim', () => {
      const before: Descendant[] = [p('alpha'), p('GONE1'), p('GONE2')];
      const after: Descendant[] = [p('alpha')];

      const out = computeDiff(before, after, {
        ...baseOptions,
        groupConsecutiveChanges: true,
      });

      const ops = out.map(opOf);
      expect(ops).toEqual([undefined, 'delete', 'delete']);
    });
  });

  describe('run-scope word hints (runScopeWordHints: true)', () => {
    it('preserves common preamble unchanged across two adjacent paired blocks', () => {
      // Both blocks share a "Step:" prefix; only the trailing word differs.
      // Per-pair would mark "Step: alpha" entirely as delete and "Step:
      // beta" entirely as insert (different blocks, different pair). Run-
      // scope sees them together — "Step:" appears on both sides and
      // becomes unchanged.
      const before: Descendant[] = [p('Step: alpha'), p('Step: gamma')];
      const after: Descendant[] = [p('Step: beta'), p('Step: delta')];

      const out = computeDiff(before, after, {
        ...baseOptions,
        runScopeWordHints: true,
      });

      // Find an insert block and a delete block — each must have the
      // "Step:" prefix on an UNMARKED leaf.
      const aDelete = out.find((n) => opOf(n) === 'delete');
      const anInsert = out.find((n) => opOf(n) === 'insert');
      expect(aDelete).toBeDefined();
      expect(anInsert).toBeDefined();

      expect(childUnmarkedTexts(aDelete)).toContain('Step:');
      expect(childUnmarkedTexts(anInsert)).toContain('Step:');

      // The trailing word should be on a marked leaf on its respective
      // side. (e.g. "alpha" on a delete-marked leaf, "beta" on an insert-
      // marked leaf.)
      const delMarked = out
        .filter((n) => opOf(n) === 'delete')
        .map((b) => childMarkedTexts(b, 'delete'))
        .join('|');
      const insMarked = out
        .filter((n) => opOf(n) === 'insert')
        .map((b) => childMarkedTexts(b, 'insert'))
        .join('|');

      // delete-marked text must contain "alpha" and "gamma" somewhere.
      expect(delMarked).toMatch(/alpha/);
      expect(delMarked).toMatch(/gamma/);
      expect(insMarked).toMatch(/beta/);
      expect(insMarked).toMatch(/delta/);
    });

    it('keeps run-scope output interleaved when grouping is off', () => {
      const before: Descendant[] = [p('A'), p('B')];
      const after: Descendant[] = [p('X'), p('Y')];

      const out = computeDiff(before, after, {
        ...baseOptions,
        pairOrder: 'delete-first',
        runScopeWordHints: true,
        // groupConsecutiveChanges: false (default)
      });

      // Order should still be interleaved per-pair, not grouped.
      const ops = out.map(opOf);
      expect(ops).toEqual(['delete', 'insert', 'delete', 'insert']);
    });

    it('does not fire on pure-insert runs (no other side to compare)', () => {
      const before: Descendant[] = [p('alpha')];
      const after: Descendant[] = [p('alpha'), p('beta')];

      const out = computeDiff(before, after, {
        ...baseOptions,
        runScopeWordHints: true,
      });

      // The inserted block should have its content emitted as the engine's
      // pure-insert (the whole text marked on the insert side).
      const insertBlock = out.find((n) => opOf(n) === 'insert');
      expect(insertBlock).toBeDefined();
      // For pure-insert, the engine emits the block with the insert mark on
      // the block; the children themselves are not word-diff'd against
      // anything (nothing to compare). So the text content must round-trip.
      expect(textOf(insertBlock)).toBe('beta');
    });

    it('falls back to per-pair when run contains nested-block content (lists)', () => {
      // Lists have `li > lic > {text}` structure — that's NESTED blocks,
      // not prose. The transform must not concatenate across lis. Compare
      // against running computeDiff with runScopeWordHints off: the output
      // for this list-only run should be byte-identical.
      const before: Descendant[] = [ul(li('apple'), li('banana'))];
      const after: Descendant[] = [ul(li('apricot'), li('blueberry'))];

      const withRehint = computeDiff(before, after, {
        ...baseOptions,
        generatePairId: deterministicPairId(),
        runScopeWordHints: true,
      });
      const withoutRehint = computeDiff(before, after, {
        ...baseOptions,
        generatePairId: deterministicPairId(),
      });

      expect(withRehint).toEqual(withoutRehint);
    });
  });

  describe('grouping + run-scope word hints together', () => {
    it('emits git-diff layout with run-scope marks', () => {
      const before: Descendant[] = [
        p('The quick brown fox'),
        p('jumps over the lazy dog'),
      ];
      const after: Descendant[] = [
        p('The slow brown fox'),
        p('walks under the lazy cat'),
      ];

      const out = computeDiff(before, after, {
        ...baseOptions,
        pairOrder: 'delete-first',
        groupConsecutiveChanges: true,
        runScopeWordHints: true,
      });

      const ops = out.map(opOf);
      expect(ops).toEqual(['delete', 'delete', 'insert', 'insert']);

      // Run-scope diff should keep "brown fox" / "the lazy" unchanged on
      // both sides, mark the divergent words.
      const allDeleteUnmarked = out
        .filter((n) => opOf(n) === 'delete')
        .map(childUnmarkedTexts)
        .join('|');
      const allInsertUnmarked = out
        .filter((n) => opOf(n) === 'insert')
        .map(childUnmarkedTexts)
        .join('|');

      // Common words across both sides remain on unmarked leaves.
      for (const common of ['The', 'brown', 'fox', 'the', 'lazy']) {
        expect(allDeleteUnmarked).toContain(common);
        expect(allInsertUnmarked).toContain(common);
      }
    });
  });

  describe('recursion into unchanged container wrappers', () => {
    it('descends through `<lesson_phase>` into a child run of paragraphs', () => {
      // Wrapper is unchanged; its children contain a run of paired changes
      // that should be reordered and rehinted just like top-level.
      const before: Descendant[] = [
        phase(p('alpha line'), p('beta line'), p('gamma line')),
      ];
      const after: Descendant[] = [
        phase(p('alpha LINE'), p('beta LINE'), p('gamma line')),
      ];

      const out = computeDiff(before, after, {
        ...baseOptions,
        pairOrder: 'delete-first',
        groupConsecutiveChanges: true,
        runScopeWordHints: true,
      });

      // The wrapper itself stays unchanged (no diffOperation).
      expect(out).toHaveLength(1);
      const wrapper = out[0] as any;
      expect(opOf(wrapper)).toBeUndefined();
      expect(wrapper.type).toBe('lesson_phase');

      // The inner children form a run of 2 paired changes + 1 unchanged.
      // After grouping: [delete, delete, insert, insert, unchanged] OR
      // [delete, delete, insert, insert, ...] then unchanged.
      const innerOps = (wrapper.children as any[]).map(opOf);
      // The unchanged "gamma line" should be at the end.
      expect(innerOps.at(-1)).toBeUndefined();
      // Before the unchanged tail, all deletes come before all inserts.
      const head = innerOps.slice(0, innerOps.length - 1);
      const firstInsertIdx = head.indexOf('insert');
      const lastDeleteIdx = head.lastIndexOf('delete');
      // Either there are no deletes, no inserts, or every delete precedes
      // every insert.
      if (firstInsertIdx !== -1 && lastDeleteIdx !== -1) {
        expect(lastDeleteIdx).toBeLessThan(firstInsertIdx);
      }
    });

    it('descends through TWO levels of unchanged wrappers', () => {
      // <lesson_phase> > <lesson_activity> > paragraphs. Both wrappers are
      // unchanged; the run lives at the innermost level.
      const before: Descendant[] = [phase(activity(p('alpha'), p('beta')))];
      const after: Descendant[] = [phase(activity(p('ALPHA'), p('BETA')))];

      const out = computeDiff(before, after, {
        ...baseOptions,
        groupConsecutiveChanges: true,
      });

      expect(out).toHaveLength(1);
      const phaseEl = out[0] as any;
      expect(phaseEl.type).toBe('lesson_phase');
      expect(opOf(phaseEl)).toBeUndefined();

      const activityEl = phaseEl.children[0];
      expect(activityEl.type).toBe('lesson_activity');
      expect(opOf(activityEl)).toBeUndefined();

      // Inner paragraphs should be reordered.
      const innerOps = activityEl.children.map(opOf);
      expect(innerOps).toEqual(['delete', 'delete', 'insert', 'insert']);
    });

    it('does NOT recurse into a CHANGED wrapper', () => {
      // If the wrapper itself is part of a paired diff, the inner content
      // is already the engine's word-hinted children — we must not treat
      // those inline leaves as sibling blocks and try to reorder them.
      // Construct a case where the wrapper attribute changes so the whole
      // block becomes a paired delete/insert.
      const before: Descendant[] = [
        { type: 'callout', tone: 'info', children: [{ text: 'alpha beta' }] },
      ] as any;
      const after: Descendant[] = [
        {
          type: 'callout',
          tone: 'warning',
          children: [{ text: 'alpha beta' }],
        },
      ] as any;

      const out = computeDiff(before, after, {
        ...baseOptions,
        groupConsecutiveChanges: true,
      });

      // The diff produces a paired (delete, insert) pair for the callout
      // wrapper. Their children are inline text leaves; the transform must
      // not reorder anything inside them.
      const ops = out.map(opOf);
      expect(ops).toEqual(['delete', 'insert']);
      // Inside each half, the text "alpha beta" must round-trip.
      for (const half of out) {
        expect(textOf(half)).toBe('alpha beta');
      }
    });
  });

  describe('determinism', () => {
    it('produces identical output across repeated invocations', () => {
      const before: Descendant[] = [p('one'), p('two'), p('three')];
      const after: Descendant[] = [p('ONE'), p('two'), p('THREE')];

      const a = computeDiff(before, after, {
        ...baseOptions,
        groupConsecutiveChanges: true,
        runScopeWordHints: true,
        // Deterministic pair ids so two runs are byte-comparable.
        generatePairId: deterministicPairId(),
      });
      const b = computeDiff(before, after, {
        ...baseOptions,
        groupConsecutiveChanges: true,
        runScopeWordHints: true,
        generatePairId: deterministicPairId(),
      });

      expect(a).toEqual(b);
    });
  });

  describe('round-trip text fidelity', () => {
    it('reconstructs the new document from insert + unchanged blocks', () => {
      // Sanity: after grouping + run-scope rehint, concatenating every
      // block that contributes to the "new" side (inserts + unchanged)
      // and stripping delete-marked leaves should reproduce the input.
      const before: Descendant[] = [
        p('Old line one'),
        p('Old line two'),
        p('shared'),
      ];
      const after: Descendant[] = [
        p('New line one'),
        p('New line two'),
        p('shared'),
      ];

      const out = computeDiff(before, after, {
        ...baseOptions,
        groupConsecutiveChanges: true,
        runScopeWordHints: true,
      });

      const newSide = out
        .filter((n) => opOf(n) !== 'delete')
        .map((b: any) => {
          // Strip leaves marked as delete; keep insert + unchanged leaves.
          const kept = (b.children as any[])
            .filter((c) => c?.diffOperation?.type !== 'delete')
            .map((c) => (typeof c.text === 'string' ? c.text : ''))
            .join('');
          return kept;
        })
        .join('\n');

      const expectedNew = ['New line one', 'New line two', 'shared'].join('\n');
      expect(newSide).toBe(expectedNew);
    });

    it('reconstructs the old document from delete + unchanged blocks', () => {
      const before: Descendant[] = [
        p('Old line one'),
        p('Old line two'),
        p('shared'),
      ];
      const after: Descendant[] = [
        p('New line one'),
        p('New line two'),
        p('shared'),
      ];

      const out = computeDiff(before, after, {
        ...baseOptions,
        groupConsecutiveChanges: true,
        runScopeWordHints: true,
      });

      const oldSide = out
        .filter((n) => opOf(n) !== 'insert')
        .map((b: any) => {
          const kept = (b.children as any[])
            .filter((c) => c?.diffOperation?.type !== 'insert')
            .map((c) => (typeof c.text === 'string' ? c.text : ''))
            .join('');
          return kept;
        })
        .join('\n');

      const expectedOld = ['Old line one', 'Old line two', 'shared'].join('\n');
      expect(oldSide).toBe(expectedOld);
    });
  });
});
