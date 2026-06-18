import { expect, test } from 'bun:test';

import {
  AUTO_RELEASE_END,
  AUTO_RELEASE_START,
  getChangesetValidationErrors,
  getChangesetReleaseType,
  hasChangesetFile,
  isChangesetFile,
  isAutoReleaseChecked,
  isVersionPackagesTitle,
  shouldManageAutoReleaseBlock,
  upsertAutoReleaseBlock,
} from './auto-release-pr.mjs';

test('uses repo-neutral auto-release markers', () => {
  expect(AUTO_RELEASE_START).toBe('<!-- auto-release:start -->');
  expect(AUTO_RELEASE_END).toBe('<!-- auto-release:end -->');
});

test('detects real changeset files', () => {
  expect(hasChangesetFile(['.changeset/media-redos.md'])).toBe(true);
  expect(
    hasChangesetFile(['.changeset/README.md', 'packages/media/src/index.ts'])
  ).toBe(false);
  expect(
    isChangesetFile({
      filename: '.changeset/media-redos.md',
      status: 'removed',
    })
  ).toBe(false);
});

test('detects Version packages release PR titles', () => {
  expect(isVersionPackagesTitle('[Release] Version packages')).toBe(true);
  expect(isVersionPackagesTitle('chore: Version Packages')).toBe(true);
  expect(isVersionPackagesTitle('Fix media parser')).toBe(false);
});

test('does not manage auto-release blocks on Version packages PRs', () => {
  expect(
    shouldManageAutoReleaseBlock({
      files: ['.changeset/media-redos.md'],
      title: '[Release] Version packages',
    })
  ).toBe(false);
  expect(
    shouldManageAutoReleaseBlock({
      files: ['.changeset/media-redos.md'],
      title: 'Fix media parser',
    })
  ).toBe(true);
});

test('detects the highest changeset release type from PR file patches', () => {
  expect(
    getChangesetReleaseType([
      {
        filename: '.changeset/media-redos.md',
        patch: `@@ -0,0 +1,5 @@
+---
+"@platejs/media": patch
+---
+
+Fix parser`,
      },
    ])
  ).toBe('patch');

  expect(
    getChangesetReleaseType([
      {
        filename: '.changeset/media-redos.md',
        patch: `@@ -0,0 +1,5 @@
+---
+"@platejs/media": patch
+---
+Fix parser`,
      },
      {
        filename: '.changeset/core-api.md',
        patch: `@@ -0,0 +1,5 @@
+---
+"@platejs/core": minor
+---
+Add API`,
      },
    ])
  ).toBe('minor');

  expect(
    getChangesetReleaseType([
      {
        filename: '.changeset/core-break.md',
        patch: `@@ -0,0 +1,5 @@
+---
+"@platejs/core": major
+---
+Remove API`,
      },
      {
        filename: '.changeset/media-redos.md',
        patch: `@@ -0,0 +1,5 @@
+---
+"@platejs/media": patch
+---
+Fix parser`,
      },
    ])
  ).toBe('major');
});

test('adds a checked auto-release block to patch-only changeset PRs', () => {
  const body = upsertAutoReleaseBlock('## Summary\nFix media parser.', {
    defaultChecked: true,
    hasChangeset: true,
  });

  expect(body).toBe(
    `${AUTO_RELEASE_START}
- [x] Auto release
${AUTO_RELEASE_END}

## Summary
Fix media parser.
`
  );
});

test('validates changeset filenames and frontmatter entries', () => {
  expect(
    getChangesetValidationErrors([
      {
        filename: '.changeset/media-redos.md',
        patch: `@@ -0,0 +1,5 @@
+---
+"@platejs/media": patch
+"@platejs/core": none
+---
+
+Fix parser`,
      },
    ])
  ).toEqual([]);

  expect(
    getChangesetValidationErrors([
      {
        filename: '.changeset/Media_Redos.md',
        patch: `@@ -0,0 +1,5 @@
+---
+"@platejs/media": feature
+---
+
+Fix parser`,
      },
    ])
  ).toEqual([
    '.changeset/Media_Redos.md has an invalid filename. Use lowercase letters, digits, and hyphens.',
    '.changeset/Media_Redos.md has invalid entry "\\"@platejs/media\\": feature". Expected \'"package-name": patch|minor|major|none\'.',
  ]);

  expect(
    getChangesetValidationErrors([
      {
        filename: '.changeset/media-redos.md',
        patch: `@@ -0,0 +1,2 @@
+Fix parser`,
      },
    ])
  ).toEqual(['.changeset/media-redos.md is missing YAML frontmatter.']);
});

test('adds an unchecked auto-release block to minor or major changeset PRs', () => {
  const body = upsertAutoReleaseBlock('## Summary\nAdd API.', {
    defaultChecked: false,
    hasChangeset: true,
  });

  expect(body).toMatch(/- \[ \] Auto release/);
});

test('preserves a checked auto-release block', () => {
  const body = `${AUTO_RELEASE_START}
- [x] Auto release
${AUTO_RELEASE_END}
`;

  const nextBody = upsertAutoReleaseBlock(body, { hasChangeset: true });

  expect(isAutoReleaseChecked(nextBody)).toBe(true);
  expect(nextBody).toMatch(/- \[x\] Auto release/);
});

test('removes the auto-release block when a PR has no changeset', () => {
  const body = `## Summary
Docs only.

${AUTO_RELEASE_START}
- [x] Auto release
${AUTO_RELEASE_END}
`;

  expect(upsertAutoReleaseBlock(body, { hasChangeset: false })).toBe(
    '## Summary\nDocs only.'
  );
});

test('only treats the managed checkbox as release intent', () => {
  expect(isAutoReleaseChecked('- [x] Auto release')).toBe(false);
});

test('keeps old checked blocks checked while rewriting the label', () => {
  const body = `${AUTO_RELEASE_START}
- [x] Auto-merge the Version Packages PR after this PR lands.
${AUTO_RELEASE_END}

## Summary
Fix media parser.
`;

  const nextBody = upsertAutoReleaseBlock(body, { hasChangeset: true });

  expect(nextBody).toMatch(/- \[x\] Auto release/);
  expect(nextBody).not.toMatch(/Version Packages/);
});

test('rewrites old managed markers to the repo-neutral markers', () => {
  const body = `<!-- plate:auto-release:start -->
- [x] Auto release
<!-- plate:auto-release:end -->

## Summary
Fix media parser.
`;

  const nextBody = upsertAutoReleaseBlock(body, { hasChangeset: true });

  expect(nextBody).toMatch(/^<!-- auto-release:start -->/);
  expect(nextBody).not.toMatch(/plate:auto-release/);
  expect(nextBody).toMatch(/- \[x\] Auto release/);
});
