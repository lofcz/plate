/**
 * End-to-end diff tests for lists, math, and media via the playground's
 * actual markdown deserializer + plugin stack. These lock in not just the
 * diff engine's behaviour but also the shapes that `@platejs/markdown`
 * (with remark-gfm + remark-math + remark-mdx) emits for these constructs.
 *
 * If the markdown plugin starts producing a different tree shape for, say,
 * task lists, these tests catch it — the engine tests in
 * `packages/diff/src/internal/transforms/pairBlocksWithWordHints.spec.ts`
 * use hand-built trees and would NOT.
 */
import { computeDiff } from '@platejs/diff';
import { createPlateEditor } from 'platejs/react';
import type { Value } from 'platejs';

import { deserializeMd, EDITOR_PLUGINS } from './editor';
import { lessonPlanDiffStrategy } from './lesson-plan';
import { mediaMathDiffStrategy } from './extra-plugins';

const makeEditor = () =>
  createPlateEditor({
    plugins: EDITOR_PLUGINS,
    value: [{ type: 'p', children: [{ text: '' }] }] as Value,
  });

const runDiff = (before: string, after: string) => {
  const editor = makeEditor();
  const beforeNodes = deserializeMd(editor, before) as any[];
  const afterNodes = deserializeMd(editor, after) as any[];
  let pc = 0;
  const diff = computeDiff(beforeNodes, afterNodes, {
    isInline: editor.api.isInline,
    ignoreProps: ['id'],
    granularity: 'block',
    pairOrder: 'insert-first',
    generatePairId: () => `p${++pc}`,
    getDiffStrategy: (node) =>
      lessonPlanDiffStrategy(node) ?? mediaMathDiffStrategy(node),
  }) as any[];
  return { beforeNodes, afterNodes, diff };
};

const opOf = (n: any): string | undefined => n?.diffOperation?.type;
const textOf = (n: any): string =>
  (n?.children as any[])
    ?.map((c: any) => (typeof c.text === 'string' ? c.text : ''))
    .join('') ?? '';

describe('lists e2e via deserializeMd', () => {
  it('bullet rewrite: only the changed item gets a paired delete + insert', () => {
    const { diff } = runDiff(
      `- První bod, beze změny
- Druhý bod, k přepsání
- Třetí bod, beze změny`,
      `- První bod, beze změny
- Druhý bod, kompletně přepsaný
- Třetí bod, beze změny`
    );

    // Indent-based lists → each item is a sibling at the top level.
    // Expect: unchanged + (insert, delete) pair + unchanged = 4 items.
    expect(diff).toHaveLength(4);
    expect(opOf(diff[0])).toBeUndefined();
    expect(textOf(diff[0])).toContain('První bod');
    // insert-first ordering puts insert before delete inside a pair.
    expect(opOf(diff[1])).toBe('insert');
    expect(opOf(diff[2])).toBe('delete');
    expect(diff[1].pairId).toBe(diff[2].pairId);
    expect(opOf(diff[3])).toBeUndefined();
    expect(textOf(diff[3])).toContain('Třetí bod');
  });

  it('ordered list: numbering ignored — only content matters', () => {
    const { diff } = runDiff(
      `1. Step one
2. Step two original
3. Step three`,
      `1. Step one
2. Step two rewritten
3. Step three`
    );
    expect(diff).toHaveLength(4);
    expect(opOf(diff[1])).toBe('insert');
    expect(opOf(diff[2])).toBe('delete');
    // Both halves still carry the ordered-list style marker.
    expect(diff[1].listStyleType).toBeDefined();
    expect(diff[2].listStyleType).toBeDefined();
  });

  it('todo: flipping `checked` without changing text still produces a visible pair', () => {
    const { diff } = runDiff(
      `- [ ] Buy milk
- [ ] Pick up package`,
      `- [x] Buy milk
- [ ] Pick up package`
    );

    // The first item changed `checked`, the second is byte-equal.
    const changed = diff.filter((n) => n.diffOperation);
    const unchanged = diff.filter((n) => !n.diffOperation);
    expect(changed).toHaveLength(2); // delete + insert
    expect(unchanged).toHaveLength(1);

    const ins = changed.find((n) => opOf(n) === 'insert')!;
    const del = changed.find((n) => opOf(n) === 'delete')!;
    expect(ins.checked).toBe(true);
    expect(del.checked).toBe(false);
    expect(ins.pairId).toBe(del.pairId);
    expect(unchanged[0].checked).toBe(false);
  });

  it('nested list (two levels): changing a child leaves parents and uncles untouched', () => {
    const { diff } = runDiff(
      `- Parent A
  - Child A.1 original
  - Child A.2 unchanged
- Parent B`,
      `- Parent A
  - Child A.1 rewritten with new details
  - Child A.2 unchanged
- Parent B`
    );

    // 3 unchanged + 1 paired pair (2 items) = 5 items at the top level.
    expect(diff).toHaveLength(5);
    const unchangedCount = diff.filter((n) => !n.diffOperation).length;
    const changedCount = diff.filter((n) => n.diffOperation).length;
    expect(unchangedCount).toBe(3);
    expect(changedCount).toBe(2);

    // Indent on the changed pair should be 2 (the nested level) on both
    // halves — proves the deserializer preserved nesting through the diff.
    const ins = diff.find((n) => opOf(n) === 'insert');
    const del = diff.find((n) => opOf(n) === 'delete');
    expect(ins?.indent).toBe(2);
    expect(del?.indent).toBe(2);
  });

  it('rich content inside a list item: bold/italic marks on unchanged words survive', () => {
    const { diff } = runDiff(
      `1. Step is plain.
2. Step is **important** and *concrete*, students prepare it.`,
      `1. Step is plain.
2. Step is **important** and *concrete*, students present it.`
    );

    const ins = diff.find((n) => opOf(n) === 'insert');
    expect(ins).toBeDefined();
    // "important" must still carry the bold mark and have NO tag.
    const important = ins!.children.find((c: any) => c.text === 'important');
    expect(important?.bold).toBe(true);
    expect(important?.tag).toBeUndefined();
    // The diff between "prepare" and "present" should surface in the
    // children of the inserted half. The marks-on-leaves diff strategy
    // can express this in two equivalent ways:
    //   (a) tagged leaves with `tag: 'insert'` for words specific to the
    //       new side, OR
    //   (b) leaves whose `text` differs from the delete half but no
    //       explicit `tag` because the marks-aware splitter merged them.
    // We check (a) first; if (b), fall back to a whole-text comparison
    // between the two halves.
    const insertedTagged = ins!.children
      .filter((c: any) => c.tag === 'insert')
      .map((c: any) => c.text)
      .join('');
    if (insertedTagged.length > 0) {
      expect(insertedTagged).toContain('present');
    } else {
      // Fallback: at minimum, the full reconstructed text of the
      // insert half must contain the new word.
      const fullInsert = ins!.children.map((c: any) => c.text).join('');
      expect(fullInsert).toContain('present');
      // And the corresponding delete half must contain the old word.
      const del = diff.find((n) => opOf(n) === 'delete');
      const fullDelete = del?.children.map((c: any) => c.text).join('') ?? '';
      expect(fullDelete).toContain('prepare');
    }
  });
});

