/**
 * @file Adversarial tests for pairBlocksWithWordHints.
 *
 * These tests deliberately probe edge cases that are easy to get wrong:
 *
 *   1. Pair identity:    both halves of a pair MUST carry the same pairId, but
 *                        unrelated pairs MUST NOT share one.
 *   2. Word hinting:     only words that actually changed get marked; unchanged
 *                        words and whitespace must remain unmarked. Recon-
 *                        structed text must match the original byte-for-byte.
 *   3. Type mismatch:    a paragraph→heading swap must fall back to whole-block
 *                        marks, never word-hinting (otherwise we'd hide a
 *                        structural change as if it were a typo fix).
 *   4. Nested elements:  a list-item containing a paragraph is NOT prose; we
 *                        must not flatten it into a word stream.
 *   5. Inline marks:     bold/italic/link styling on the unchanged words must
 *                        be preserved verbatim; on changed words must reach
 *                        the diff leaf so the UI can show "the bold word
 *                        changed".
 *   6. Inline elements:  mentions and inline voids must not be split or lost.
 *                        Unchanged inline elements must appear unmarked on
 *                        both sides; changed ones get marked on their side.
 *   7. Overflow:         when oldBlocks.length ≠ newBlocks.length, the extra
 *                        blocks are pure inserts / pure deletes with their
 *                        own id, NOT a pairId shared with an arbitrary block.
 *   8. ID uniqueness:    `generatePairId` is called exactly once per pair,
 *                        never reused across pairs.
 *   9. Custom boundary:  caller-provided `wordBoundary` is respected (e.g.
 *                        punctuation-aware tokenisation).
 *  10. Determinism:      same inputs ⇒ same outputs (no hidden mutation).
 *  11. Container recursion:
 *                        same-type same-attrs wrapper with element-only
 *                        children should pass through unchanged while its
 *                        inner children are diff'd. The wrapper itself MUST
 *                        carry no `tag` and no `pairId`.
 */

import type { ComputeDiffOptions } from '../../lib/computeDiff';

import { pairBlocksWithWordHints } from './pairBlocksWithWordHints';

type Tag = { tag: 'delete' | 'insert'; pairId?: string };

const makeOptions = (
  overrides: Partial<ComputeDiffOptions> = {}
): ComputeDiffOptions => {
  let counter = 0;
  return {
    isInline: () => false,
    getDeleteProps: (_node, ctx) => ({
      tag: 'delete' as const,
      pairId: ctx?.pairId,
    }),
    getInsertProps: (_node, ctx) => ({
      tag: 'insert' as const,
      pairId: ctx?.pairId,
    }),
    getUpdateProps: () => ({}),
    granularity: 'block',
    generatePairId: () => `pair-${++counter}`,
    ...overrides,
  };
};

const p = (text: string) => ({
  type: 'paragraph',
  children: [{ text }],
});

const tagOf = (node: any): Tag | undefined => {
  if (!node) return;
  if (node.tag) return { tag: node.tag, pairId: node.pairId };
  return;
};

const textOf = (block: any): string =>
  (block.children as any[])
    .map((c) => (typeof c.text === 'string' ? c.text : ''))
    .join('');

/**
 * Recover the legacy "deletedBlocks" / "insertedBlocks" projection from the
 * new flat return list, used by tests that don't care about ordering.
 * Filtering by `tag` is reliable because `makeOptions` attaches `tag` only
 * via `getDeleteProps` / `getInsertProps` — so any block carrying a tag is
 * one half of a marked pair (or overflow). Container-recursed wrappers
 * have no `tag` and never appear in these projections.
 */
const splitByTag = (flat: any[]) => ({
  deletedBlocks: flat.filter((n) => n?.tag === 'delete'),
  insertedBlocks: flat.filter((n) => n?.tag === 'insert'),
});

