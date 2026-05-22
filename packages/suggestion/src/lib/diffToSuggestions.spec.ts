import { createSlateEditor } from 'platejs';

import { BaseSuggestionPlugin } from './BaseSuggestionPlugin';
import { diffToSuggestions } from './diffToSuggestions';
import { getInlineSuggestionData } from './utils/getSuggestionId';

const createSuggestionEditor = () =>
  createSlateEditor({
    plugins: [
      BaseSuggestionPlugin.configure({
        options: {
          currentUserId: 'user-1',
        },
      }),
    ],
  });

describe('diffToSuggestions', () => {
  it('marks inserted text and leaves untouched text alone', () => {
    const editor = createSuggestionEditor();

    const value = diffToSuggestions(
      editor,
      [{ type: 'p', children: [{ text: 'a' }] }],
      [{ type: 'p', children: [{ text: 'ab' }] }]
    );

    expect(value[0].children).toHaveLength(2);
    expect(value[0].children[0]).toEqual({ text: 'a' });
    expect(value[0].children[1]).toMatchObject({
      suggestion: true,
      text: 'b',
    });
    expect(getInlineSuggestionData(value[0].children[1] as any)).toMatchObject({
      type: 'insert',
      userId: 'user-1',
    });
  });

  it('reuses the same id and timestamp for adjacent remove and insert replacements', () => {
    const editor = createSuggestionEditor();

    const value = diffToSuggestions(
      editor,
      [{ type: 'p', children: [{ text: 'ab' }] }],
      [{ type: 'p', children: [{ text: 'ac' }] }]
    );

    const removed = value[0].children[1];
    const inserted = value[0].children[2];
    const removedData = getInlineSuggestionData(removed as any)!;
    const insertedData = getInlineSuggestionData(inserted as any)!;

    expect(removed).toMatchObject({ suggestion: true, text: 'b' });
    expect(inserted).toMatchObject({ suggestion: true, text: 'c' });
    expect(removedData.type).toBe('remove');
    expect(insertedData.type).toBe('insert');
    expect(insertedData.id).toBe(removedData.id);
    expect(insertedData.createdAt).toBe(removedData.createdAt);
  });

  it('recursively traverses nested element children', () => {
    const editor = createSuggestionEditor();

    const value = diffToSuggestions(
      editor,
      [
        {
          type: 'blockquote',
          children: [{ type: 'p', children: [{ text: 'a' }] }],
        },
      ],
      [
        {
          type: 'blockquote',
          children: [{ type: 'p', children: [{ text: 'ab' }] }],
        },
      ]
    );

    const inserted = ((value[0] as any).children[0] as any).children[1];

    expect(inserted).toMatchObject({
      suggestion: true,
      text: 'b',
    });
    expect(getInlineSuggestionData(inserted)).toMatchObject({
      type: 'insert',
      userId: 'user-1',
    });
  });

  it('keeps separate replacement groups distinct when they are not adjacent', () => {
    const editor = createSuggestionEditor();

    const value = diffToSuggestions(
      editor,
      [
        { type: 'p', children: [{ text: 'ab' }] },
        { type: 'p', children: [{ text: 'cd' }] },
      ],
      [
        { type: 'p', children: [{ text: 'ac' }] },
        { type: 'p', children: [{ text: 'ce' }] },
      ]
    );

    const firstRemovedData = getInlineSuggestionData(
      value[0].children[1] as any
    )!;
    const firstInsertedData = getInlineSuggestionData(
      value[0].children[2] as any
    )!;
    const secondRemovedData = getInlineSuggestionData(
      value[1].children[1] as any
    )!;
    const secondInsertedData = getInlineSuggestionData(
      value[1].children[2] as any
    )!;

    expect(firstInsertedData.id).toBe(firstRemovedData.id);
    expect(secondInsertedData.id).toBe(secondRemovedData.id);
    expect(firstInsertedData.id).not.toBe(secondInsertedData.id);
  });

  /**
   * The next describe block targets the new block-granularity flow which
   * pairs whole top-level blocks instead of doing inline character diffs.
   * These tests are designed to catch bugs that only surface end-to-end —
   * e.g. forgetting to wire the pairId through, or unifyAdjacentSuggestionIds
   * not handling the insert-first leaf order.
   *
   * Implementation detail to keep in mind when reading these tests:
   *
   *   - For an ELEMENT node, `getSuggestionProps` writes the suggestion data
   *     under the literal `suggestion` key as `{ id, createdAt, type, ... }`.
   *   - For a TEXT leaf, it writes `suggestion: true` plus
   *     `suggestion_<id>: { id, createdAt, type, ... }` (the id is part of
   *     the key so multiple suggestions can coexist on the same leaf).
   *
   * Both forms must reference the SAME id for a paired delete+insert block.
   */
  describe('block granularity', () => {
    const blockSuggestionId = (block: any): string | undefined =>
      block?.suggestion && typeof block.suggestion === 'object'
        ? block.suggestion.id
        : undefined;

    const leafSuggestionIds = (block: any): string[] => {
      const ids: string[] = [];
      for (const child of block?.children ?? []) {
        const k = Object.keys(child ?? {}).find((x) =>
          x.startsWith('suggestion_')
        );
        if (k) {
          const data = (child as any)[k];
          if (data?.id) ids.push(data.id as string);
        }
      }
      return ids;
    };

    it('marks both halves of a paragraph rewrite with the SAME suggestion id', () => {
      const editor = createSuggestionEditor();

      const value = diffToSuggestions(
        editor,
        [{ type: 'p', children: [{ text: 'Hello world' }] }],
        [{ type: 'p', children: [{ text: 'Hello planet' }] }],
        { granularity: 'block', pairOrder: 'insert-first' } as any
      );

      // 2 blocks total: insert first, delete second.
      expect(value).toHaveLength(2);
      const id0 = blockSuggestionId(value[0]);
      const id1 = blockSuggestionId(value[1]);
      expect(id0).toBeDefined();
      expect(id1).toBeDefined();
      // Both halves of the paired block share one suggestion id — this is
      // the contract the accept/reject UI relies on.
      expect(id0).toBe(id1);

      // Block roles match the requested pair order: insert above delete.
      expect((value[0] as any).suggestion.type).toBe('insert');
      expect((value[1] as any).suggestion.type).toBe('remove');
    });

    it('emits different suggestion ids for two independent paragraph rewrites', () => {
      const editor = createSuggestionEditor();

      const value = diffToSuggestions(
        editor,
        [
          { type: 'p', children: [{ text: 'first old' }] },
          { type: 'p', children: [{ text: 'second old' }] },
        ],
        [
          { type: 'p', children: [{ text: 'first new' }] },
          { type: 'p', children: [{ text: 'second new' }] },
        ],
        { granularity: 'block' } as any
      );

      const ids = (value as any[]).map(blockSuggestionId);
      const unique = Array.from(new Set(ids));
      // Exactly 2 distinct pair ids, each appearing twice (delete + insert).
      expect(unique).toHaveLength(2);
      for (const id of unique) {
        expect(ids.filter((x) => x === id)).toHaveLength(2);
      }
    });

    it('word-hint leaves inside paired blocks inherit the SAME pairId', () => {
      const editor = createSuggestionEditor();

      const value = diffToSuggestions(
        editor,
        [{ type: 'p', children: [{ text: 'one two three' }] }],
        [{ type: 'p', children: [{ text: 'one TWO three' }] }],
        { granularity: 'block' } as any
      );

      // Two top-level blocks: the deleted paragraph and the inserted one.
      // The block-level mark uses `suggestion: { id, ... }`; inner word
      // hint leaves use `suggestion_<id>` keys. The id MUST match across
      // both — otherwise accepting/rejecting one word would leave the block
      // in an inconsistent state.
      const blockId = blockSuggestionId(value[0]);
      expect(blockId).toBeDefined();

      const leafIds = leafSuggestionIds(value[0]);
      // At least one leaf must carry a word-level mark.
      expect(leafIds.length).toBeGreaterThan(0);
      for (const id of leafIds) {
        expect(id).toBe(blockId);
      }
    });

    it('keeps inline-granularity behavior identical when opts are omitted', () => {
      // Caller-facing regression target: not passing the new options must
      // produce byte-for-byte the same value the original test asserted.
      const editor = createSuggestionEditor();
      const valueA = diffToSuggestions(
        editor,
        [{ type: 'p', children: [{ text: 'ab' }] }],
        [{ type: 'p', children: [{ text: 'ac' }] }]
      );
      const valueB = diffToSuggestions(
        editor,
        [{ type: 'p', children: [{ text: 'ab' }] }],
        [{ type: 'p', children: [{ text: 'ac' }] }],
        { granularity: 'inline' } as any
      );

      // We can't compare suggestion ids (they're nanoid-random). Strip the
      // random pieces from both forms (text `suggestion_<id>` keys AND
      // element `suggestion: {...}` data) before comparing.
      const stripIds = (node: any): any => {
        if (Array.isArray(node)) return node.map(stripIds);
        if (node && typeof node === 'object') {
          const out: any = {};
          for (const [k, v] of Object.entries(node)) {
            if (k.startsWith('suggestion_')) {
              const { id: _id, createdAt: _ca, ...rest } = v as any;
              out.suggestion_X = stripIds(rest);
            } else if (k === 'suggestion' && v && typeof v === 'object') {
              const { id: _id, createdAt: _ca, ...rest } = v as any;
              out.suggestion = stripIds(rest);
            } else {
              out[k] = stripIds(v);
            }
          }
          return out;
        }
        return node;
      };

      expect(stripIds(valueA)).toEqual(stripIds(valueB));
    });

    it('pair across two adjacent paragraphs does NOT bleed into a third unchanged paragraph', () => {
      // [old: A1, S, B1] vs [new: A2, S, B2]: two independent pairs around
      // an unchanged paragraph "S". The two pairs must NOT share an id;
      // the unchanged paragraph "S" must not pick up either.
      const editor = createSuggestionEditor();
      const value = diffToSuggestions(
        editor,
        [
          { type: 'p', children: [{ text: 'A1' }] },
          { type: 'p', children: [{ text: 'STAY' }] },
          { type: 'p', children: [{ text: 'B1' }] },
        ],
        [
          { type: 'p', children: [{ text: 'A2' }] },
          { type: 'p', children: [{ text: 'STAY' }] },
          { type: 'p', children: [{ text: 'B2' }] },
        ],
        { granularity: 'block', pairOrder: 'insert-first' } as any
      );

      // Find the unchanged paragraph and assert it has no block-level
      // suggestion data and no leaf-level suggestion data.
      const stay = (value as any[]).find(
        (n) => n.children?.[0]?.text === 'STAY'
      );
      expect(stay).toBeDefined();
      expect(blockSuggestionId(stay)).toBeUndefined();
      expect(leafSuggestionIds(stay)).toHaveLength(0);

      // Collect block-level suggestion ids on changed paragraphs; we should
      // see exactly 2 distinct pair ids.
      const changedIds = (value as any[])
        .filter((n) => n.children?.[0]?.text !== 'STAY')
        .map(blockSuggestionId);
      const unique = Array.from(new Set(changedIds));
      expect(unique).toHaveLength(2);
    });
  });
});
