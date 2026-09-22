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
    timeout: 2500,
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

test('a long full rewrite stays in place and completes quickly', async ({
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
  ).toBe(0);
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

test('an eighteen-region rewrite retains the old snapshot and never hides list text', async ({
  page,
}) => {
  const before =
    '**Invitation**\n\nDear parents,\n\n- Date: Wednesday\n- Time: 17:00\n- Place: Classroom\n\n## Agenda\n\n' +
    Array.from(
      { length: 12 },
      (_, i) => `${i + 1}. Original agenda item ${i + 1}`
    ).join('\n') +
    '\n\nThank you.';
  const after = before
    .replaceAll('Original', 'Improved')
    .replace('Invitation', 'Parent meeting')
    .replace('Dear parents', 'Dear families')
    .replace('Wednesday', 'Thursday')
    .replace('17:00', '18:00')
    .replace('Classroom', 'Library')
    .replace('Thank you.', 'See you soon.');
  await page.evaluate(
    (before) => (window as any).directEditPlayground.setMarkdown(before),
    before
  );
  await expect(
    page.getByRole('textbox', { name: 'AI document' })
  ).toContainText('Original agenda item');
  const evidence = await page.evaluate(async (after) => {
    const h = (window as any).directEditPlayground;
    const start = performance.now();
    const done = h.applyMarkdown(after);
    const snapshot = document.querySelector('[data-ai-edit-snapshot]');
    const oldVisible = snapshot?.textContent?.includes('Original agenda item');
    const inert = (snapshot as HTMLElement)?.inert;
    const samples: string[] = [];
    const timer = setInterval(() => {
      for (const style of document.querySelectorAll('style'))
        if (style.textContent?.includes('color: transparent'))
          samples.push(style.textContent);
    }, 16);
    await done;
    clearInterval(timer);
    return {
      elapsed: performance.now() - start,
      oldVisible,
      inert,
      hiddenTextStyles: samples.length,
    };
  }, after);
  expect(evidence.oldVisible).toBe(true);
  expect(evidence.inert).toBe(true);
  expect(evidence.elapsed).toBeGreaterThan(1100);
  expect(evidence.elapsed).toBeLessThan(1900);
  expect(evidence.hiddenTextStyles).toBe(0);
  const editor = page.getByRole('textbox', { name: 'AI document' });
  await expect(editor).toContainText('Improved agenda item 12');
  await expect(
    page.locator(
      '[data-ai-edit-sweep], [data-ai-edit-snapshot], [data-ai-edit-mode], [data-ai-edit-caret]'
    )
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).toContainText('Original agenda item 12');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(editor).toContainText('Improved agenda item 12');
});

test('the total budget includes distant scrolls and repeated tool calls', async ({
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
  expect(result.elapsed).toBeLessThan(2200);
  expect(result.text).toContain('End 4');
  await expect(
    page.locator(
      '[data-ai-edit-snapshot], [data-ai-edit-caret], [data-ai-edit-mode]'
    )
  ).toHaveCount(0);
});

test('rewrite cancellation, undo and unsupported highlights leave no overlay', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const h = (window as any).directEditPlayground;
    const before = structuredClone(h.editor.children);
    const done = h.apply([{ type: 'p', children: [{ text: 'Replacement' }] }]);
    h.editor.tf.undo();
    await done;
    if (JSON.stringify(before) !== JSON.stringify(h.editor.children))
      throw new Error('Undo mismatch');
  });
  await expect(
    page.locator(
      '[data-ai-edit-sweep], [data-ai-edit-snapshot], [data-ai-edit-mode]'
    )
  ).toHaveCount(0);
  await page.evaluate(async () => {
    Object.defineProperty(window, 'Highlight', {
      value: undefined,
      configurable: true,
    });
    await (window as any).directEditPlayground.applyMarkdown(
      'Final replacement'
    );
  });
  await expect(page.getByRole('textbox', { name: 'AI document' })).toHaveText(
    'Final replacement'
  );
  await expect(
    page.locator(
      '[data-ai-edit-sweep], [data-ai-edit-snapshot], [data-ai-edit-mode]'
    )
  ).toHaveCount(0);
});

test('an explicit short total budget includes the full replacement transition', async ({
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
  await expect(
    page.locator(
      '[data-ai-edit-sweep], [data-ai-edit-snapshot], [data-ai-edit-mode], [data-ai-edit-caret]'
    )
  ).toHaveCount(0);
});

test('wheel interruption during a full rewrite removes the old snapshot immediately', async ({
  page,
}) => {
  await page.evaluate(() => {
    const h = (window as any).directEditPlayground;
    void h.apply([{ type: 'p', children: [{ text: 'Replacement' }] }]);
    document
      .querySelector('[data-testid="direct-edit-scroll"]')!
      .dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
  });
  await expect(
    page.locator(
      '[data-ai-edit-sweep], [data-ai-edit-snapshot], [data-ai-edit-mode], [data-ai-edit-caret]'
    )
  ).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'AI document' })).toHaveText(
    'Replacement'
  );
});

test('unmount during a whole-document replacement clears snapshots and animation state', async ({
  page,
}) => {
  await page.evaluate(() => {
    void (window as any).directEditPlayground.apply([
      { type: 'p', children: [{ text: 'Replacement' }] },
    ]);
  });
  await page.getByRole('button', { name: 'Source map', exact: true }).click();
  await expect(
    page.locator(
      '[data-ai-edit-sweep], [data-ai-edit-snapshot], [data-ai-edit-mode], [data-ai-edit-caret]'
    )
  ).toHaveCount(0);
});

test('large section insertion uses local animation and scrolls to its first actual change', async ({
  page,
}) => {
  await page.evaluate(() => {
    const h = (window as any).directEditPlayground;
    const before = structuredClone(h.editor.children);
    const added = Array.from({ length: 9 }, (_, i) => ({
      type: 'p',
      children: [{ text: `Inserted section ${i}` }],
    }));
    const after = [...before.slice(0, 24), ...added, ...before.slice(24)];
    const reveals: number[][] = [];
    Object.assign(window, { insertionReveals: reveals });
    void h.apply(after, {
      apply: () => {
        h.editor.tf.setValue(after);
        return [[24]];
      },
      reveal: (path: number[]) => {
        reveals.push(path);
        return h.editor.api.toDOMNode(h.editor.api.node(path)[0]);
      },
    });
  });
  await expect(page.locator('[data-ai-edit-mode="regions"]')).toHaveCount(1);
  await expect(page.locator('[data-ai-edit-snapshot]')).toHaveCount(0);
  await expect(
    page.getByText('Inserted section 0', { exact: true })
  ).toBeInViewport();
  expect(await page.evaluate(() => (window as any).insertionReveals)).toEqual([
    [24],
  ]);
  await expect(page.locator('[data-ai-edit-caret]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(
    page.getByText('Inserted section 0', { exact: true })
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(
    page.getByText('Inserted section 0', { exact: true })
  ).toHaveCount(1);
});

test('each target is revealed only when reached, using refreshed nested DOM', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const h = (window as any).directEditPlayground;
    const after = structuredClone(h.editor.children);
    after[3].children = [{ text: 'First actual change' }];
    after[30].children = [{ text: 'Last actual change' }];
    const visits: { path: number[]; time: number }[] = [];
    await h.apply(after, {
      apply: () => {
        h.editor.tf.setValue(after);
        return [[30], [3]];
      },
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
