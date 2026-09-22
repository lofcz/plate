import { createPlateEditor } from 'platejs/react';
import type { Value } from 'platejs';
import { applyAnimatedAIEdit, getAIEditPaths } from './applyAnimatedAIEdit';

const p = (text: string) => ({ type: 'p', children: [{ text }] });
const phase = (...children: ReturnType<typeof p>[]) => ({
  type: 'phase',
  children,
});
const run = (editor: ReturnType<typeof createPlateEditor>, value: Value) =>
  applyAnimatedAIEdit(editor, value, { reducedMotion: true });

describe('direct AI edits', () => {
  it('commits one normal undoable transaction and restores redo exactly', async () => {
    const before = [p('first'), p('middle'), p('last')];
    const editor = createPlateEditor({ value: structuredClone(before) });
    const original = structuredClone(editor.children);
    const after = [p('FIRST'), p('MIDDLE'), p('LAST')];
    await run(editor, after).finished;
    const committed = structuredClone(editor.children);
    expect(editor.history.undos).toHaveLength(1);
    editor.tf.undo();
    expect(editor.children).toEqual(original);
    editor.tf.redo();
    expect(editor.children).toEqual(committed);
  });
  it('keeps manual edits and successive AI edits in separate history batches', async () => {
    const editor = createPlateEditor({ value: [p('old')] });
    editor.tf.insertText('!', { at: { path: [0, 0], offset: 3 } });
    await run(editor, [p('one')]).finished;
    await run(editor, [p('two')]).finished;
    editor.tf.undo();
    expect(editor.api.string([])).toBe('one');
    editor.tf.undo();
    expect(editor.api.string([])).toBe('old!');
    editor.tf.undo();
    expect(editor.api.string([])).toBe('old');
  });
  it('does not add history for an unchanged document or mutate caller values', async () => {
    const editor = createPlateEditor({ value: [p('old')] });
    const value = structuredClone(editor.children);
    await run(editor, value).finished;
    expect(editor.history.undos).toHaveLength(0);
    expect(value).toEqual(editor.children);
  });
  it('preserves nested formatting, unicode, and atomic empty-document deletion', async () => {
    const editor = createPlateEditor({ value: [p('old')] });
    const value = [
      phase({
        type: 'p',
        children: [{ text: 'Žáci 👨‍👩‍👦', bold: true } as any],
      }),
    ];
    await run(editor, value).finished;
    expect(editor.children[0].children[0]).toMatchObject(value[0].children[0]);
    await run(editor, []).finished;
    expect(editor.api.string([])).toBe('');
    editor.tf.undo();
    expect(editor.api.string([])).toContain('Žáci');
  });
  it('preserves unaffected node identities and the user selection', async () => {
    const editor = createPlateEditor({ value: [p('change'), p('keep')] });
    editor.tf.select({ path: [1, 0], offset: 2 });
    const untouched = editor.children[1];
    await run(editor, [p('changed'), p('keep')]).finished;
    expect(editor.children[1]).toBe(untouched);
    expect(editor.selection?.anchor).toEqual({ path: [1, 0], offset: 2 });
    expect(
      editor.history.undos[0].operations.some((op) => op.type === 'remove_node')
    ).toBe(false);
  });
  it('separates the following manual keystroke from AI history', async () => {
    const editor = createPlateEditor({ value: [p('old')] });
    await run(editor, [p('new')]).finished;
    editor.tf.insertText('!', { at: { path: [0, 0], offset: 3 } });
    editor.tf.undo();
    expect(editor.api.string([])).toBe('new');
    editor.tf.undo();
    expect(editor.api.string([])).toBe('old');
  });
  it('aborted playback still commits the entire document', async () => {
    const editor = createPlateEditor({ value: [p('old')] });
    const controller = new AbortController();
    controller.abort();
    await applyAnimatedAIEdit(editor, [p('new')], { signal: controller.signal })
      .finished;
    expect(editor.api.string([])).toBe('new');
    expect(editor.history.undos).toHaveLength(1);
  });
});

describe('persisted properties', () => {
  it('commits list numbering and custom property-only changes', async () => {
    const editor = createPlateEditor({
      value: [{ ...p('list'), listStart: 1, _custom: 'old' }],
    });
    await run(editor, [{ ...p('list'), listStart: 5, _custom: 'new' }])
      .finished;
    expect(editor.children[0]).toMatchObject({ listStart: 5, _custom: 'new' });
    editor.tf.undo();
    expect(editor.children[0]).toMatchObject({ listStart: 1, _custom: 'old' });
  });
});

describe('changed region ordering', () => {
  it('finds three distant regions top to bottom', () => {
    expect(
      getAIEditPaths(
        [p('a'), p('x'), p('b'), p('y'), p('c')],
        [p('A'), p('x'), p('B'), p('y'), p('C')]
      )
    ).toEqual([[0], [2], [4]]);
  });
  it('recurses into preparation sections', () => {
    expect(
      getAIEditPaths(
        [phase(p('a'), p('b'), p('c'))],
        [phase(p('A'), p('b'), p('C'))]
      )
    ).toEqual([
      [0, 0],
      [0, 2],
    ]);
  });
  it('handles repeated paragraphs and duplicate insertions', () => {
    expect(
      getAIEditPaths([p('same'), p('same')], [p('same'), p('changed')])
    ).toEqual([[1]]);
    expect(getAIEditPaths([p('same')], [p('same'), p('same')])).toEqual([[1]]);
  });
  it('does not animate unchanged paragraphs shifted by insertion', () => {
    expect(
      getAIEditPaths([p('a'), p('b')], [p('new'), p('a'), p('b')])
    ).toEqual([[0]]);
  });
  it('reveals a neighboring region after deletion', () => {
    expect(getAIEditPaths([p('a'), p('b')], [p('b')])).toEqual([[0]]);
    expect(getAIEditPaths([p('a'), p('b')], [p('a')])).toEqual([[0]]);
  });
});

describe('mixed structural edit stress', () => {
  it('round-trips 100 deterministic insert/delete/reorder/format transactions', async () => {
    const clean = (value: unknown) =>
      JSON.parse(
        JSON.stringify(value, (key, item) => (key === 'id' ? undefined : item))
      );
    let seed = 42;
    const random = (n: number) => {
      seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
      return seed % n;
    };
    const document = (): Value =>
      Array.from({ length: 1 + random(8) }, () => ({
        type: random(3) ? 'p' : 'h2',
        children: [
          {
            text: ['same', 'Hello 👋', 'Žáci', 'other'][random(4)],
            ...(random(2) ? { bold: true } : {}),
          },
        ],
      }));
    for (let i = 0; i < 100; i++) {
      const before = document();
      const after = document();
      const editor = createPlateEditor({ value: before });
      const baseline = clean(editor.children);
      await run(editor, after).finished;
      expect(clean(editor.children)).toEqual(
        clean(createPlateEditor({ value: after }).children)
      );
      if (JSON.stringify(baseline) !== JSON.stringify(clean(editor.children))) {
        editor.tf.undo();
        expect(clean(editor.children)).toEqual(baseline);
        editor.tf.redo();
        expect(clean(editor.children)).toEqual(
          clean(createPlateEditor({ value: after }).children)
        );
      }
    }
  });
});
