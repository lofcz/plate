import { type Page, expect, test } from '@playwright/test';

const OVERLAY = '[data-ai-edit-caret], [data-ai-edit-ghost]';
const PLAYBACK_HIGHLIGHT = /pending|trail/;

const editorOf = (page: Page) =>
  page.getByRole('textbox', { name: 'AI document' });

const settled = (page: Page, timeout = 4500) =>
  expect(page.locator(OVERLAY)).toHaveCount(0, { timeout });

test.beforeEach(async ({ page }) => {
  await page.goto('/#direct-edit');
  await expect(editorOf(page)).toBeVisible();
});

test('three distant edits type in order, scroll, stay marked, and undo as one change', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const editor = editorOf(page);
  const before = await editor.innerText();
  await page.getByRole('button', { name: 'Edit three sections' }).click();
  await expect(page.locator('[data-ai-edit-caret]')).toBeVisible();
  await settled(page);
  await expect(page.locator('[data-ai-change="new"]')).toHaveText([
    '1. Start with a question ✨',
    '6. Experiment and discover 🔬',
    '12. Share your discoveries 🎉',
  ]);
  await expect(
    page.getByRole('heading', { name: '12. Share your discoveries 🎉' })
  ).toBeInViewport();
  const after = await editor.innerText();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).toHaveText(before, { useInnerText: true });
  await expect(page.locator('[data-ai-change]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(editor).toHaveText(after, { useInnerText: true });
  expect(errors).toEqual([]);
});

test('a changed paragraph is tinted as a whole, without word marks', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Tweak words' }).click();
  await settled(page);
  await expect(page.locator('[data-ai-change="new"]')).toHaveCount(1);
  expect(
    await page.evaluate(() => [...(CSS as any).highlights.keys()])
  ).toEqual([]);
});

test('hovering fades a change out for good', async ({ page }) => {
  await page.getByRole('button', { name: 'Tweak words' }).click();
  await settled(page);
  const change = page.locator('[data-ai-change]');
  await change.hover();
  await expect(change).toHaveAttribute('data-ai-change', 'seen', {
    timeout: 2000,
  });
  await expect(page.locator('[data-ai-change]')).toHaveCount(0, {
    timeout: 3000,
  });
  await page.mouse.move(0, 0);
  await page
    .getByText('Students investigate the topic', { exact: false })
    .hover();
  await page.waitForTimeout(900);
  await expect(page.locator('[data-ai-change]')).toHaveCount(0);
  await expect(editorOf(page)).toContainText('investigate');
});

test('passing the pointer over a change does not acknowledge it', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Tweak words' }).click();
  await settled(page);
  const change = page.locator('[data-ai-change]');
  await change.hover();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(900);
  await expect(change).toHaveAttribute('data-ai-change', 'new');
});

test('follow-ups in one request merge; the next request accepts earlier changes', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Tweak words' }).click();
  await settled(page);
  await page.getByRole('button', { name: 'Follow-up (same request)' }).click();
  await settled(page);
  await expect(page.locator('[data-ai-change]')).toHaveCount(2);
  await page.evaluate(() => {
    const h = (window as any).directEditPlayground;
    const next = structuredClone(h.editor.children);
    next[33].children = [{ text: '12. Next request' }];
    return h.apply(next, { session: 'next request' });
  });
  await expect(page.locator('[data-ai-change]')).toHaveText([
    '12. Next request',
  ]);
  await expect(editorOf(page)).toContainText('investigate');
  await expect(editorOf(page)).toContainText('listen carefully');
});

test('typing inside a change accepts it; typing elsewhere interrupts playback only', async ({
  page,
}) => {
  const editor = editorOf(page);
  await page.getByRole('button', { name: 'Edit three sections' }).click();
  await expect(page.locator('[data-ai-edit-caret]')).toBeVisible();
  await editor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' User addition.');
  await settled(page, 500);
  await expect(editor).toContainText('User addition.');
  await expect(editor).toContainText('Share your discoveries');
  await expect(page.locator('[data-ai-change]')).toHaveCount(3);
  await page
    .getByRole('heading', { name: '12. Share your discoveries 🎉' })
    .click();
  await page.keyboard.press('End');
  await page.keyboard.type('!');
  await expect(page.locator('[data-ai-change]')).toHaveCount(2);
});

