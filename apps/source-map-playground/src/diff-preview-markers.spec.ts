/**
 * Tests for the diff-aware list marker stamper in `diff-preview.tsx`.
 *
 * The renderer doesn't display literal "1." / "2." digits in the JSON
 * tree — they're computed at render time from sibling context plus each
 * item's `diffOperation`. We rely on a side-effect: the stamper mutates
 * each list item with a `_marker` field that the React renderer reads.
 * Asserting against `_marker` lets us pin down the numbering rule
 * without spinning up jsdom + RTL just to inspect strings.
 *
 * Key behaviour under test:
 *   - delete halves carry the OLD ordinal (their position in the OLD doc),
 *   - insert halves carry the NEW ordinal,
 *   - unchanged items advance both counters in lockstep,
 *   - bullet/todo items show fixed glyphs regardless of diff side.
 */

// Import the stamper indirectly: it's not exported, so we re-implement
// the contract here by importing the public `DiffPreview` component and
// reading `_marker` after a no-op render. Simpler: pull the stamper out
// of the module by reaching for it through a Symbol-key escape hatch?
// No — the cleanest approach is to call `DiffPreview` from a real test
// renderer. But that pulls in React DOM. We instead test through the
// PUBLIC behaviour: build a diff tree by hand, call DiffPreview, and
// then read `_marker` from the same input tree (the stamper mutates
// in place). All we need from React is to invoke the component once.

import { DiffPreview } from './diff-preview';

// Minimal "render once" — DiffPreview is a function component with no
// side-effects beyond stamping markers on its `nodes` prop. Calling it
// as a plain function executes the stamper synchronously. We don't
// inspect the returned JSX.
const stamp = (nodes: any[]): void => {
  DiffPreview({ nodes } as any);
};

const listItem = (
  text: string,
  attrs: {
    listStyleType?: 'disc' | 'decimal' | 'todo';
    indent?: number;
    checked?: boolean;
    diff?: 'insert' | 'delete';
    pairId?: string;
  } = {}
): any => {
  const { diff, pairId, ...rest } = attrs;
  return {
    type: 'paragraph',
    listStyleType: rest.listStyleType ?? 'disc',
    indent: rest.indent ?? 1,
    ...rest,
    ...(diff ? { diffOperation: { type: diff } } : {}),
    ...(pairId ? { pairId } : {}),
    children: [{ text }],
  };
};