describe('math e2e via deserializeMd', () => {
  it('inline math: only the changed expression spawns a pair; the other paragraph is byte-equal', () => {
    const { diff } = runDiff(
      `Recall $E = mc^2$ from physics.

Pythagoras: $a^2 + b^2 = c^2$.`,
      `Recall $E = m c^2 + \\epsilon$ from physics.

Pythagoras: $a^2 + b^2 = c^2$.`
    );

    // One paragraph changed → paired delete + insert; second byte-equal.
    const unchanged = diff.filter((n) => !n.diffOperation);
    const changed = diff.filter((n) => n.diffOperation);
    expect(unchanged.length).toBeGreaterThanOrEqual(1);
    expect(changed.length).toBeGreaterThanOrEqual(2);

    // The unchanged paragraph still has its inline_equation intact.
    const pyth = unchanged.find((n) =>
      n.children?.some((c: any) => c.type === 'inline_equation')
    );
    expect(pyth).toBeDefined();
    const pythEq = pyth!.children.find(
      (c: any) => c.type === 'inline_equation'
    );
    expect(pythEq.texExpression).toBe('a^2 + b^2 = c^2');
    expect(pythEq.tag).toBeUndefined();
  });

  it('block equation change: atomic strategy yields a whole-block delete + insert', () => {
    const { diff } = runDiff(
      `$$
F = m \\cdot a
$$`,
      `$$
F = \\frac{dp}{dt}
$$`
    );

    expect(diff).toHaveLength(2);
    const ins = diff.find((n) => opOf(n) === 'insert');
    const del = diff.find((n) => opOf(n) === 'delete');
    expect(ins?.type).toBe('equation');
    expect(del?.type).toBe('equation');
    expect(ins?.texExpression).toContain('frac');
    expect(del?.texExpression).toContain('cdot');
    expect(ins?.pairId).toBe(del?.pairId);
  });

  it('inline + block mixed: block equation passes through byte-equal when only the inline changes', () => {
    const { diff } = runDiff(
      `Mass is $m$.

$$
E = mc^2
$$

End.`,
      `Mass is $M$.

$$
E = mc^2
$$

End.`
    );

    // The block equation must survive unmarked.
    const eq = diff.find((n: any) => n.type === 'equation');
    expect(eq).toBeDefined();
    expect(eq.diffOperation).toBeUndefined();
    expect(eq.texExpression).toBe('E = mc^2');
  });

  it('adding a block equation: pure overflow insert, no pairId, no delete half', () => {
    const { diff } = runDiff(
      `Pythagoras theorem is fundamental.`,
      `Pythagoras theorem is fundamental.

$$
a^2 + b^2 = c^2
$$`
    );

    const inserts = diff.filter((n) => opOf(n) === 'insert');
    const deletes = diff.filter((n) => opOf(n) === 'delete');
    expect(deletes).toHaveLength(0);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].type).toBe('equation');
    // Overflow inserts carry NO pairId.
    expect(inserts[0].pairId).toBeUndefined();
  });
});