test('removed blocks exit as a struck-through ghost and leave no marker', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Remove a section' }).click();
  await expect(page.locator('[data-ai-edit-ghost]').first()).toBeVisible();
  await settled(page);
  expect(
    await page.evaluate(
      () => (window as any).directEditPlayground.editor.children.length
    )
  ).toBe(34);
  await expect(page.locator('[data-ai-change]')).toHaveCount(0);
});

test('reduced motion commits immediately without a cursor or scrolling', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Edit three sections' }).click();
  await expect(editorOf(page)).toContainText('Share your discoveries');
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  await expect(page.locator('[data-ai-change]')).toHaveCount(3);
  expect(
    await page.getByTestId('direct-edit-scroll').evaluate((el) => el.scrollTop)
  ).toBe(0);
});

test('rapid edits keep the final content and leave no playback artifacts', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { apply } = (window as any).directEditPlayground;
    const p = (text: string) => ({ type: 'p', children: [{ text }] });
    void apply([p('First update'), p('Unchanged')]);
    void apply([p('First update'), p('Second update')]);
    return apply([p('Final update'), p('Second update')]);
  });
  const editor = editorOf(page);
  await expect(editor).toContainText('Final update');
  await expect(editor).toContainText('Second update');
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      [...(CSS as any).highlights.keys()].filter((name: string) =>
        PLAYBACK_HIGHLIGHT.test(name)
      )
    )
  ).toEqual([]);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).toContainText('First update');
});

test('programmatic undo during playback wins over the animation', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Edit three sections' }).click();
  await expect(page.locator('[data-ai-edit-caret]')).toBeVisible();
  await page.evaluate(() =>
    (window as any).directEditPlayground.editor.tf.undo()
  );
  await settled(page, 500);
  await expect(editorOf(page)).not.toContainText('Share your discoveries');
  await expect(page.locator('[data-ai-change]')).toHaveCount(0);
});

test('wheel input ends playback at once and keeps the edit', async ({
  page,
}) => {
  await page.evaluate(() => {
    void (window as any).directEditPlayground.apply([
      { type: 'p', children: [{ text: 'Replacement' }] },
    ]);
    document
      .querySelector('[data-testid="direct-edit-scroll"]')!
      .dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
  });
  await settled(page, 500);
  await expect(editorOf(page)).toHaveText('Replacement');
});

test('unmount clears the overlay and highlights', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit three sections' }).click();
  await expect(page.locator('[data-ai-edit-caret]')).toBeVisible();
  await page.getByRole('button', { name: 'Source map', exact: true }).click();
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  expect(await page.evaluate(() => (CSS as any).highlights.size)).toBe(0);
});

test('the total budget covers distant scrolls and repeated tool calls', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const h = (window as any).directEditPlayground;
    const start = performance.now();
    const original = structuredClone(h.editor.children);
    const edits: Promise<void>[] = [];
    for (let i = 0; i < 5; i++) {
      const next = structuredClone(original);
      next[0].children[0].text = `Update ${i}`;
      next[15].children[0].text = `Middle ${i}`;
      next[33].children[0].text = `End ${i}`;
      edits.push(h.apply(next));
      await new Promise((resolve) => setTimeout(resolve, 160));
    }
    await Promise.all(edits);
    return {
      elapsed: performance.now() - start,
      text: h.editor.api.string([]),
    };
  });
  expect(result.elapsed).toBeLessThan(2800);
  expect(result.text).toContain('End 4');
  await expect(page.locator(OVERLAY)).toHaveCount(0);
});

test('an explicit short budget bounds the whole transition', async ({
  page,
}) => {
  const elapsed = await page.evaluate(async () => {
    const h = (window as any).directEditPlayground;
    const started = performance.now();
    await h.apply([{ type: 'p', children: [{ text: 'Quick replacement' }] }], {
      duration: 100,
    });
    return performance.now() - started;
  });
  expect(elapsed).toBeLessThan(350);
  await expect(page.locator(OVERLAY)).toHaveCount(0);
});