describe('diff-preview list markers', () => {
  it('decimal: unchanged items count 1, 2, 3...', () => {
    const nodes = [
      listItem('A', { listStyleType: 'decimal' }),
      listItem('B', { listStyleType: 'decimal' }),
      listItem('C', { listStyleType: 'decimal' }),
    ];
    stamp(nodes);
    expect(nodes.map((n) => n._marker)).toEqual([
      { kind: 'decimal', index: 1 },
      { kind: 'decimal', index: 2 },
      { kind: 'decimal', index: 3 },
    ]);
  });

  it('decimal with insert-first pair: paired halves share the same number', () => {
    // Models the screenshot scenario: item 2 was rewritten. With
    // pairOrder='insert-first' the diff emits [insert, delete] at
    // position 2. Both halves should display "2".
    const nodes = [
      listItem('První', { listStyleType: 'decimal' }), // unchanged
      listItem('Druhý new', {
        listStyleType: 'decimal',
        diff: 'insert',
        pairId: 'p1',
      }),
      listItem('Druhý old', {
        listStyleType: 'decimal',
        diff: 'delete',
        pairId: 'p1',
      }),
      listItem('Třetí', { listStyleType: 'decimal' }), // unchanged
    ];
    stamp(nodes);
    const indices = nodes.map((n) => (n._marker as any).index);
    expect(indices).toEqual([1, 2, 2, 3]);
  });

  it('decimal with delete-first pair: paired halves still share the same number (symmetric to insert-first)', () => {
    const nodes = [
      listItem('První', { listStyleType: 'decimal' }),
      listItem('Druhý old', {
        listStyleType: 'decimal',
        diff: 'delete',
        pairId: 'p1',
      }),
      listItem('Druhý new', {
        listStyleType: 'decimal',
        diff: 'insert',
        pairId: 'p1',
      }),
      listItem('Třetí', { listStyleType: 'decimal' }),
    ];
    stamp(nodes);
    const indices = nodes.map((n) => (n._marker as any).index);
    expect(indices).toEqual([1, 2, 2, 3]);
  });

  it('decimal with pure insert (no delete counterpart): insert ticks new, subsequent unchanged shows new position', () => {
    // Before: 1.A, 2.C
    // After:  1.A, 2.B (inserted), 3.C
    const nodes = [
      listItem('A', { listStyleType: 'decimal' }),
      listItem('B (new)', {
        listStyleType: 'decimal',
        diff: 'insert',
      }),
      listItem('C', { listStyleType: 'decimal' }),
    ];
    stamp(nodes);
    const indices = nodes.map((n) => (n._marker as any).index);
    // A → new=1, old=1, display=1.
    // B → insert: new=2, old=1, display=new=2.
    // C → unchanged: new=3, old=2, display=new=3 (its post-diff position).
    expect(indices).toEqual([1, 2, 3]);
  });

  it('decimal with pure delete: delete shows its OLD position; unchanged after picks up the NEW position', () => {
    // Before: 1.A, 2.B, 3.C
    // After:  1.A, 2.C  (B was removed)
    // The diff sequence (insert-first) is: A, delete-B, C.
    const nodes = [
      listItem('A', { listStyleType: 'decimal' }),
      listItem('B (removed)', {
        listStyleType: 'decimal',
        diff: 'delete',
      }),
      listItem('C', { listStyleType: 'decimal' }),
    ];
    stamp(nodes);
    const indices = nodes.map((n) => (n._marker as any).index);
    // A → new=1, old=1, display=1.
    // delete-B → old=2, new=1, display=old=2.
    // C → unchanged: new=2, old=3, display=new=2.
    expect(indices).toEqual([1, 2, 2]);
  });

  it('non-list block between items resets counters', () => {
    const nodes = [
      listItem('A', { listStyleType: 'decimal' }),
      listItem('B', { listStyleType: 'decimal' }),
      { type: 'paragraph', children: [{ text: 'interrupting paragraph' }] },
      listItem('C', { listStyleType: 'decimal' }),
      listItem('D', { listStyleType: 'decimal' }),
    ];
    stamp(nodes);
    expect((nodes[0]._marker as any).index).toBe(1);
    expect((nodes[1]._marker as any).index).toBe(2);
    expect(nodes[2]._marker).toBeUndefined();
    // Counter resets after the non-list block.
    expect((nodes[3]._marker as any).index).toBe(1);
    expect((nodes[4]._marker as any).index).toBe(2);
  });

  it('mixed disc + decimal: switching style at the same indent resets the new style', () => {
    const nodes = [
      listItem('one', { listStyleType: 'decimal' }),
      listItem('two', { listStyleType: 'decimal' }),
      listItem('bullet a', { listStyleType: 'disc' }),
      listItem('bullet b', { listStyleType: 'disc' }),
      listItem('three', { listStyleType: 'decimal' }),
    ];
    stamp(nodes);
    expect((nodes[0]._marker as any).index).toBe(1);
    expect((nodes[1]._marker as any).index).toBe(2);
    expect(nodes[2]._marker.kind).toBe('disc');
    expect(nodes[3]._marker.kind).toBe('disc');
    // Bullet items at the same indent dropped the decimal counter. The
    // following decimal restarts.
    expect((nodes[4]._marker as any).index).toBe(1);
  });

  it('nested decimal: deeper indent counts independently from outer indent', () => {
    const nodes = [
      listItem('Parent 1', { listStyleType: 'decimal', indent: 1 }),
      listItem('Child 1.1', { listStyleType: 'decimal', indent: 2 }),
      listItem('Child 1.2', { listStyleType: 'decimal', indent: 2 }),
      listItem('Parent 2', { listStyleType: 'decimal', indent: 1 }),
      listItem('Child 2.1', { listStyleType: 'decimal', indent: 2 }),
    ];
    stamp(nodes);
    expect((nodes[0]._marker as any).index).toBe(1); // outer
    expect((nodes[1]._marker as any).index).toBe(1); // inner restart
    expect((nodes[2]._marker as any).index).toBe(2); // inner continues
    expect((nodes[3]._marker as any).index).toBe(2); // outer continues
    // Popping back to outer cleared inner counter; new inner run starts.
    expect((nodes[4]._marker as any).index).toBe(1);
  });

  it('todo: marker carries the checked state regardless of diff side', () => {
    const nodes = [
      listItem('a', { listStyleType: 'todo', checked: false }),
      listItem('b', { listStyleType: 'todo', checked: true }),
      listItem('c', {
        listStyleType: 'todo',
        checked: true,
        diff: 'insert',
      }),
      listItem('d', {
        listStyleType: 'todo',
        checked: false,
        diff: 'delete',
      }),
    ];
    stamp(nodes);
    expect(nodes[0]._marker).toEqual({ kind: 'todo', checked: false });
    expect(nodes[1]._marker).toEqual({ kind: 'todo', checked: true });
    expect(nodes[2]._marker).toEqual({ kind: 'todo', checked: true });
    expect(nodes[3]._marker).toEqual({ kind: 'todo', checked: false });
  });

  it('disc: marker is a fixed bullet regardless of diff side or position', () => {
    const nodes = [
      listItem('a', { listStyleType: 'disc' }),
      listItem('b', { listStyleType: 'disc', diff: 'insert' }),
      listItem('c', { listStyleType: 'disc', diff: 'delete' }),
      listItem('d', { listStyleType: 'disc' }),
    ];
    stamp(nodes);
    for (const n of nodes) {
      expect(n._marker).toEqual({ kind: 'disc' });
    }
  });

  describe('authored start numbers (listStart from markdown deserializer)', () => {
    // `deserializeMd` stamps `listStart: 4` on `4. test`, `listStart: 5` on
    // the next item, and so on. The stamper must honor those rather than
    // resetting to 1 each run.
    const orderedItem = (
      text: string,
      listStart: number,
      attrs: { diff?: 'insert' | 'delete'; indent?: number } = {}
    ): any => ({
      type: 'paragraph',
      indent: attrs.indent ?? 1,
      listStyleType: 'decimal',
      listStart,
      ...(attrs.diff ? { diffOperation: { type: attrs.diff } } : {}),
      children: [{ text }],
    });

    it('honors listStart on consecutive items (4, 5, 6 stays 4, 5, 6)', () => {
      // Bug case from the screenshot: `4. test / 5. sad / 6. dad`.
      const nodes = [
        orderedItem('test', 4),
        orderedItem('sad', 5),
        orderedItem('dad', 6),
      ];
      stamp(nodes);
      expect(nodes.map((n) => (n._marker as any).index)).toEqual([4, 5, 6]);
    });

    it('honors listStart for pure inserts (full list pasted, all marked insert)', () => {
      // Activity rewrite case: the user inserted a fresh ordered list
      // starting at 4. Every item is `diffOperation: 'insert'` with its
      // own listStart from the after-doc.
      const nodes = [
        orderedItem('test', 4, { diff: 'insert' }),
        orderedItem('sad', 5, { diff: 'insert' }),
        orderedItem('dad', 6, { diff: 'insert' }),
      ];
      stamp(nodes);
      expect(nodes.map((n) => (n._marker as any).index)).toEqual([4, 5, 6]);
    });

    it('mixed run: nested disc items between ordered items preserves their start numbers', () => {
      // The full screenshot case end-to-end:
      //   4. test         (insert, decimal indent 1)
      //   5. sad          (insert, decimal indent 1)
      //   6. dad          (insert, decimal indent 1)
      //      - sad        (insert, disc indent 2)
      //      - super sad  (insert, disc indent 2)
      const nodes = [
        orderedItem('test', 4, { diff: 'insert' }),
        orderedItem('sad', 5, { diff: 'insert' }),
        orderedItem('dad', 6, { diff: 'insert' }),
        {
          type: 'paragraph',
          indent: 2,
          listStyleType: 'disc',
          diffOperation: { type: 'insert' },
          children: [{ text: 'sad' }],
        },
        {
          type: 'paragraph',
          indent: 2,
          listStyleType: 'disc',
          diffOperation: { type: 'insert' },
          children: [{ text: 'super sad' }],
        },
      ];
      stamp(nodes);
      expect((nodes[0]._marker as any).index).toBe(4);
      expect((nodes[1]._marker as any).index).toBe(5);
      expect((nodes[2]._marker as any).index).toBe(6);
      expect(nodes[3]._marker).toEqual({ kind: 'disc' });
      expect(nodes[4]._marker).toEqual({ kind: 'disc' });
    });

    it('paired diff halves: each half uses listStart from its OWN document', () => {
      // OLD doc:  1. A,  2. C
      // NEW doc:  1. A,  2. B (inserted),  3. C
      // Diff (insert-first): unchanged A, insert B, unchanged C with the
      // engine renumbering C in the NEW frame. Each item still carries
      // listStart from its source doc.
      const nodes = [
        orderedItem('A', 1),
        orderedItem('B', 2, { diff: 'insert' }),
        orderedItem('C', 3),
      ];
      stamp(nodes);
      expect(nodes.map((n) => (n._marker as any).index)).toEqual([1, 2, 3]);
    });

    it('falls back to dual-counter when listStart is absent (legacy fixtures)', () => {
      // Sanity: a pre-existing fixture without listStart still numbers
      // 1, 2, 3 via the counter — the new logic is additive.
      const nodes = [
        listItem('a', { listStyleType: 'decimal' }),
        listItem('b', { listStyleType: 'decimal' }),
        listItem('c', { listStyleType: 'decimal' }),
      ];
      stamp(nodes);
      expect(nodes.map((n) => (n._marker as any).index)).toEqual([1, 2, 3]);
    });
  });
});