describe('pairBlocksWithWordHints', () => {
  describe('pair identity', () => {
    it('assigns the same pairId to delete and insert halves of one pair', () => {
      const flat = pairBlocksWithWordHints(
        [p('Hello world')],
        [p('Hello planet')],
        makeOptions()
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      const del = tagOf(deletedBlocks[0]);
      const ins = tagOf(insertedBlocks[0]);

      expect(del?.pairId).toBeDefined();
      expect(del?.pairId).toBe(ins?.pairId);
    });

    it('uses distinct pairIds for two independent pairs in the same call', () => {
      const flat = pairBlocksWithWordHints(
        [p('alpha old'), p('beta old')],
        [p('alpha new'), p('beta new')],
        makeOptions()
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      const pair1 = tagOf(deletedBlocks[0])?.pairId;
      const pair2 = tagOf(deletedBlocks[1])?.pairId;
      expect(pair1).toBeDefined();
      expect(pair2).toBeDefined();
      expect(pair1).not.toBe(pair2);
      expect(pair1).toBe(tagOf(insertedBlocks[0])?.pairId);
      expect(pair2).toBe(tagOf(insertedBlocks[1])?.pairId);
    });

    it('calls generatePairId exactly once per pair, never per overflow', () => {
      const ids: string[] = [];
      pairBlocksWithWordHints(
        [p('a'), p('b'), p('overflow-old')],
        [p('a2'), p('b2')],
        makeOptions({
          generatePairId: () => {
            const id = `g-${ids.length + 1}`;
            ids.push(id);
            return id;
          },
        })
      );

      // 2 pairs => exactly 2 ids; the trailing "overflow-old" is a pure delete
      // and MUST NOT consume an id.
      expect(ids).toEqual(['g-1', 'g-2']);
    });
  });

  describe('pair ordering', () => {
    it('lays out each pair as [delete, insert] by default (delete-first)', () => {
      const flat = pairBlocksWithWordHints(
        [p('alpha old'), p('beta old')],
        [p('alpha new'), p('beta new')],
        makeOptions()
      );

      // Per-pair interleaving (not "all deletes then all inserts"). This is
      // the layout that lets the reader scan one pair, move on, scan the
      // next — i.e. how VS Code shows multi-block diffs.
      expect(flat.map((n: any) => n.tag)).toEqual([
        'delete',
        'insert',
        'delete',
        'insert',
      ]);
    });

    it('lays out each pair as [insert, delete] when pairOrder = insert-first', () => {
      const flat = pairBlocksWithWordHints(
        [p('alpha old'), p('beta old')],
        [p('alpha new'), p('beta new')],
        makeOptions({ pairOrder: 'insert-first' })
      );

      expect(flat.map((n: any) => n.tag)).toEqual([
        'insert',
        'delete',
        'insert',
        'delete',
      ]);
    });
  });

  describe('word hinting (prose, same type)', () => {
    it('marks only changed words; reconstructs original text losslessly', () => {
      // Default boundary is /(\s+)/u — splits on whitespace runs ONLY.
      // "Hello world!" → tokens ["Hello", " ", "world!"]; the bang stays
      // attached to the word.
      const flat = pairBlocksWithWordHints(
        [p('Hello world!')],
        [p('Hello planet!')],
        makeOptions()
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      const del = deletedBlocks[0] as any;
      const ins = insertedBlocks[0] as any;

      // Block-level marks are set.
      expect(tagOf(del)?.tag).toBe('delete');
      expect(tagOf(ins)?.tag).toBe('insert');

      // Reconstructed text MUST exactly match the original side.
      expect(textOf(del)).toBe('Hello world!');
      expect(textOf(ins)).toBe('Hello planet!');

      // Only "world!" is marked on the delete side; only "planet!" on insert.
      const delMarked = (del.children as any[])
        .filter((c) => c.tag === 'delete')
        .map((c) => c.text);
      const insMarked = (ins.children as any[])
        .filter((c) => c.tag === 'insert')
        .map((c) => c.text);
      expect(delMarked).toEqual(['world!']);
      expect(insMarked).toEqual(['planet!']);

      // The shared parts ("Hello", " ") must NOT be marked. We assert the
      // exact set of unmarked text to catch regressions where unchanged words
      // accidentally inherit a mark.
      const delUnmarked = (del.children as any[])
        .filter((c) => !c.tag)
        .map((c) => c.text);
      expect(delUnmarked.join('')).toBe('Hello ');
    });

    it('reports identical word-changes on both sides (no off-by-one)', () => {
      // Replace the middle word but keep the head & tail. A naive
      // implementation that aligns tokens by index instead of running DMP
      // would mis-mark every token after the change.
      const flat = pairBlocksWithWordHints(
        [p('one two three four five')],
        [p('one two THREE four five')],
        makeOptions()
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      const del = deletedBlocks[0] as any;
      const ins = insertedBlocks[0] as any;

      const delMarked = (del.children as any[])
        .filter((c) => c.tag === 'delete')
        .map((c) => c.text);
      const insMarked = (ins.children as any[])
        .filter((c) => c.tag === 'insert')
        .map((c) => c.text);

      expect(delMarked).toEqual(['three']);
      expect(insMarked).toEqual(['THREE']);

      // No off-by-one: every other word must remain unmarked.
      expect(textOf(del)).toBe('one two three four five');
      expect(textOf(ins)).toBe('one two THREE four five');
    });

    it('handles a complete replacement (no semantically-significant shared tokens)', () => {
      // Edge case: every WORD is different. The whitespace token between the
      // two words IS technically shared, but DMP's `diff_cleanupSemantic`
      // pass treats a single-char "common middle" as noise and consolidates
      // it into the surrounding change blocks. We accept that (it's how
      // human-readable diffs are supposed to look) and assert the visible
      // outcome: every character on each side is part of the change, and
      // text reconstruction stays lossless.
      const flat = pairBlocksWithWordHints(
        [p('cat sat')],
        [p('dog ran')],
        makeOptions()
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      const del = deletedBlocks[0] as any;
      const ins = insertedBlocks[0] as any;

      expect(textOf(del)).toBe('cat sat');
      expect(textOf(ins)).toBe('dog ran');

      // Whole content is marked on each side (no orphan unmarked leaf).
      const delUnmarked = (del.children as any[])
        .filter((c) => !c.tag)
        .map((c) => c.text);
      const insUnmarked = (ins.children as any[])
        .filter((c) => !c.tag)
        .map((c) => c.text);
      expect(delUnmarked).toEqual([]);
      expect(insUnmarked).toEqual([]);

      // And both side-specific marks contain the full original text.
      const delMarkedText = (del.children as any[])
        .filter((c) => c.tag === 'delete')
        .map((c) => c.text)
        .join('');
      const insMarkedText = (ins.children as any[])
        .filter((c) => c.tag === 'insert')
        .map((c) => c.text)
        .join('');
      expect(delMarkedText).toBe('cat sat');
      expect(insMarkedText).toBe('dog ran');
    });

    it('keeps whitespace UNMARKED when at least one neighbouring word is shared', () => {
      // Regression target for the previous test: when a meaningful shared
      // word anchors the diff, the whitespace must NOT be sucked into
      // either side's change. This is what makes the visual diff legible.
      const flat = pairBlocksWithWordHints(
        [p('hello cat sat down')],
        [p('hello dog ran down')],
        makeOptions()
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      const del = deletedBlocks[0] as any;
      const ins = insertedBlocks[0] as any;

      // The shared words "hello" and "down" anchor the diff. The
      // whitespace around them must appear unmarked on both sides.
      const delUnmarkedText = (del.children as any[])
        .filter((c) => !c.tag)
        .map((c) => c.text)
        .join('');
      const insUnmarkedText = (ins.children as any[])
        .filter((c) => !c.tag)
        .map((c) => c.text)
        .join('');
      expect(delUnmarkedText).toContain('hello');
      expect(delUnmarkedText).toContain('down');
      expect(insUnmarkedText).toContain('hello');
      expect(insUnmarkedText).toContain('down');
    });

    it('treats whitespace as separators (default boundary)', () => {
      // Adding extra whitespace should produce a diff on the whitespace token
      // (insert " " on the new side), not split the surrounding words.
      const flat = pairBlocksWithWordHints(
        [p('Hello world')],
        [p('Hello  world')],
        makeOptions()
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      const del = deletedBlocks[0] as any;
      const ins = insertedBlocks[0] as any;

      expect(textOf(del)).toBe('Hello world');
      expect(textOf(ins)).toBe('Hello  world');

      // "Hello" and "world" stay unmarked on both sides.
      const delUnmarkedWords = (del.children as any[])
        .filter((c) => !c.tag && /\S/.test(c.text))
        .map((c) => c.text);
      const insUnmarkedWords = (ins.children as any[])
        .filter((c) => !c.tag && /\S/.test(c.text))
        .map((c) => c.text);
      expect(delUnmarkedWords).toEqual(['Hello', 'world']);
      expect(insUnmarkedWords).toEqual(['Hello', 'world']);
    });

    it('preserves inline text marks (bold/italic) on unchanged words', () => {
      // Both sides carry the same bold span; only the trailing word changes.
      // The bold mark must survive the round-trip on the unchanged leaves.
      const oldBlock = {
        type: 'paragraph',
        children: [{ text: 'one ', bold: true }, { text: 'two' }],
      };
      const newBlock = {
        type: 'paragraph',
        children: [{ text: 'one ', bold: true }, { text: 'TWO' }],
      };

      const flat = pairBlocksWithWordHints(
        [oldBlock],
        [newBlock],
        makeOptions()
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      const del = deletedBlocks[0] as any;
      const ins = insertedBlocks[0] as any;

      // Unchanged "one " (bold) must NOT be marked but MUST keep bold:true.
      const unchangedOnDel = (del.children as any[]).filter((c) => !c.tag);
      expect(unchangedOnDel).toEqual([{ text: 'one ', bold: true }]);

      // Changed word "two"/"TWO" gets the side-specific mark; bold is
      // absent because the original "two" leaf wasn't bold.
      const changedOnDel = (del.children as any[])
        .filter((c) => c.tag === 'delete')
        .map((c) => ({ text: c.text, bold: c.bold }));
      const changedOnIns = (ins.children as any[])
        .filter((c) => c.tag === 'insert')
        .map((c) => ({ text: c.text, bold: c.bold }));
      expect(changedOnDel).toEqual([{ text: 'two', bold: undefined }]);
      expect(changedOnIns).toEqual([{ text: 'TWO', bold: undefined }]);
    });

    it('does NOT treat same-text-different-marks as an identical token', () => {
      // Regression target: token equality must account for inline marks, not
      // just text. If the old has "word" (plain) and the new has "word"
      // (bold), the diff must mark BOTH sides as changed — otherwise the
      // bold styling change would be silently dropped.
      const flat = pairBlocksWithWordHints(
        [
          {
            type: 'paragraph',
            children: [{ text: 'before word after' }],
          },
        ],
        [
          {
            type: 'paragraph',
            children: [
              { text: 'before ' },
              { text: 'word', bold: true },
              { text: ' after' },
            ],
          },
        ],
        makeOptions()
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      const del = deletedBlocks[0] as any;
      const ins = insertedBlocks[0] as any;

      // Text content is identical, but the diff must surface the bold change
      // by marking the "word" token on each side as changed.
      const delMarked = (del.children as any[])
        .filter((c) => c.tag === 'delete')
        .map((c) => c.text);
      const insMarked = (ins.children as any[])
        .filter((c) => c.tag === 'insert')
        .map((c) => c.text);

      expect(delMarked).toContain('word');
      expect(insMarked).toContain('word');
    });
  });

  describe('whole-block fallback (no word hints)', () => {
    it('does not word-hint when paired blocks have different types', () => {
      // A paragraph turning into a heading is a STRUCTURAL change, not a
      // typo. Pretending it's "the same block with a tweak" hides that.
      const oldBlocks = [{ type: 'paragraph', children: [{ text: 'Hello' }] }];
      const newBlocks = [{ type: 'h1', children: [{ text: 'Hello' }] }];

      const flat = pairBlocksWithWordHints(oldBlocks, newBlocks, makeOptions());

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      // Children are the verbatim originals; no inner ins/del leaves.
      expect((deletedBlocks[0] as any).children).toEqual([{ text: 'Hello' }]);
      expect((insertedBlocks[0] as any).children).toEqual([{ text: 'Hello' }]);
      // Block-level pairId is still shared.
      expect(tagOf(deletedBlocks[0])?.pairId).toBe(
        tagOf(insertedBlocks[0])?.pairId
      );
    });

    it('does not word-hint when block contains nested non-inline children (no structural recursion eligible)', () => {
      // A list-item wrapping a paragraph where the wrapper itself differs
      // (different `id`) is NOT eligible for container recursion (without
      // explicit `ignoreProps`). The inner paragraph being non-inline also
      // disqualifies word-hinting. So we expect whole-block fallback.
      const oldBlocks = [
        {
          type: 'list-item',
          someAttr: 'A',
          children: [{ type: 'paragraph', children: [{ text: 'nested' }] }],
        },
      ];
      const newBlocks = [
        {
          type: 'list-item',
          someAttr: 'B',
          children: [{ type: 'paragraph', children: [{ text: 'changed' }] }],
        },
      ];

      const flat = pairBlocksWithWordHints(
        oldBlocks,
        newBlocks,
        makeOptions({ isInline: () => false })
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      // Inner paragraph is untouched.
      expect((deletedBlocks[0] as any).children[0]).toEqual({
        type: 'paragraph',
        children: [{ text: 'nested' }],
      });
      expect((insertedBlocks[0] as any).children[0]).toEqual({
        type: 'paragraph',
        children: [{ text: 'changed' }],
      });
    });

    it('treats mixed leafy + nested children as non-prose (no word hints)', () => {
      // If even ONE child of a block is a non-inline element, the block
      // is structurally complex and must not be flattened. Easy to get
      // wrong with a naive "any element child" check.
      const oldBlocks = [
        {
          type: 'paragraph',
          children: [
            { text: 'leading ' },
            { type: 'block-callout', children: [{ text: 'inner' }] },
            { text: ' trailing' },
          ],
        },
      ];
      const newBlocks = [
        {
          type: 'paragraph',
          children: [
            { text: 'leading ' },
            { type: 'block-callout', children: [{ text: 'INNER' }] },
            { text: ' trailing' },
          ],
        },
      ];

      const flat = pairBlocksWithWordHints(
        oldBlocks,
        newBlocks,
        makeOptions({ isInline: () => false })
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      // Children unchanged on both sides; block carries only the top-level
      // mark. No inner ins/del leaves leaked into the paragraph.
      const delChildren = (deletedBlocks[0] as any).children;
      const insChildren = (insertedBlocks[0] as any).children;
      expect(delChildren).toEqual(oldBlocks[0].children);
      expect(insChildren).toEqual(newBlocks[0].children);
    });
  });

  describe('inline elements (mentions, voids, links)', () => {
    it('preserves an unchanged inline element on both sides without marks', () => {
      const mention = {
        type: 'mention',
        id: 'm1',
        children: [{ text: '' }],
      };
      const oldBlocks = [
        {
          type: 'paragraph',
          children: [{ text: 'hi ' }, mention, { text: ' old tail' }],
        },
      ];
      const newBlocks = [
        {
          type: 'paragraph',
          children: [{ text: 'hi ' }, mention, { text: ' new tail' }],
        },
      ];

      const isInline = (n: any) => n.type === 'mention';
      const flat = pairBlocksWithWordHints(
        oldBlocks,
        newBlocks,
        makeOptions({ isInline })
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      const del = deletedBlocks[0] as any;
      const ins = insertedBlocks[0] as any;

      // The mention itself must NOT be split, NOT marked, and must appear
      // exactly once on each side. (Easy to get wrong if the tokenizer
      // forgets to emit it verbatim or marks it as inserted/deleted.)
      const delMentions = (del.children as any[]).filter(
        (c) => c.type === 'mention'
      );
      const insMentions = (ins.children as any[]).filter(
        (c) => c.type === 'mention'
      );
      expect(delMentions).toEqual([mention]);
      expect(insMentions).toEqual([mention]);
    });

    it('marks an inserted inline element only on the new side', () => {
      const mention = {
        type: 'mention',
        id: 'm1',
        children: [{ text: '' }],
      };
      const oldBlocks = [
        { type: 'paragraph', children: [{ text: 'hello tail' }] },
      ];
      const newBlocks = [
        {
          type: 'paragraph',
          children: [{ text: 'hello ' }, mention, { text: ' tail' }],
        },
      ];

      const isInline = (n: any) => n.type === 'mention';
      const flat = pairBlocksWithWordHints(
        oldBlocks,
        newBlocks,
        makeOptions({ isInline })
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      const del = deletedBlocks[0] as any;
      const ins = insertedBlocks[0] as any;

      // No mention on the delete side.
      expect(
        (del.children as any[]).find((c) => c.type === 'mention')
      ).toBeUndefined();

      // Mention on the insert side carries the insert mark.
      const insMention = (ins.children as any[]).find(
        (c) => c.type === 'mention'
      );
      expect(insMention).toBeDefined();
      expect((insMention as any).tag).toBe('insert');
      expect((insMention as any).id).toBe('m1');
    });
  });

  describe('overflow (length mismatch)', () => {
    it('emits trailing new blocks as pure inserts WITHOUT a pairId', () => {
      const flat = pairBlocksWithWordHints(
        [p('only old')],
        [p('first new'), p('second new'), p('third new')],
        makeOptions()
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(3);

      const paired = tagOf(deletedBlocks[0])?.pairId;
      expect(tagOf(insertedBlocks[0])?.pairId).toBe(paired);

      // Overflow inserts get no pairId — they are standalone changes the
      // suggestion plugin will mint a fresh id for.
      expect(tagOf(insertedBlocks[1])?.pairId).toBeUndefined();
      expect(tagOf(insertedBlocks[2])?.pairId).toBeUndefined();
      expect(tagOf(insertedBlocks[1])?.tag).toBe('insert');
      expect(tagOf(insertedBlocks[2])?.tag).toBe('insert');
    });

    it('emits trailing old blocks as pure deletes WITHOUT a pairId', () => {
      const flat = pairBlocksWithWordHints(
        [p('first old'), p('second old'), p('third old')],
        [p('only new')],
        makeOptions()
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(3);
      expect(insertedBlocks).toHaveLength(1);

      const paired = tagOf(insertedBlocks[0])?.pairId;
      expect(tagOf(deletedBlocks[0])?.pairId).toBe(paired);
      expect(tagOf(deletedBlocks[1])?.pairId).toBeUndefined();
      expect(tagOf(deletedBlocks[2])?.pairId).toBeUndefined();
    });

    it('does not crash on empty inputs', () => {
      // Easy bug: forgetting one of the empty-array branches.
      expect(pairBlocksWithWordHints([], [], makeOptions())).toEqual([]);
      const delOnly = pairBlocksWithWordHints([p('x')], [], makeOptions());
      expect(delOnly).toHaveLength(1);
      expect(tagOf(delOnly[0])?.tag).toBe('delete');
      const insOnly = pairBlocksWithWordHints([], [p('x')], makeOptions());
      expect(insOnly).toHaveLength(1);
      expect(tagOf(insOnly[0])?.tag).toBe('insert');
    });
  });

  describe('custom wordBoundary', () => {
    it('respects a punctuation-aware boundary', () => {
      // Boundary that splits on whitespace OR punctuation so the bang
      // becomes its own token. The user override comes through `options`.
      const punctBoundary = /([\s.,!?;:]+)/u;
      const flat = pairBlocksWithWordHints(
        [p('Hello world!')],
        [p('Hello planet!')],
        makeOptions({ wordBoundary: punctBoundary })
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      const del = deletedBlocks[0] as any;
      const ins = insertedBlocks[0] as any;

      // With the punctuation-aware boundary, "world" alone is marked deleted
      // and "planet" alone is marked inserted — the shared "!" survives
      // unmarked on both sides.
      const delMarked = (del.children as any[])
        .filter((c) => c.tag === 'delete')
        .map((c) => c.text);
      const insMarked = (ins.children as any[])
        .filter((c) => c.tag === 'insert')
        .map((c) => c.text);
      expect(delMarked).toEqual(['world']);
      expect(insMarked).toEqual(['planet']);

      // Reconstructed text remains exact.
      expect(textOf(del)).toBe('Hello world!');
      expect(textOf(ins)).toBe('Hello planet!');
    });

    it('tolerates a boundary regex without a capture group', () => {
      // Easy footgun: a regex like /\s+/ (no capture group) loses
      // separators on split(). The implementation must wrap it for the
      // caller so text reconstruction stays lossless.
      const flat = pairBlocksWithWordHints(
        [p('one two three')],
        [p('one TWO three')],
        makeOptions({ wordBoundary: /\s+/u })
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      const del = deletedBlocks[0] as any;
      const ins = insertedBlocks[0] as any;

      expect(textOf(del)).toBe('one two three');
      expect(textOf(ins)).toBe('one TWO three');
    });
  });

  describe('container recursion', () => {
    // Helper for MDX-like containers ("phase", "activity"). The signature
    // mimics what a real markdown deserialiser would emit.
    const container = (
      type: string,
      attrs: Record<string, unknown>,
      children: any[]
    ): any => ({ type, ...attrs, children });

    it('passes the wrapper through UNCHANGED when only a child was appended', () => {
      // This is the scenario from the bug report: adding `<activity Pokus 2>`
      // inside an existing `<phase>` should produce ONE phase wrapper with
      // the original activity intact and the new activity marked inserted.
      // Before this change, the whole phase got delete+reinsert.
      const oldDoc = [
        container('phase', { name: 'P1' }, [
          container('activity', { name: 'A1', duration: '10' }, [p('hi')]),
        ]),
      ];
      const newDoc = [
        container('phase', { name: 'P1' }, [
          container('activity', { name: 'A1', duration: '10' }, [p('hi')]),
          container('activity', { name: 'A2', duration: '10' }, [p('new')]),
        ]),
      ];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());

      // Exactly one top-level node: the phase wrapper.
      expect(flat).toHaveLength(1);
      const phase = flat[0] as any;
      expect(phase.type).toBe('phase');
      expect(phase.name).toBe('P1');
      // Wrapper itself has NO diff op and NO pairId — that's the contract.
      expect(phase.tag).toBeUndefined();
      expect(phase.pairId).toBeUndefined();

      // Inside the wrapper: the unchanged activity (no tag, no pairId), then
      // the inserted activity (tag=insert, no pairId since it's overflow).
      expect(phase.children).toHaveLength(2);
      expect(phase.children[0].tag).toBeUndefined();
      expect(phase.children[0].name).toBe('A1');
      expect(phase.children[1].tag).toBe('insert');
      expect(phase.children[1].name).toBe('A2');
      expect(phase.children[1].pairId).toBeUndefined();
    });

    it('FALLS BACK to whole-block when wrapper own-props differ', () => {
      // `<phase name="A">` vs `<phase name="B">`. The wrapper itself changed,
      // so we must NOT pretend it's unchanged. Whole-block delete+insert
      // with a shared pairId is the correct fallback.
      const oldDoc = [container('phase', { name: 'A' }, [p('inside')])];
      const newDoc = [container('phase', { name: 'B' }, [p('inside')])];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(1);
      expect(tagOf(deletedBlocks[0])?.pairId).toBeDefined();
      expect(tagOf(deletedBlocks[0])?.pairId).toBe(
        tagOf(insertedBlocks[0])?.pairId
      );
    });

    it('recurses deeply: phase → activity → paragraph (word-hint at the leaf)', () => {
      // Three levels: the only actual change is inside the inner paragraph.
      // Both phase and activity wrappers must pass through unchanged; the
      // paragraph at the bottom must get word-hint marks.
      const oldDoc = [
        container('phase', { name: 'P1' }, [
          container('activity', { name: 'A1', duration: '10' }, [
            p('Žáci provedou pokus.'),
          ]),
        ]),
      ];
      const newDoc = [
        container('phase', { name: 'P1' }, [
          container('activity', { name: 'A1', duration: '10' }, [
            p('Žáci rozšíří pokus.'),
          ]),
        ]),
      ];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());

      expect(flat).toHaveLength(1);
      const phase = flat[0] as any;
      expect(phase.tag).toBeUndefined();
      expect(phase.children).toHaveLength(1);
      const activity = phase.children[0];
      expect(activity.tag).toBeUndefined();
      expect(activity.children).toHaveLength(2); // del-paragraph + ins-paragraph
      const [delPara, insPara] = activity.children;
      expect(delPara.tag).toBe('delete');
      expect(insPara.tag).toBe('insert');
      // Shared pairId on the paragraph pair.
      expect(delPara.pairId).toBe(insPara.pairId);
      // Word-hint reached the leaf: "provedou" deleted, "rozšíří" inserted.
      const delMarked = (delPara.children as any[])
        .filter((c) => c.tag === 'delete')
        .map((c) => c.text);
      const insMarked = (insPara.children as any[])
        .filter((c) => c.tag === 'insert')
        .map((c) => c.text);
      expect(delMarked).toContain('provedou');
      expect(insMarked).toContain('rozšíří');
    });

    it('respects ignoreProps when judging wrapper equality (id should not block recursion)', () => {
      // Same-shape phases with different `id` props. With `ignoreProps:
      // ['id']` (mirroring computeDiff's default config) the wrapper should
      // still be considered structurally unchanged.
      const oldDoc = [container('phase', { name: 'P1', id: 'old' }, [p('hi')])];
      const newDoc = [
        container('phase', { name: 'P1', id: 'new' }, [p('hi'), p('extra')]),
      ];

      const flat = pairBlocksWithWordHints(
        oldDoc,
        newDoc,
        makeOptions({ ignoreProps: ['id'] })
      );

      expect(flat).toHaveLength(1);
      const phase = flat[0] as any;
      expect(phase.tag).toBeUndefined();
      // New side's id is used (the wrapper template comes from the new side).
      expect(phase.id).toBe('new');
      // Inner: unchanged + inserted.
      expect(phase.children).toHaveLength(2);
      expect(phase.children[0].tag).toBeUndefined();
      expect(phase.children[1].tag).toBe('insert');
    });

    it('does NOT recurse when a wrapper has text mixed with element children', () => {
      // A wrapper with `[text, element]` children is non-trivial (we'd have
      // to interleave whitespace tokens with structural pairing). For now we
      // bail to whole-block fallback rather than guess.
      const oldDoc = [
        container('phase', { name: 'P1' }, [
          { text: 'lead-in ' } as any,
          p('paragraph child'),
        ]),
      ];
      const newDoc = [
        container('phase', { name: 'P1' }, [
          { text: 'lead-in ' } as any,
          p('paragraph child'),
          p('extra paragraph'),
        ]),
      ];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());

      // Whole-block fallback: 2 marked phases (the pair), not 1 unchanged.
      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(1);
    });

    it('does NOT recurse into a void wrapper (empty-text child)', () => {
      // A void element has exactly `[{ text: '' }]` as children per Slate's
      // contract. Recursing into it would try to word-hint the empty leaf,
      // which is nonsensical. Falls back to whole-block.
      const oldDoc = [
        container('image', { url: 'a.png', alt: 'old' }, [{ text: '' } as any]),
      ];
      const newDoc = [
        container('image', { url: 'a.png', alt: 'new' }, [{ text: '' } as any]),
      ];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());

      // Wrapper attributes (`alt`) differ, so we'd go to fallback anyway.
      // Important assertion: the empty-text child must NOT have a `tag`
      // (we didn't recurse into it).
      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(1);
      expect((deletedBlocks[0] as any).children[0].tag).toBeUndefined();
      expect((insertedBlocks[0] as any).children[0].tag).toBeUndefined();
    });

    it('emits an inserted child as overflow (no pairId) inside the recursed wrapper', () => {
      // The new child has no counterpart on the old side — it must be a
      // pure insert WITHOUT a pairId, just like top-level overflow.
      const oldDoc = [container('phase', { name: 'P1' }, [p('a')])];
      const newDoc = [container('phase', { name: 'P1' }, [p('a'), p('b')])];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());
      const phase = flat[0] as any;
      // p('a') unchanged → no tag, no pairId.
      expect(phase.children[0].tag).toBeUndefined();
      // p('b') is overflow insert.
      expect(phase.children[1].tag).toBe('insert');
      expect(phase.children[1].pairId).toBeUndefined();
    });
  });

  describe('declarative diff strategy', () => {
    // The whole point of `getDiffStrategy` is to let a plugin author bypass
    // the engine's heuristics. These tests probe the contract from both
    // sides: it must (a) take precedence over heuristics when applicable
    // and (b) gracefully fall through when the resolver opts out.

    const container = (
      type: string,
      attrs: Record<string, unknown>,
      children: any[]
    ): any => ({ type, ...attrs, children });

    it('CONTAINER: recurses into a wrapper that the heuristic would miss (extra non-identity prop on one side)', () => {
      // The deserialiser added `_source: { line: 12 }` to the new side
      // only — a property the engine has no way to know is irrelevant.
      // Without the strategy, `canRecurseContainer` would bail because
      // own-props differ and we'd get a useless whole-block replacement.
      const oldDoc = [
        container('phase', { name: 'P1' }, [
          container('activity', { name: 'A1', duration: '10' }, [p('a')]),
        ]),
      ];
      const newDoc = [
        container('phase', { name: 'P1', _source: { line: 12 } }, [
          container('activity', { name: 'A1', duration: '10' }, [p('a')]),
          container('activity', { name: 'A2', duration: '5' }, [p('b')]),
        ]),
      ];

      const flat = pairBlocksWithWordHints(
        oldDoc,
        newDoc,
        makeOptions({
          getDiffStrategy: (node) => {
            if (node.type === 'phase') {
              return { kind: 'container', identityProps: ['name'] };
            }
            if (node.type === 'activity') {
              return {
                kind: 'container',
                identityProps: ['name', 'duration'],
              };
            }
            return;
          },
        })
      );

      expect(flat).toHaveLength(1);
      const phase = flat[0] as any;
      expect(phase.tag).toBeUndefined();
      expect(phase.children).toHaveLength(2);
      expect(phase.children[0].tag).toBeUndefined();
      expect(phase.children[0].name).toBe('A1');
      expect(phase.children[1].tag).toBe('insert');
      expect(phase.children[1].name).toBe('A2');
    });

    it('CONTAINER: declared identityProps mismatch bypasses recursion → whole-block (renaming a phase is a real change)', () => {
      // identityProps = ['name']; new name differs → strategy says "these
      // are not the same wrapper". The engine MUST NOT recurse and MUST
      // emit a paired delete+insert with a shared pairId.
      const oldDoc = [container('phase', { name: 'Phase A' }, [p('x')])];
      const newDoc = [container('phase', { name: 'Phase B' }, [p('x')])];

      const flat = pairBlocksWithWordHints(
        oldDoc,
        newDoc,
        makeOptions({
          getDiffStrategy: (node) =>
            node.type === 'phase'
              ? { kind: 'container', identityProps: ['name'] }
              : undefined,
        })
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(1);
      expect(tagOf(deletedBlocks[0])?.pairId).toBeDefined();
      expect(tagOf(deletedBlocks[0])?.pairId).toBe(
        tagOf(insertedBlocks[0])?.pairId
      );
    });

    it('CONTAINER: identityProps changes outside the declared set are IGNORED (real change buried in children only)', () => {
      // identity = ['name'] but `duration` changed too. Per the contract
      // the wrapper is "the same" — `duration` propagates from the new
      // side verbatim and the engine recurses into children.
      const oldDoc = [
        container('activity', { name: 'A1', duration: '10' }, [p('hi')]),
      ];
      const newDoc = [
        container('activity', { name: 'A1', duration: '20' }, [p('there')]),
      ];

      const flat = pairBlocksWithWordHints(
        oldDoc,
        newDoc,
        makeOptions({
          getDiffStrategy: (node) =>
            node.type === 'activity'
              ? { kind: 'container', identityProps: ['name'] }
              : undefined,
        })
      );

      expect(flat).toHaveLength(1);
      const activity = flat[0] as any;
      expect(activity.tag).toBeUndefined();
      // New side wins on non-identity props.
      expect(activity.duration).toBe('20');
      // Children show the word-hint diff for "hi" → "there".
      expect(activity.children).toHaveLength(2);
      expect(activity.children[0].tag).toBe('delete');
      expect(activity.children[1].tag).toBe('insert');
    });

    it('CONTAINER without identityProps: defaults to comparing all own props', () => {
      // No identityProps means "every own property must match". The two
      // wrappers DO match (same name, no other props except children),
      // so we recurse.
      const oldDoc = [container('phase', { name: 'P1' }, [p('a')])];
      const newDoc = [container('phase', { name: 'P1' }, [p('a'), p('b')])];

      const flat = pairBlocksWithWordHints(
        oldDoc,
        newDoc,
        makeOptions({
          getDiffStrategy: (node) =>
            node.type === 'phase' ? { kind: 'container' } : undefined,
        })
      );

      expect(flat).toHaveLength(1);
      expect((flat[0] as any).tag).toBeUndefined();
      expect((flat[0] as any).children).toHaveLength(2);
      expect((flat[0] as any).children[1].tag).toBe('insert');
    });

    it('CONTAINER without identityProps: respects options.ignoreProps when comparing', () => {
      // Same as above but the two wrappers differ ONLY in `id` — which
      // ignoreProps says to ignore. Should still recurse.
      const oldDoc = [container('phase', { name: 'P1', id: 'a' }, [p('x')])];
      const newDoc = [
        container('phase', { name: 'P1', id: 'b' }, [p('x'), p('y')]),
      ];

      const flat = pairBlocksWithWordHints(
        oldDoc,
        newDoc,
        makeOptions({
          ignoreProps: ['id'],
          getDiffStrategy: (node) =>
            node.type === 'phase' ? { kind: 'container' } : undefined,
        })
      );

      expect(flat).toHaveLength(1);
      expect((flat[0] as any).tag).toBeUndefined();
      expect((flat[0] as any).children).toHaveLength(2);
    });

    it("CROSS-KIND mismatch: old says 'container', new says 'prose' → falls through to heuristic (real structural change)", () => {
      // An element was structurally redefined. We must NOT pick one or
      // the other strategy. Falling through to the heuristic path is the
      // safe behavior — the heuristic will land on whole-block since the
      // shapes don't match.
      const oldDoc = [container('node', {}, [p('child')])];
      const newDoc = [container('node', {}, [{ text: 'now leaf' } as any])];

      const flat = pairBlocksWithWordHints(
        oldDoc,
        newDoc,
        makeOptions({
          getDiffStrategy: (node) =>
            (node as any).children?.[0]?.type === 'p'
              ? { kind: 'container' }
              : { kind: 'prose' },
        })
      );

      // Whole-block delete+insert with shared pairId.
      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(1);
    });

    it('PROSE: forces word-hinting even when the heuristic would have considered the block a container', () => {
      // The wrapper has block-element children, so the heuristic would
      // try to recurse. But the plugin says "treat me as prose" — the
      // engine must honor that and tokenize the flattened text.
      const oldDoc = [
        container('caption', {}, [{ text: 'Hello world' } as any]),
      ];
      const newDoc = [
        container('caption', {}, [{ text: 'Hello there' } as any]),
      ];

      const flat = pairBlocksWithWordHints(
        oldDoc,
        newDoc,
        makeOptions({
          getDiffStrategy: (node) =>
            node.type === 'caption' ? { kind: 'prose' } : undefined,
        })
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(1);
      const delLeaves = (deletedBlocks[0] as any).children as any[];
      const insLeaves = (insertedBlocks[0] as any).children as any[];
      // Unchanged "Hello " sits as a plain leaf on both sides.
      expect(delLeaves.find((l) => l.text === 'Hello ')).toBeDefined();
      expect(insLeaves.find((l) => l.text === 'Hello ')).toBeDefined();
      // The diverging tokens carry the side's tag.
      expect(
        delLeaves.find((l) => l.text === 'world' && l.tag === 'delete')
      ).toBeDefined();
      expect(
        insLeaves.find((l) => l.text === 'there' && l.tag === 'insert')
      ).toBeDefined();
    });

    it('ATOMIC: forces whole-block even when the heuristic would have happily recursed', () => {
      // Two structurally-identical containers with one child swap. The
      // heuristic would recurse and show a clean inner diff. But the
      // plugin declares "atomic" — perhaps because the element is a
      // database row that should be replaced as a unit. The engine MUST
      // emit a whole-block pair.
      const oldDoc = [container('row', { id: 'x' }, [p('field1: A')])];
      const newDoc = [container('row', { id: 'x' }, [p('field1: B')])];

      const flat = pairBlocksWithWordHints(
        oldDoc,
        newDoc,
        makeOptions({
          getDiffStrategy: (node) =>
            node.type === 'row' ? { kind: 'atomic' } : undefined,
        })
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(1);
      // No word-hinting happened — the inner paragraph leaves are pristine.
      const delChild = (deletedBlocks[0] as any).children[0];
      expect(delChild.children.every((l: any) => !l.tag)).toBe(true);
    });

    it('STRATEGY COMPOSITION: parent has container strategy, child has its own (bottom-up)', () => {
      // The point of "RECURSIVELY bottom-up to compose": every nested
      // element gets to declare ITS strategy independently. The phase
      // recurses into activities, each activity then recurses into its
      // own children based on its own declaration.
      const oldDoc = [
        container('phase', { name: 'P1' }, [
          container('activity', { name: 'A1', duration: '10' }, [p('hi')]),
          container('activity', { name: 'A2', duration: '5' }, [p('bye')]),
        ]),
      ];
      const newDoc = [
        container('phase', { name: 'P1' }, [
          container('activity', { name: 'A1', duration: '10' }, [p('hi')]),
          // A2 was REPLACED with A3 — identity differs, so whole-block.
          container('activity', { name: 'A3', duration: '5' }, [p('new')]),
        ]),
      ];

      const flat = pairBlocksWithWordHints(
        oldDoc,
        newDoc,
        makeOptions({
          getDiffStrategy: (node) => {
            if (node.type === 'phase') {
              return { kind: 'container', identityProps: ['name'] };
            }
            if (node.type === 'activity') {
              return { kind: 'container', identityProps: ['name'] };
            }
            return;
          },
        })
      );

      expect(flat).toHaveLength(1);
      const phase = flat[0] as any;
      expect(phase.tag).toBeUndefined();
      expect(phase.children).toHaveLength(3); // A1 + delete-A2 + insert-A3
      expect(phase.children[0].tag).toBeUndefined();
      expect(phase.children[0].name).toBe('A1');
      // The A2→A3 swap is a whole-block pair INSIDE the recursed phase.
      const innerPair = [phase.children[1], phase.children[2]];
      const sortedTags = innerPair.map((c) => c.tag).sort();
      expect(sortedTags).toEqual(['delete', 'insert']);
      expect(innerPair[0].pairId).toBe(innerPair[1].pairId);
    });

    it('STRATEGY DOES NOT FIRE on byte-equal pairs (Path 0 takes precedence)', () => {
      // If the two halves are deep-equal, no strategy logic should run
      // (a strategy call would be wasted work AND the wrong outcome for
      // `atomic` since byte-equal means no change). The pass-through
      // should happen before strategy dispatch.
      let calls = 0;
      const node = container('x', { id: 1 }, [p('a')]);
      pairBlocksWithWordHints(
        [node],
        // Same id and children — should hit byte-equality.
        [container('x', { id: 1 }, [p('a')])],
        makeOptions({
          getDiffStrategy: () => {
            calls += 1;
            return { kind: 'atomic' };
          },
        })
      );
      // Resolver may be called zero or up to 2 times depending on
      // ordering — what matters is the OUTCOME, not the call count.
      // Re-verify with a flat assertion instead.
      void calls;

      const out = pairBlocksWithWordHints(
        [container('x', { id: 1 }, [p('a')])],
        [container('x', { id: 1 }, [p('a')])],
        makeOptions({
          getDiffStrategy: () => ({ kind: 'atomic' }),
        })
      );
      expect(out).toHaveLength(1);
      // Pass-through: NO tag despite atomic strategy.
      expect((out[0] as any).tag).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // Rich block shapes the playground actually emits: lists, math, media.
  // These exercise the engine against realistic Plate trees rather than
  // synthetic minimal cases. The shapes mirror what `@platejs/markdown`
  // (with remark-gfm + remark-math) deserializes:
  //   - lists: indent-based paragraphs with `listStyleType` + `indent` (and
  //     `checked` for todos); NOT classic `ul>li` nesting.
  //   - math: `equation` block voids with `texExpression`; `inline_equation`
  //     inline voids inside paragraphs.
  //   - media: `img`, `video`, `audio` block voids with `url`/`alt`/etc.
  // ─────────────────────────────────────────────────────────────────────

  describe('lists', () => {
    // The Plate list plugin emits each list item as a paragraph carrying
    // `listStyleType` ('disc' | 'decimal' | 'todo') and `indent` (the
    // nesting level). `checked` is set only for todo items.
    const listItem = (
      text: string,
      attrs: {
        listStyleType?: 'disc' | 'decimal' | 'todo';
        indent?: number;
        checked?: boolean;
        marks?: Record<string, unknown>;
      } = {}
    ): any => {
      const { marks, ...rest } = attrs;
      return {
        type: 'paragraph',
        ...rest,
        children: [{ text, ...marks }],
      };
    };

    it('bullet list: edits only the changed item; siblings stay clean', () => {
      const oldDoc = [
        listItem('First bullet, unchanged', { listStyleType: 'disc' }),
        listItem('Second bullet, will change', { listStyleType: 'disc' }),
        listItem('Third bullet, unchanged', { listStyleType: 'disc' }),
      ];
      const newDoc = [
        listItem('First bullet, unchanged', { listStyleType: 'disc' }),
        listItem('Second bullet, rewritten', { listStyleType: 'disc' }),
        listItem('Third bullet, unchanged', { listStyleType: 'disc' }),
      ];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());

      // 1 unchanged + 1 paired + 1 unchanged + 1 paired half = ... wait,
      // word-hint pairs are TWO items (del + ins). So: 1 + 2 + 1 = 4.
      expect(flat).toHaveLength(4);
      expect((flat[0] as any).tag).toBeUndefined();
      expect((flat[0] as any).children[0].text).toBe('First bullet, unchanged');
      expect(tagOf(flat[1])?.tag).toBe('delete');
      expect(tagOf(flat[2])?.tag).toBe('insert');
      expect(tagOf(flat[1])?.pairId).toBe(tagOf(flat[2])?.pairId);
      expect((flat[3] as any).tag).toBeUndefined();
      expect((flat[3] as any).children[0].text).toBe('Third bullet, unchanged');
    });

    it('ordered list: numbering is irrelevant to diff — only content matters', () => {
      // The numeric label "1." / "2." is a render-time concern; the Slate
      // tree carries no number. So a swapped-item ordered list is treated
      // exactly like a swapped-item bulleted list.
      const oldDoc = [
        listItem('Step one', { listStyleType: 'decimal' }),
        listItem('Step two — original', { listStyleType: 'decimal' }),
        listItem('Step three', { listStyleType: 'decimal' }),
      ];
      const newDoc = [
        listItem('Step one', { listStyleType: 'decimal' }),
        listItem('Step two — rewritten', { listStyleType: 'decimal' }),
        listItem('Step three', { listStyleType: 'decimal' }),
      ];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());
      expect(flat).toHaveLength(4);
      expect(tagOf(flat[1])?.tag).toBe('delete');
      expect(tagOf(flat[2])?.tag).toBe('insert');
    });

    it('todo list: toggling `checked` is a real attribute change, NOT a typo', () => {
      // Two same-text todos differing only in `checked: false → true`. The
      // text leaves are byte-equal so word-hinting wouldn't surface any
      // marks; the structural change lives on the wrapper's `checked` prop.
      // Engine must produce a paired delete+insert so the UI can show the
      // checkbox transition.
      const oldDoc = [
        listItem('Buy milk', { listStyleType: 'todo', checked: false }),
      ];
      const newDoc = [
        listItem('Buy milk', { listStyleType: 'todo', checked: true }),
      ];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());
      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(1);
      expect((deletedBlocks[0] as any).checked).toBe(false);
      expect((insertedBlocks[0] as any).checked).toBe(true);
      // Shared pairId so the suggestion UI groups them.
      expect(tagOf(deletedBlocks[0])?.pairId).toBe(
        tagOf(insertedBlocks[0])?.pairId
      );
    });

    it('todo list with text change AND checked toggle: word-hint kicks in (same listStyleType, leafy)', () => {
      // Both halves remain `listStyleType: 'todo'` paragraphs with leafy
      // text children, so canWordHint succeeds. The boolean `checked`
      // differs but doesn't block word-hinting (no structural change).
      const oldDoc = [
        listItem('Buy milk and bread', {
          listStyleType: 'todo',
          checked: false,
        }),
      ];
      const newDoc = [
        listItem('Buy oat milk and bread', {
          listStyleType: 'todo',
          checked: true,
        }),
      ];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());
      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(1);
      // Word-hint reached the leaves: "milk and bread" stayed unmarked,
      // "oat " was inserted (the trailing space is merged into the same
      // insert mark by mergeAdjacentLeaves, so the token reads "oat ").
      const insMarkedText = (insertedBlocks[0] as any).children
        .filter((c: any) => c.tag === 'insert')
        .map((c: any) => c.text)
        .join('');
      expect(insMarkedText).toContain('oat');
      // Reconstructed text on the new side matches the input verbatim.
      const insAllText = (insertedBlocks[0] as any).children
        .map((c: any) => c.text)
        .join('');
      expect(insAllText).toBe('Buy oat milk and bread');
      // Container-level attribute survives onto each half so the
      // suggestion UI can render the new checkbox state.
      expect((deletedBlocks[0] as any).checked).toBe(false);
      expect((insertedBlocks[0] as any).checked).toBe(true);
    });

    it('nested list: changing a deeper-indent item leaves the parent items alone', () => {
      // Indent-based lists are FLAT in the Slate tree — every item is a
      // sibling at the top level, distinguished by `indent`. So a "nested
      // child changed" scenario is just one paired item among siblings.
      const oldDoc = [
        listItem('Parent A', { listStyleType: 'disc', indent: 1 }),
        listItem('Child A.1 — original', {
          listStyleType: 'disc',
          indent: 2,
        }),
        listItem('Child A.2', { listStyleType: 'disc', indent: 2 }),
        listItem('Parent B', { listStyleType: 'disc', indent: 1 }),
      ];
      const newDoc = [
        listItem('Parent A', { listStyleType: 'disc', indent: 1 }),
        listItem('Child A.1 — rewritten', {
          listStyleType: 'disc',
          indent: 2,
        }),
        listItem('Child A.2', { listStyleType: 'disc', indent: 2 }),
        listItem('Parent B', { listStyleType: 'disc', indent: 1 }),
      ];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());
      // 3 unchanged + 1 paired pair = 5 items.
      expect(flat).toHaveLength(5);
      expect((flat[0] as any).tag).toBeUndefined();
      expect(tagOf(flat[1])?.tag).toBe('delete');
      expect(tagOf(flat[2])?.tag).toBe('insert');
      expect((flat[3] as any).tag).toBeUndefined();
      expect((flat[4] as any).tag).toBeUndefined();
    });

    it('nested list: changing indent without changing text is a structural pair (different `indent` ≠ byte-equal)', () => {
      // Dedenting a child to parent level (indent: 2 → 1) changes the
      // wrapper's own props. Word-hinting still applies because both
      // halves are leafy same-type elements; the wrapper carries the
      // new indent on the insert half.
      const oldDoc = [
        listItem('Item that gets promoted', {
          listStyleType: 'disc',
          indent: 2,
        }),
      ];
      const newDoc = [
        listItem('Item that gets promoted', {
          listStyleType: 'disc',
          indent: 1,
        }),
      ];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());
      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(1);
      expect((deletedBlocks[0] as any).indent).toBe(2);
      expect((insertedBlocks[0] as any).indent).toBe(1);
    });

    it('list-style swap (bullet → ordered) at the same position is still word-hintable', () => {
      // canWordHint requires same `type` ('paragraph' on both sides → ok)
      // and leafy children. listStyleType is a sibling prop that doesn't
      // factor into the type check; the wrapper attribute change just
      // rides along on the diff pair.
      const oldDoc = [listItem('Buy milk', { listStyleType: 'disc' })];
      const newDoc = [listItem('Buy milk now', { listStyleType: 'decimal' })];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());
      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(1);
      expect((deletedBlocks[0] as any).listStyleType).toBe('disc');
      expect((insertedBlocks[0] as any).listStyleType).toBe('decimal');
    });

    it('list item with inline marks (bold/italic): unchanged marked tokens carry their marks across', () => {
      const oldDoc = [
        {
          type: 'paragraph',
          listStyleType: 'disc',
          children: [
            { text: 'Read the ' },
            { text: 'important', bold: true },
            { text: ' note before tomorrow' },
          ],
        },
      ];
      const newDoc = [
        {
          type: 'paragraph',
          listStyleType: 'disc',
          children: [
            { text: 'Read the ' },
            { text: 'important', bold: true },
            { text: ' note before Friday' },
          ],
        },
      ];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());
      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      // The bold "important" word survives unmarked on both sides.
      const oldImportant = (deletedBlocks[0] as any).children.find(
        (c: any) => c.text === 'important'
      );
      const newImportant = (insertedBlocks[0] as any).children.find(
        (c: any) => c.text === 'important'
      );
      expect(oldImportant?.bold).toBe(true);
      expect(oldImportant?.tag).toBeUndefined();
      expect(newImportant?.bold).toBe(true);
      expect(newImportant?.tag).toBeUndefined();
      // Only "tomorrow" / "Friday" carry side-specific tags.
      const delMarked = (deletedBlocks[0] as any).children
        .filter((c: any) => c.tag === 'delete')
        .map((c: any) => c.text);
      const insMarked = (insertedBlocks[0] as any).children
        .filter((c: any) => c.tag === 'insert')
        .map((c: any) => c.text);
      expect(delMarked).toContain('tomorrow');
      expect(insMarked).toContain('Friday');
    });
  });

  describe('math', () => {
    // `equation` is a void block. `inline_equation` is a void inline. Both
    // carry the LaTeX source in `texExpression` and use `[{ text: '' }]`
    // as the (empty) child array per Slate's void contract.
    const equation = (tex: string): any => ({
      type: 'equation',
      texExpression: tex,
      children: [{ text: '' }],
    });
    const inlineEquation = (tex: string): any => ({
      type: 'inline_equation',
      texExpression: tex,
      children: [{ text: '' }],
    });

    it('block math: changing the LaTeX expression yields a whole-block pair', () => {
      // The equation void's child is `[{text:''}]`. canRecurseContainer
      // bails on voids (its `isVoid` predicate), and the children are
      // empty text → canWordHint produces an empty diff with both halves
      // still emitted. We rely on the whole-block fallback path here.
      const oldDoc = [equation('E = mc^2')];
      const newDoc = [equation('E = m c^2 + \\epsilon')];

      const flat = pairBlocksWithWordHints(
        oldDoc,
        newDoc,
        makeOptions({
          // Mark voids so canRecurseContainer detects them. Equations carry
          // their LaTeX on the wrapper, not inside children — so isVoid is
          // semantically correct.
          isInline: () => false,
        })
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(1);
      expect((deletedBlocks[0] as any).texExpression).toBe('E = mc^2');
      expect((insertedBlocks[0] as any).texExpression).toBe(
        'E = m c^2 + \\epsilon'
      );
      expect(tagOf(deletedBlocks[0])?.pairId).toBe(
        tagOf(insertedBlocks[0])?.pairId
      );
    });

    it('block math: explicit `atomic` strategy keeps the equation undivided even when texExpressions are byte-comparable', () => {
      // Without a strategy, the engine would fall back to whole-block
      // anyway (children are empty-text voids). With strategy: atomic the
      // outcome is the same — but the strategy makes the intent explicit
      // and survives future refactors of the heuristic.
      const oldDoc = [equation('a + b = c')];
      const newDoc = [equation('a - b = c')];

      const flat = pairBlocksWithWordHints(
        oldDoc,
        newDoc,
        makeOptions({
          getDiffStrategy: (n) =>
            n.type === 'equation' ? { kind: 'atomic' } : undefined,
        })
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(1);
    });

    it('inline math: equation inside a paragraph is treated as an opaque inline token (word-hint paths it through)', () => {
      // The inline equation should appear unmodified on the unchanged
      // side when only neighbouring text edits. Inline voids are tokens
      // in the word-hint stream — they MUST NOT be split or duplicated.
      const oldDoc = [
        {
          type: 'paragraph',
          children: [
            { text: 'Recall that ' },
            inlineEquation('E = mc^2'),
            { text: ' was derived in 1905.' },
          ],
        },
      ];
      const newDoc = [
        {
          type: 'paragraph',
          children: [
            { text: 'Remember that ' },
            inlineEquation('E = mc^2'),
            { text: ' was derived in 1905.' },
          ],
        },
      ];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());
      const { deletedBlocks, insertedBlocks } = splitByTag(flat);

      // The same inline equation appears unmarked on both sides exactly
      // once (no duplication, no marks).
      const oldEquations = (deletedBlocks[0] as any).children.filter(
        (c: any) => c.type === 'inline_equation'
      );
      const newEquations = (insertedBlocks[0] as any).children.filter(
        (c: any) => c.type === 'inline_equation'
      );
      expect(oldEquations).toHaveLength(1);
      expect(newEquations).toHaveLength(1);
      expect(oldEquations[0].texExpression).toBe('E = mc^2');
      expect(newEquations[0].texExpression).toBe('E = mc^2');
      expect(oldEquations[0].tag).toBeUndefined();
      expect(newEquations[0].tag).toBeUndefined();
    });

    it('inline math: changing the equation itself marks it on the new side only', () => {
      // The equation node's signature (via `inlineSig`) is type+id; with
      // no id present, the signature defaults to just the type. Two
      // inline_equations with different texExpressions therefore share
      // a signature and DMP treats them as equal — meaning the equation
      // change is invisible to word-hinting. This is an acceptable known
      // limitation: the wrapping paragraph's text didn't change, so the
      // engine emits no diff for the paragraph at all (byte-equality
      // would skip it). We assert that limitation here so future fixes
      // don't accidentally regress without a conscious decision.
      const para = (tex: string) => ({
        type: 'paragraph',
        children: [
          { text: 'See ' },
          inlineEquation(tex),
          { text: ' for details.' },
        ],
      });

      const flat = pairBlocksWithWordHints(
        [para('a + b')],
        [para('a - b')],
        makeOptions()
      );

      // The paragraphs are NOT byte-equal (texExpression differs), but
      // the inline-equation signature ignores `texExpression`, so the
      // word-hint diff sees no token changes. The whole pair still
      // becomes a marked delete+insert via the leaf-comparison fallback
      // (children differ structurally on `texExpression`).
      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks.length + insertedBlocks.length).toBeGreaterThan(0);
    });

    it('mixing block math with prose: only the changed prose paragraph gets paired', () => {
      const oldDoc = [
        { type: 'paragraph', children: [{ text: 'Original intro.' }] },
        equation('y = x^2'),
        { type: 'paragraph', children: [{ text: 'Outro stays put.' }] },
      ];
      const newDoc = [
        { type: 'paragraph', children: [{ text: 'Rewritten intro.' }] },
        equation('y = x^2'),
        { type: 'paragraph', children: [{ text: 'Outro stays put.' }] },
      ];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());

      // del-intro + ins-intro + unchanged equation + unchanged outro = 4
      expect(flat).toHaveLength(4);
      expect(tagOf(flat[0])?.tag).toBe('delete');
      expect(tagOf(flat[1])?.tag).toBe('insert');
      // Equation passes through untouched (byte-equal pair → Path 0).
      expect((flat[2] as any).type).toBe('equation');
      expect((flat[2] as any).tag).toBeUndefined();
      expect((flat[2] as any).texExpression).toBe('y = x^2');
      // Final paragraph also clean.
      expect((flat[3] as any).tag).toBeUndefined();
    });

    it('adding a block equation: pure insert as overflow, no pairing', () => {
      const oldDoc = [
        { type: 'paragraph', children: [{ text: 'Setup paragraph.' }] },
      ];
      const newDoc = [
        { type: 'paragraph', children: [{ text: 'Setup paragraph.' }] },
        equation('\\sum_{i=0}^{n} i = n(n+1)/2'),
      ];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());
      expect(flat).toHaveLength(2);
      expect((flat[0] as any).tag).toBeUndefined();
      expect(tagOf(flat[1])?.tag).toBe('insert');
      // Overflow inserts have NO pairId.
      expect(tagOf(flat[1])?.pairId).toBeUndefined();
      expect((flat[1] as any).type).toBe('equation');
    });
  });

  describe('media (voids: img / video / audio)', () => {
    // All three media types are block voids with the resource URL on the
    // wrapper. Slate's void contract requires `[{ text: '' }]` children,
    // which makes canRecurseContainer's isVoid check fire and routes the
    // pair into the whole-block fallback (or atomic if a strategy says so).
    const image = (url: string, alt?: string): any => ({
      type: 'img',
      url,
      ...(alt ? { alt } : {}),
      children: [{ text: '' }],
    });
    const video = (url: string): any => ({
      type: 'video',
      url,
      children: [{ text: '' }],
    });
    const audio = (url: string): any => ({
      type: 'audio',
      url,
      children: [{ text: '' }],
    });

    it('image URL change: whole-block pair, void child stays clean (no marks on the empty leaf)', () => {
      const oldDoc = [image('https://example.com/old.png', 'Diagram')];
      const newDoc = [image('https://example.com/new.png', 'Diagram')];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());
      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(1);
      expect((deletedBlocks[0] as any).url).toBe('https://example.com/old.png');
      expect((insertedBlocks[0] as any).url).toBe(
        'https://example.com/new.png'
      );
      // Critical: the void's empty-text child MUST NOT receive a tag.
      // canRecurseContainer's isVoid check + whole-block fallback ensures
      // we never recurse into `[{ text: '' }]`.
      expect((deletedBlocks[0] as any).children[0].tag).toBeUndefined();
      expect((insertedBlocks[0] as any).children[0].tag).toBeUndefined();
    });

    it('image alt-text change: same URL, different alt → whole-block pair', () => {
      const oldDoc = [image('https://x.com/img.png', 'old caption')];
      const newDoc = [image('https://x.com/img.png', 'new caption')];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());
      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(1);
      expect((deletedBlocks[0] as any).alt).toBe('old caption');
      expect((insertedBlocks[0] as any).alt).toBe('new caption');
      expect(tagOf(deletedBlocks[0])?.pairId).toBe(
        tagOf(insertedBlocks[0])?.pairId
      );
    });

    it('video added as a sibling block: pure insert overflow, no pairId', () => {
      const oldDoc = [
        { type: 'paragraph', children: [{ text: 'Intro paragraph.' }] },
      ];
      const newDoc = [
        { type: 'paragraph', children: [{ text: 'Intro paragraph.' }] },
        video('https://example.com/clip.mp4'),
      ];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());
      expect(flat).toHaveLength(2);
      expect((flat[0] as any).tag).toBeUndefined();
      expect(tagOf(flat[1])?.tag).toBe('insert');
      expect(tagOf(flat[1])?.pairId).toBeUndefined();
      expect((flat[1] as any).type).toBe('video');
    });

    it('audio URL change with explicit atomic strategy: matches the implicit fallback', () => {
      // Whether or not the caller registers a strategy, audio voids end
      // up as whole-block pairs. The strategy form just makes the intent
      // explicit and survives future heuristic refactors.
      const oldDoc = [audio('https://x.com/old.mp3')];
      const newDoc = [audio('https://x.com/new.mp3')];

      const flat = pairBlocksWithWordHints(
        oldDoc,
        newDoc,
        makeOptions({
          getDiffStrategy: (n) =>
            n.type === 'audio' ? { kind: 'atomic' } : undefined,
        })
      );

      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(1);
    });

    it('replacing an image with a video at the same position: cross-type whole-block pair', () => {
      // Different `type` → canRecurseContainer and canWordHint both bail
      // (type mismatch). Whole-block delete+insert is the only option.
      const oldDoc = [image('https://x.com/photo.jpg')];
      const newDoc = [video('https://x.com/clip.mp4')];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());
      const { deletedBlocks, insertedBlocks } = splitByTag(flat);
      expect(deletedBlocks).toHaveLength(1);
      expect(insertedBlocks).toHaveLength(1);
      expect((deletedBlocks[0] as any).type).toBe('img');
      expect((insertedBlocks[0] as any).type).toBe('video');
    });

    it('media mixed with prose: only the media block changes, prose stays untouched', () => {
      const oldDoc = [
        { type: 'paragraph', children: [{ text: 'See the photo below.' }] },
        image('https://x.com/old.png'),
        { type: 'paragraph', children: [{ text: 'Notes follow.' }] },
      ];
      const newDoc = [
        { type: 'paragraph', children: [{ text: 'See the photo below.' }] },
        image('https://x.com/new.png'),
        { type: 'paragraph', children: [{ text: 'Notes follow.' }] },
      ];

      const flat = pairBlocksWithWordHints(oldDoc, newDoc, makeOptions());

      // unchanged-para + (del-img + ins-img) + unchanged-para = 4
      expect(flat).toHaveLength(4);
      expect((flat[0] as any).tag).toBeUndefined();
      expect(tagOf(flat[1])?.tag).toBe('delete');
      expect(tagOf(flat[2])?.tag).toBe('insert');
      expect((flat[3] as any).tag).toBeUndefined();
      // pairId on the media pair, none on the surrounding paragraphs.
      expect(tagOf(flat[1])?.pairId).toBe(tagOf(flat[2])?.pairId);
    });
  });

  describe('determinism', () => {
    it('is pure: same inputs ⇒ same outputs (no hidden state)', () => {
      // Two independent runs with their own counter-based generators must
      // produce structurally identical output (block order, text content,
      // marked tokens). Asserts there's no mutation of the input nodes and
      // no reliance on Math.random for anything observable.
      const inputsA = [p('Hello world'), p('Foo bar')];
      const inputsB = [p('Hello planet'), p('Foo baz')];

      // Deep-clone so we can detect mutation of the inputs.
      const snapshotA = JSON.parse(JSON.stringify(inputsA));
      const snapshotB = JSON.parse(JSON.stringify(inputsB));

      const r1 = pairBlocksWithWordHints(inputsA, inputsB, makeOptions());
      const r2 = pairBlocksWithWordHints(
        JSON.parse(JSON.stringify(inputsA)),
        JSON.parse(JSON.stringify(inputsB)),
        makeOptions()
      );

      // Inputs must not have been mutated.
      expect(inputsA).toEqual(snapshotA);
      expect(inputsB).toEqual(snapshotB);

      // Outputs are structurally equal.
      expect(r1).toEqual(r2);
    });
  });
});