test('each change is revealed when reached, in document order', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const h = (window as any).directEditPlayground;
    const after = structuredClone(h.editor.children);
    after[3].children = [{ text: 'First actual change' }];
    after[30].children = [{ text: 'Last actual change' }];
    const visits: { path: number[]; time: number }[] = [];
    await h.apply(after, {
      reveal: (path: number[]) => {
        visits.push({ path, time: performance.now() });
        return h.editor.api.toDOMNode(h.editor.api.node(path)[0]);
      },
    });
    return visits;
  });
  expect(result.map((v) => v.path)).toEqual([[3], [30]]);
  expect(result[1].time - result[0].time).toBeGreaterThan(300);
  await expect(
    page.getByText('Last actual change', { exact: true })
  ).toBeInViewport();
});

test('a long full rewrite stays in place and completes', async ({ page }) => {
  await page.evaluate(async () => {
    const harness = (window as any).directEditPlayground;
    harness.setMarkdown('Short paragraph');
    await harness.applyMarkdown(
      'A long explanation with rich detail. '.repeat(160)
    );
  });
  expect(
    await page.getByTestId('direct-edit-scroll').evaluate((el) => el.scrollTop)
  ).toBe(0);
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  await expect(editorOf(page)).toContainText('A long explanation');
});

test('edits still apply and track without the CSS Highlight API', async ({
  page,
}) => {
  await page.evaluate(async () => {
    Object.defineProperty(window, 'Highlight', {
      value: undefined,
      configurable: true,
    });
    await (window as any).directEditPlayground.applyMarkdown(
      'Final replacement'
    );
  });
  await expect(editorOf(page)).toHaveText('Final replacement');
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  await expect(page.locator('[data-ai-change]')).toHaveCount(1);
});

test('rich markdown edits retain links, marks, lists, and table structure', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const harness = (window as any).directEditPlayground;
    harness.setMarkdown(
      '# Lesson\n\nOriginal **bold** and [link](https://example.com).\n\n- first\n- second\n\n| A | B |\n|---|---|\n| 1 | 2 |'
    );
    await harness.applyMarkdown(
      '# Lesson\n\nRevised **bold** and [link](https://example.com).\n\n- first\n- inserted\n- second\n\n| A | B |\n|---|---|\n| 3 | 4 |'
    );
  });
  const editor = editorOf(page);
  await expect(editor.locator('strong')).toHaveText('bold');
  await expect(editor.getByRole('link')).toHaveAttribute(
    'href',
    'https://example.com'
  );
  await expect(editor).toContainText('inserted');
  await expect(editor.getByRole('table')).toContainText('3');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).toContainText('Original');
  await expect(editor).not.toContainText('inserted');
});

test('complete preparation edits preserve nested phases and activities', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const h = (window as any).directEditPlayground;
    h.setMarkdown(
      '<phase name="Learning">\n\n<activity name="Experiment" duration="10">\n\nOriginal instructions.\n\n</activity>\n\n</phase>'
    );
    await h.applyMarkdown(
      '<phase name="Learning">\n\n<activity name="Experiment" duration="10">\n\nRevised **instructions**.\n\n</activity>\n\n<activity name="Reflection" duration="5">\n\nShare your findings.\n\n</activity>\n\n</phase>'
    );
  });
  const editor = editorOf(page);
  await expect(editor).toContainText('Revised');
  await expect(editor).toContainText('Share your findings.');
  expect(
    await page.evaluate(() => {
      const nodes = (window as any).directEditPlayground.editor.children;
      return {
        phase: nodes[0].type,
        activities: nodes[0].children.map((node: any) => node.type),
      };
    })
  ).toEqual({
    phase: 'lesson_phase',
    activities: ['lesson_activity', 'lesson_activity'],
  });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).toContainText('Original instructions.');
  await expect(editor).not.toContainText('Share your findings.');
});
