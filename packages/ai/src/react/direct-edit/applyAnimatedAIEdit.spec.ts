import { createPlateEditor } from 'platejs/react';
import type { Value } from 'platejs';
import { AIChangesPlugin } from './AIChangesPlugin';
import { getAIChangeLedger } from './aiChanges';
import { applyAnimatedAIEdit } from './applyAnimatedAIEdit';
import { diffAIEdit } from './diffAIEdit';

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

const summary = (before: Value, after: Value) =>
  diffAIEdit(before, after).map((group) => ({
    at: [...(group.ancestors.at(-1)?.[1] ?? []), group.afterIndex],
    kind: group.kind,
  }));

describe('structural diff', () => {
  it('finds three distant word edits top to bottom', () => {
    expect(
      summary(
        [p('a one'), p('x'), p('b two'), p('y'), p('c three')],
        [p('A one'), p('x'), p('B two'), p('y'), p('C three')]
      )
    ).toEqual([
      { at: [0], kind: 'text' },
      { at: [2], kind: 'text' },
      { at: [4], kind: 'text' },
    ]);
  });
  it('recurses into sections', () => {
    expect(
      summary(
        [phase(p('a x'), p('b'), p('c x'))],
        [phase(p('A x'), p('b'), p('C x'))]
      )
    ).toEqual([
      { at: [0, 0], kind: 'text' },
      { at: [0, 2], kind: 'text' },
    ]);
  });
  it('handles repeated paragraphs and duplicate insertions', () => {
    expect(summary([p('same'), p('same')], [p('same'), p('changed')])).toEqual([
      { at: [1], kind: 'replace' },
    ]);
    expect(summary([p('same')], [p('same'), p('same')])).toEqual([
      { at: [1], kind: 'insert' },
    ]);
  });
  it('does not touch paragraphs shifted by an insertion or deletion', () => {
    expect(summary([p('a'), p('b')], [p('new'), p('a'), p('b')])).toEqual([
      { at: [0], kind: 'insert' },
    ]);
    expect(summary([p('a'), p('b')], [p('b')])).toEqual([
      { at: [0], kind: 'remove' },
    ]);
  });
  it('reports rewritten words and removed words', () => {
    const [group] = diffAIEdit(
      [p('The cat sat on the mat.')],
      [p('The dog sat on the rug.')]
    );
    expect(group.kind).toBe('text');
    expect(group.text).toEqual({
      inserted: [
        [4, 7],
        [19, 23],
      ],
      removed: 'cat mat.',
    });
  });
  it('treats low-similarity rewrites as block replacements', () => {
    expect(
      summary([p('alpha beta gamma')], [p('entirely different words')])
    ).toEqual([{ at: [0], kind: 'replace' }]);
  });
});

describe('canonical before value', () => {
  it('promotes changes to the nearest live ancestor that lines up', async () => {
    const editor = createPlateEditor({
      value: [
        p('intro'),
        { type: 'quote', children: [p('inner a'), p('inner b')] } as any,
      ],
    });
    const beforeValue = [p('intro'), phase(p('inner a'), p('inner b'))];
    const after = [p('intro'), phase(p('inner a'), p('inner CHANGED'))];
    const intro = editor.children[0];
    const edit = applyAnimatedAIEdit(editor, after, {
      beforeValue,
      reducedMotion: true,
    });
    await edit.finished;
    expect(editor.children[0]).toBe(intro);
    expect(editor.children[1]).toMatchObject(after[1]);
    expect(edit.changes.map((change) => change.item.kind)).toEqual(['replace']);
  });
});

describe('change tracking', () => {
  const tracked = (value: Value) =>
    createPlateEditor({ plugins: [AIChangesPlugin], value });
  const ledgerOf = (editor: ReturnType<typeof tracked>) =>
    getAIChangeLedger(editor);
  const edit = (
    editor: ReturnType<typeof tracked>,
    value: Value,
    session = 's1'
  ) =>
    applyAnimatedAIEdit(editor, value, { reducedMotion: true, session })
      .finished;

  it('merges edits within a session and reverts to the pre-session content', async () => {
    const editor = tracked([p('one two three'), p('keep')]);
    await edit(editor, [p('one TWO three'), p('keep')]);
    await edit(editor, [p('one TWO THREE'), p('keep')]);
    const changes = ledgerOf(editor).changes;
    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe('text');
    editor.getApi(AIChangesPlugin).aiChanges.reject(changes[0].id);
    expect(editor.api.string([0])).toBe('one two three');
    expect(ledgerOf(editor).changes).toHaveLength(0);
    editor.tf.undo();
    expect(editor.api.string([0])).toBe('one TWO THREE');
  });

  it('restores removed blocks and removes inserted ones on reject', async () => {
    const editor = tracked([p('a'), p('b'), p('c')]);
    await edit(editor, [p('a'), p('c'), p('new')]);
    const api = editor.getApi(AIChangesPlugin).aiChanges;
    expect(api.list().map((change) => change.kind)).toEqual([
      'remove',
      'insert',
    ]);
    api.rejectAll();
    expect(
      editor.children.map((node) => editor.api.string(node as any))
    ).toEqual(['a', 'b', 'c']);
  });

  it('accepting keeps content and clears the change', async () => {
    const editor = tracked([p('a'), p('b')]);
    await edit(editor, [p('a'), p('b'), p('c')]);
    const api = editor.getApi(AIChangesPlugin).aiChanges;
    api.accept(api.list()[0].id);
    expect(api.list()).toHaveLength(0);
    expect(editor.children).toHaveLength(3);
    await edit(editor, [p('a'), p('b'), p('c'), p('d')]);
    expect(api.list()).toHaveLength(1);
    expect(api.list()[0].removed).toHaveLength(0);
  });

  it('a user edit inside a change accepts it; elsewhere it does not', async () => {
    const editor = tracked([p('first words'), p('second words')]);
    await edit(editor, [p('FIRST words'), p('SECOND words')]);
    expect(ledgerOf(editor).changes).toHaveLength(2);
    editor.tf.insertText('!', { at: { path: [1, 0], offset: 0 } });
    expect(
      ledgerOf(editor).changes.map((change) => change.refs[0].current)
    ).toEqual([[0]]);
  });

  it('a new session accepts earlier changes', async () => {
    const editor = tracked([p('a x'), p('b x')]);
    await edit(editor, [p('A x'), p('b x')], 's1');
    await edit(editor, [p('A x'), p('B x')], 's2');
    const changes = ledgerOf(editor).changes;
    expect(changes).toHaveLength(1);
    expect(changes[0].refs[0].current).toEqual([1]);
  });

  it('undoing the AI edit drops its changes', async () => {
    const editor = tracked([p('a'), p('b')]);
    await edit(editor, [p('a'), p('new'), p('b')]);
    expect(ledgerOf(editor).changes).toHaveLength(1);
    editor.tf.undo();
    expect(ledgerOf(editor).changes).toHaveLength(0);
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
