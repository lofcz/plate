/**
 * End-to-end test for the MDX add-activity preset with the declarative
 * strategy wired in via `lessonPlanDiffStrategy`. Locks in the exact
 * playground behaviour so regressions show up here, not in screenshots.
 */
import { computeDiff } from '@platejs/diff';
import { createPlateEditor } from 'platejs/react';
import type { Value } from 'platejs';

import { deserializeMd, EDITOR_PLUGINS } from './editor';
import { lessonPlanDiffStrategy } from './lesson-plan';

const BEFORE = `<phase name="Uvědomění">
  <activity name="Pokus 1" duration="10">
    Žáci provedou základní experiment podle pracovního listu.
  </activity>
</phase>`;

const AFTER = `<phase name="Uvědomění">
  <activity name="Pokus 1" duration="10">
    Žáci provedou základní experiment podle pracovního listu.
  </activity>

  <activity name="Pokus 2" duration="10">
    Žáci rozšíří experiment a porovnají výsledky se skupinou vedle.
  </activity>
</phase>`;

const computeWithStrategy = () => {
  const editor = createPlateEditor({
    plugins: EDITOR_PLUGINS,
    value: [{ type: 'p', children: [{ text: '' }] }] as Value,
  });
  const beforeNodes = deserializeMd(editor, BEFORE) as any[];
  const afterNodes = deserializeMd(editor, AFTER) as any[];

  let pc = 0;
  const diff = computeDiff(beforeNodes, afterNodes, {
    isInline: editor.api.isInline,
    ignoreProps: ['id'],
    granularity: 'block',
    pairOrder: 'insert-first',
    generatePairId: () => `p${++pc}`,
    getDiffStrategy: lessonPlanDiffStrategy,
  });

  return { beforeNodes, afterNodes, diff };
};

describe('lesson-plan diff strategy (e2e via deserializeMd)', () => {
  it('add-activity: one unchanged phase, inner activity unchanged, new activity marked insert', () => {
    const { diff } = computeWithStrategy();
    const tree = diff as any[];

    expect(tree).toHaveLength(1);
    const phase = tree[0];
    expect(phase.type).toBe('lesson_phase');
    expect(phase.name).toBe('Uvědomění');
    // Wrapper is unchanged — no diffOperation, no pairId.
    expect(phase.diffOperation).toBeUndefined();
    expect(phase.pairId).toBeUndefined();

    expect(phase.children).toHaveLength(2);
    const [first, second] = phase.children;

    // First activity: byte-equal to old side → pristine.
    expect(first.type).toBe('lesson_activity');
    expect(first.name).toBe('Pokus 1');
    expect(first.duration).toBe(10);
    expect(first.diffOperation).toBeUndefined();

    // Second activity: overflow insert.
    expect(second.type).toBe('lesson_activity');
    expect(second.name).toBe('Pokus 2');
    expect(second.duration).toBe(10);
    expect(second.diffOperation?.type).toBe('insert');
    // Overflow insert carries NO pairId (no counterpart on the old side).
    expect(second.pairId).toBeUndefined();
  });

  it('rename phase: whole-block delete + insert with shared pairId', () => {
    // Identity = ['name']; renaming the phase MUST surface as a real
    // structural change, not a child edit. Use block-form MDX (newlines +
    // indented body text) so remark-mdx parses both `<phase>` and
    // `<activity>` as flow elements rather than inline JSX inside a
    // paragraph.
    const editor = createPlateEditor({
      plugins: EDITOR_PLUGINS,
      value: [{ type: 'p', children: [{ text: '' }] }] as Value,
    });
    const before = deserializeMd(
      editor,
      `<phase name="Old">
  <activity name="A1" duration="5">
    sample text
  </activity>
</phase>`
    ) as any[];
    const after = deserializeMd(
      editor,
      `<phase name="New">
  <activity name="A1" duration="5">
    sample text
  </activity>
</phase>`
    ) as any[];

    let pc = 0;
    const diff = computeDiff(before, after, {
      isInline: editor.api.isInline,
      ignoreProps: ['id'],
      granularity: 'block',
      pairOrder: 'insert-first',
      generatePairId: () => `p${++pc}`,
      getDiffStrategy: lessonPlanDiffStrategy,
    }) as any[];

    expect(diff).toHaveLength(2);
    const inserts = diff.filter((n) => n.diffOperation?.type === 'insert');
    const deletes = diff.filter((n) => n.diffOperation?.type === 'delete');
    expect(inserts).toHaveLength(1);
    expect(deletes).toHaveLength(1);
    expect(inserts[0].name).toBe('New');
    expect(deletes[0].name).toBe('Old');
    expect(inserts[0].pairId).toBe(deletes[0].pairId);
    expect(inserts[0].pairId).toBeDefined();
  });

  it('change activity duration (NOT in identityProps for phase, IS in identityProps for activity): produces a whole-block activity swap', () => {
    // phase identity = ['name'], activity identity = ['name', 'duration'].
    // Same phase wrapper (unchanged + recurse) but the activity's
    // duration changed → activity is structurally a different one.
    const editor = createPlateEditor({
      plugins: EDITOR_PLUGINS,
      value: [{ type: 'p', children: [{ text: '' }] }] as Value,
    });
    const before = deserializeMd(
      editor,
      `<phase name="P">
  <activity name="A1" duration="5">
    sample text
  </activity>
</phase>`
    ) as any[];
    const after = deserializeMd(
      editor,
      `<phase name="P">
  <activity name="A1" duration="10">
    sample text
  </activity>
</phase>`
    ) as any[];

    let pc = 0;
    const diff = computeDiff(before, after, {
      isInline: editor.api.isInline,
      ignoreProps: ['id'],
      granularity: 'block',
      pairOrder: 'insert-first',
      generatePairId: () => `p${++pc}`,
      getDiffStrategy: lessonPlanDiffStrategy,
    }) as any[];

    // ONE phase wrapper, unchanged.
    expect(diff).toHaveLength(1);
    const phase = diff[0];
    expect(phase.type).toBe('lesson_phase');
    expect(phase.diffOperation).toBeUndefined();
    expect(phase.children).toHaveLength(2);
    // Inside: insert-first ordering → [insert-activity-d10, delete-activity-d5].
    expect(phase.children[0].diffOperation?.type).toBe('insert');
    expect(phase.children[0].duration).toBe(10);
    expect(phase.children[1].diffOperation?.type).toBe('delete');
    expect(phase.children[1].duration).toBe(5);
    expect(phase.children[0].pairId).toBe(phase.children[1].pairId);
  });
});
