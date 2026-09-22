import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#direct-edit');
  await expect(
    page.getByRole('textbox', { name: 'AI document' })
  ).toBeVisible();
});

test('three distant edits reveal in order, scroll, and undo/redo as one change', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const editor = page.getByRole('textbox', { name: 'AI document' });
  const before = await editor.innerText();
  await page.evaluate(() => {
    const visited: string[] = [];
    Object.assign(window, { visitedAIRegions: visited });
    new MutationObserver((records) => {
      for (const record of records) {
        const element = record.target as HTMLElement;
        if (
          element.dataset.aiEditRegion &&
          visited.at(-1) !== element.textContent
        )
          visited.push(element.textContent ?? '');
      }
    }).observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-ai-edit-region'],
    });
  });
  await page.getByRole('button', { name: 'Edit three sections' }).click();
  await expect(page.locator('[data-ai-edit-caret]')).toBeVisible();
  await expect(page.locator('[data-ai-edit-caret]')).toHaveCount(0, {
    timeout: 15_000,
  });
  expect(await page.evaluate(() => (window as any).visitedAIRegions)).toEqual([
    '1. Start with a question ✨',
    '6. Experiment and discover 🔬',
    '12. Share your discoveries 🎉',
  ]);
  await expect
    .poll(() =>
      page.getByTestId('direct-edit-scroll').evaluate((el) => el.scrollTop)
    )
    .toBeGreaterThan(500);
  await expect(
    page.getByRole('heading', { name: '12. Share your discoveries 🎉' })
  ).toBeInViewport();
  const after = await editor.innerText();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).toHaveText(before, { useInnerText: true });
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(editor).toHaveText(after, { useInnerText: true });
  expect(errors).toEqual([]);
});

test('typing interrupts playback without losing AI or manual edits', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Edit three sections' }).click();
  await expect(page.locator('[data-ai-edit-caret]')).toBeVisible();
  const editor = page.getByRole('textbox', { name: 'AI document' });
  await editor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' User addition.');
  await expect(page.locator('[data-ai-edit-caret]')).toHaveCount(0);
  await expect(editor).toContainText('User addition.');
  await expect(editor).toContainText('Share your discoveries');
});

test('reduced motion applies immediately with no cursor or forced scrolling', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Edit three sections' }).click();
  await expect(
    page.getByRole('textbox', { name: 'AI document' })
  ).toContainText('Share your discoveries');
  await expect(page.locator('[data-ai-edit-caret]')).toHaveCount(0);
  expect(
    await page.getByTestId('direct-edit-scroll').evaluate((el) => el.scrollTop)
  ).toBe(0);
});

test('rapid edits retain final content and leave no visual artifacts', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { apply } = (window as any).directEditPlayground;
    const p = (text: string) => ({ type: 'p', children: [{ text }] });
    void apply([p('First update'), p('Unchanged')]);
    void apply([p('First update'), p('Second update')]);
    return apply([p('Final update'), p('Second update')]);
  });
  const editor = page.getByRole('textbox', { name: 'AI document' });
  await expect(editor).toContainText('Final update');
  await expect(editor).toContainText('Second update');
  await expect(
    page.locator('[data-ai-edit-caret], [data-ai-edit-region]')
  ).toHaveCount(0);
  expect(await page.evaluate(() => (CSS as any).highlights.size)).toBe(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).toContainText('First update');
});

test('programmatic undo during playback wins over the animation', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Edit three sections' }).click();
  await expect(page.locator('[data-ai-edit-caret]')).toBeVisible();
  expect(
    await page.evaluate(() => {
      const editor = (window as any).directEditPlayground.editor;
      const before = editor.children;
      editor.tf.undo();
      return editor.children !== before;
    })
  ).toBe(true);
  await expect(page.locator('[data-ai-edit-caret]')).toHaveCount(0, {
    timeout: 500,
  });
  await expect(
    page.getByRole('textbox', { name: 'AI document' })
  ).not.toContainText('Share your discoveries');
});

test('unmount removes highlights and the collaborator cursor', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Edit three sections' }).click();
  await expect(page.locator('[data-ai-edit-caret]')).toBeVisible();
  await page.getByRole('button', { name: 'Source map', exact: true }).click();
  await expect(page.locator('[data-ai-edit-caret]')).toHaveCount(0);
  expect(await page.evaluate(() => (CSS as any).highlights.size)).toBe(0);
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
  const editor = page.getByRole('textbox', { name: 'AI document' });
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

test('typing follows a long changed paragraph down the viewport', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const harness = (window as any).directEditPlayground;
    harness.setMarkdown('Short paragraph');
    await harness.applyMarkdown(
      'A long explanation with rich detail. '.repeat(160)
    );
  });
  expect(
    await page.getByTestId('direct-edit-scroll').evaluate((el) => el.scrollTop)
  ).toBeGreaterThan(400);
  await expect(page.locator('[data-ai-edit-caret]')).toHaveCount(0);
  await expect(
    page.getByRole('textbox', { name: 'AI document' })
  ).toContainText('A long explanation');
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
  const editor = page.getByRole('textbox', { name: 'AI document' });
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
