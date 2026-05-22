import { transformDiffDescendants } from './transformDiffDescendants';

const options = {
  getDeleteProps: () => ({
    diff: true,
    diffOperation: { type: 'delete' },
  }),
  getInsertProps: () => ({
    diff: true,
    diffOperation: { type: 'insert' },
  }),
  getUpdateProps: (_node: any, properties: any, newProperties: any) => ({
    diff: true,
    diffOperation: {
      newProperties,
      properties,
      type: 'update',
    },
  }),
  isInline: () => false,
} as any;

describe('transformDiffDescendants', () => {
  it('passes through the next nodes when delete/insert differs only by ignored props', () => {
    const stringCharMapping = {
      stringToNodes: (value: string) =>
        value === 'a'
          ? [{ type: 'p', id: 'old', children: [{ text: 'same' }] }]
          : [{ type: 'p', id: 'new', children: [{ text: 'same' }] }],
    };

    expect(
      transformDiffDescendants(
        [
          [-1, 'a'],
          [1, 'b'],
        ] as any,
        {
          ...options,
          ignoreProps: ['id'],
          stringCharMapping,
        } as any
      )
    ).toEqual([
      {
        type: 'p',
        id: 'new',
        children: [{ text: 'same' }],
      },
    ]);
  });

  it('flushes buffered deletions before later insertions around unchanged nodes', () => {
    const stringCharMapping = {
      stringToNodes: (value: string) =>
        ({
          a: [{ type: 'p', children: [{ text: 'delete' }] }],
          b: [{ type: 'p', children: [{ text: 'insert' }] }],
          c: [{ type: 'p', children: [{ text: 'stay' }] }],
        })[value],
    };

    expect(
      transformDiffDescendants(
        [
          [-1, 'a'],
          [0, 'c'],
          [1, 'b'],
        ] as any,
        {
          ...options,
          stringCharMapping,
        } as any
      )
    ).toEqual([
      {
        type: 'p',
        children: [{ text: 'delete' }],
        diff: true,
        diffOperation: { type: 'delete' },
      },
      {
        type: 'p',
        children: [{ text: 'stay' }],
      },
      {
        type: 'p',
        children: [{ text: 'insert' }],
        diff: true,
        diffOperation: { type: 'insert' },
      },
    ]);
  });

  it('uses text transforms for text-only replace pairs', () => {
    const stringCharMapping = {
      stringToNodes: (value: string) =>
        ({
          a: [{ text: 'old' }],
          b: [{ text: 'new' }],
        })[value],
    };

    expect(
      transformDiffDescendants(
        [
          [-1, 'a'],
          [1, 'b'],
        ] as any,
        {
          ...options,
          stringCharMapping,
        } as any
      )
    ).toEqual([
      {
        text: 'old',
        diff: true,
        diffOperation: { type: 'delete' },
      },
      {
        text: 'new',
        diff: true,
        diffOperation: { type: 'insert' },
      },
    ]);
  });

  /**
   * The following tests exercise the new block-granularity branch. They
   * deliberately go around `pairBlocksWithWordHints` (already covered in its
   * own spec) by feeding `transformDiffDescendants` a simple stub that just
   * tags each block with delete/insert + pairId — that way these tests
   * isolate the buffer-order and dispatch logic of `transformDiffDescendants`
   * itself.
   */
  describe('block granularity', () => {
    const stringCharMapping = {
      stringToNodes: (value: string) =>
        ({
          a: [{ type: 'p', children: [{ text: 'OLD-A' }] }],
          b: [{ type: 'p', children: [{ text: 'NEW-B' }] }],
          c: [{ type: 'p', children: [{ text: 'STAY' }] }],
        })[value],
    };

    it('emits one delete-block then one insert-block in delete-first order (default)', () => {
      const result = transformDiffDescendants(
        [
          [-1, 'a'],
          [1, 'b'],
        ] as any,
        {
          ...options,
          granularity: 'block',
          generatePairId: () => 'pair-1',
          getDeleteProps: (_n: any, ctx: any) => ({
            diff: true,
            diffOperation: { type: 'delete' },
            pairId: ctx?.pairId,
          }),
          getInsertProps: (_n: any, ctx: any) => ({
            diff: true,
            diffOperation: { type: 'insert' },
            pairId: ctx?.pairId,
          }),
          stringCharMapping,
        } as any
      );

      // Delete-first by default; both halves carry the same pairId.
      expect(result.map((n: any) => n.diffOperation.type)).toEqual([
        'delete',
        'insert',
      ]);
      expect(result.map((n: any) => n.pairId)).toEqual(['pair-1', 'pair-1']);
    });

    it('reverses the order to insert-above-delete when pairOrder = insert-first', () => {
      const result = transformDiffDescendants(
        [
          [-1, 'a'],
          [1, 'b'],
        ] as any,
        {
          ...options,
          granularity: 'block',
          pairOrder: 'insert-first',
          generatePairId: () => 'pair-1',
          getDeleteProps: (_n: any, ctx: any) => ({
            diff: true,
            diffOperation: { type: 'delete' },
            pairId: ctx?.pairId,
          }),
          getInsertProps: (_n: any, ctx: any) => ({
            diff: true,
            diffOperation: { type: 'insert' },
            pairId: ctx?.pairId,
          }),
          stringCharMapping,
        } as any
      );

      expect(result.map((n: any) => n.diffOperation.type)).toEqual([
        'insert',
        'delete',
      ]);
      // pairId still matches across both halves.
      expect(result[0].pairId).toBe(result[1].pairId);
    });

    it('flushes any preceding inline-buffer before block-mode pair output', () => {
      // Sequence: [del a] [common c] [ins b]. The unchanged block must be
      // emitted at its correct position. Block-mode bypasses the
      // delete/insert buffers (its pair list is pre-ordered), but it must
      // still call flushBuffers() so any inline pair from an earlier chunk
      // doesn't get stranded above the unchanged block.
      const result = transformDiffDescendants(
        [
          [-1, 'a'],
          [0, 'c'],
          [1, 'b'],
        ] as any,
        {
          ...options,
          granularity: 'block',
          pairOrder: 'insert-first',
          stringCharMapping,
        } as any
      );

      // Without a paired insert immediately after the delete, the delete is
      // a STANDALONE delete (no pairing). Then the unchanged "STAY" block
      // flushes. Then the trailing insert is standalone. Visible order:
      //   [del OLD-A, common STAY, ins NEW-B]
      expect(result.map((n: any) => n.children[0].text)).toEqual([
        'OLD-A',
        'STAY',
        'NEW-B',
      ]);
    });

    it('does not pair when delete/insert chunks are equal under ignoreProps', () => {
      // Block-mode must respect the short-circuit "isEqual" path so we
      // don't emit a fake-looking pair for id-only changes.
      const sCM = {
        stringToNodes: (value: string) =>
          value === 'a'
            ? [{ type: 'p', id: 'old', children: [{ text: 'same' }] }]
            : [{ type: 'p', id: 'new', children: [{ text: 'same' }] }],
      };

      const result = transformDiffDescendants(
        [
          [-1, 'a'],
          [1, 'b'],
        ] as any,
        {
          ...options,
          granularity: 'block',
          ignoreProps: ['id'],
          stringCharMapping: sCM,
        } as any
      );

      // Only one node (the "next" one), no delete leaked through.
      expect(result).toHaveLength(1);
      expect((result[0] as any).id).toBe('new');
      expect((result[0] as any).diff).toBeUndefined();
    });

    it('inline-granularity path is unchanged when granularity is unset', () => {
      // Regression target: callers that don't opt-in must see byte-for-byte
      // the old behavior. We hand the same input as the basic text test
      // above and assert identical output.
      const sCM = {
        stringToNodes: (value: string) =>
          ({
            a: [{ text: 'old' }],
            b: [{ text: 'new' }],
          })[value],
      };
      const result = transformDiffDescendants(
        [
          [-1, 'a'],
          [1, 'b'],
        ] as any,
        {
          ...options,
          stringCharMapping: sCM,
        } as any
      );

      expect(result).toEqual([
        { text: 'old', diff: true, diffOperation: { type: 'delete' } },
        { text: 'new', diff: true, diffOperation: { type: 'insert' } },
      ]);
    });
  });
});