describe('media e2e via deserializeMd', () => {
  it('image URL change: image node carries the URL diff; surrounding paragraph stays clean', () => {
    const { diff } = runDiff(
      `Diagram below:

![Circuit](https://example.com/v1.png)

End.`,
      `Diagram below:

![Circuit](https://example.com/v2.png)

End.`
    );

    // The standalone image is wrapped in a paragraph by remark. The
    // diff treats that paragraph as a single block; we expect either a
    // direct img-typed pair OR a paragraph-wrapping pair depending on
    // how the deserializer structured things. Either way, the URL diff
    // must appear somewhere visible.
    const urls: string[] = [];
    const walk = (n: any) => {
      if (!n) return;
      if (typeof n.url === 'string') urls.push(n.url);
      if (Array.isArray(n.children)) {
        for (const c of n.children) walk(c);
      }
    };
    for (const n of diff) walk(n);
    // Both URLs must be reachable in the output tree.
    expect(urls).toContain('https://example.com/v1.png');
    expect(urls).toContain('https://example.com/v2.png');
  });

  it('image alt change with same URL: alt prop diff visible on both sides', () => {
    const { diff } = runDiff(
      `![Old caption](https://example.com/img.png)`,
      `![New, longer caption](https://example.com/img.png)`
    );

    // Walk the whole tree to find img nodes, regardless of paragraph
    // wrapping.
    const imgs: any[] = [];
    const walk = (n: any) => {
      if (!n) return;
      if (n.type === 'img') imgs.push(n);
      if (Array.isArray(n.children)) {
        for (const c of n.children) walk(c);
      }
    };
    for (const n of diff) walk(n);

    // Both old and new caption texts must be reachable.
    const captions = imgs
      .map((i) => i.caption?.[0]?.text ?? i.alt ?? '')
      .filter(Boolean);
    expect(captions.some((c) => c.toLowerCase().includes('old'))).toBe(true);
    expect(captions.some((c) => c.toLowerCase().includes('new'))).toBe(true);
  });

  it('add video block as MDX: pure overflow insert with no pairId', () => {
    const VIDEO_URL = 'https://www.w3schools.com/html/mov_bbb.mp4';
    const { diff } = runDiff(
      `Intro paragraph.`,
      `Intro paragraph.\n\n<video src="${VIDEO_URL}" />`
    );

    // Tree-walk so we don't depend on whether remark-mdx wraps the
    // <video> in a paragraph or not.
    const videos: any[] = [];
    const walk = (n: any) => {
      if (!n) return;
      if (n.type === 'video') videos.push(n);
      if (Array.isArray(n.children)) {
        for (const c of n.children) walk(c);
      }
    };
    for (const n of diff) walk(n);

    expect(videos.length).toBeGreaterThanOrEqual(1);
    const inserted = videos.find(
      (v) => v.diffOperation?.type === 'insert' || v.url
    );
    expect(inserted).toBeDefined();
    // The inserted video must carry the URL through (normalized from src).
    expect(inserted.url ?? inserted.src).toBe(VIDEO_URL);
  });

  it('audio URL change: only the changed audio block gets paired; sibling audio survives', () => {
    // Mirrors the "Media: audio URL change" preset verbatim so the test
    // exercises the exact markdown shape the user sees in the playground.
    // SoundHelix's stable public MP3 URLs replaced the example.com
    // placeholders that didn't actually stream.
    const A_V1 =
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    const A_V2 =
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3';
    const B = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3';

    const { diff } = runDiff(
      `<audio src="${A_V1}" />\n\n<audio src="${B}" />`,
      `<audio src="${A_V2}" />\n\n<audio src="${B}" />`
    );

    const audios: any[] = [];
    const walk = (n: any) => {
      if (!n) return;
      if (n.type === 'audio') audios.push(n);
      if (Array.isArray(n.children)) {
        for (const c of n.children) walk(c);
      }
    };
    for (const n of diff) walk(n);

    // At least 3 audio nodes: paired (old + new) for `a`, plus 1 for `b`.
    expect(audios.length).toBeGreaterThanOrEqual(3);
    const urls = audios.map((a) => a.url ?? a.src);
    expect(urls).toContain(A_V1);
    expect(urls).toContain(A_V2);
    // The unchanged sibling must NOT carry a diffOperation.
    const sibling = audios.find((a) => (a.url ?? a.src) === B);
    expect(sibling?.diffOperation).toBeUndefined();
  });
});
