import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const releaseWorkflowPath = new URL(
  '../../.github/workflows/release.yml',
  import.meta.url
);
const packageJsonPath = new URL('../../package.json', import.meta.url);
const nextConfigPath = new URL(
  '../../apps/www/next.config.ts',
  import.meta.url
);

test('release workflow uses the pruned GitHub Release path', async () => {
  const workflow = await readFile(releaseWorkflowPath, 'utf8');

  assert.match(workflow, /branches:\s*\[main\]/);
  assert.match(workflow, /createGithubReleases:\s*false/);
  assert.match(workflow, /version:\s*pnpm ci:version/);
  assert.match(workflow, /publish:\s*pnpm ci:release/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /NPM_CONFIG_PROVENANCE:\s*['"]true['"]/);
  // npm CLI 10.x (shipped with Node 22) cannot publish via OIDC alone — pure
  // trusted publishing requires npm ≥ 11.5.1 *and* a Trusted Publisher entry
  // for every @lofcz/* package on npm.org. Until both are true the workflow
  // ships explicit token auth: NODE_AUTH_TOKEN consumed by the .npmrc that
  // actions/setup-node writes, and NPM_TOKEN as the belt-and-braces fallback
  // changesets/action uses when it writes its own .npmrc. Drop these two
  // asserts only when the workflow is migrated to OIDC-only publishing.
  assert.match(
    workflow,
    /NODE_AUTH_TOKEN:\s*\$\{\{\s*secrets\.NPM_TOKEN\s*\}\}/
  );
  assert.match(
    workflow,
    /^\s+NPM_TOKEN:\s*\$\{\{\s*secrets\.NPM_TOKEN\s*\}\}/m
  );
  assert.match(workflow, /registry-url:\s*https:\/\/registry\.npmjs\.org/);
  assert.match(workflow, /node tooling\/scripts\/published-package-tags\.mjs/);
  assert.match(workflow, /refs\/tags\/\$\{tag\}:refs\/tags\/\$\{tag\}/);
  assert.match(
    workflow,
    /node tooling\/scripts\/sync-version-package-releases\.mjs --pr "\$RELEASE_PR" --from v49/
  );
  assert.match(
    workflow,
    /git status --porcelain --untracked-files=all -- apps\/www\/src\/generated\/release-index\.json/
  );
  assert.match(workflow, /node tooling\/scripts\/release-notes\.mjs/);
  assert.match(workflow, /anthropics\/claude-code-action\/base-action/);
  assert.match(
    workflow,
    /node tooling\/scripts\/release-notes\.mjs add-package-changelogs "\$\{RAW_PATH\}\.final"/
  );
  assert.match(workflow, /touch "\$\{RAW_PATH\}\.final\.validated"/);
  assert.match(
    workflow,
    /-f "\$\{RAW_PATH\}\.final" && -f "\$\{RAW_PATH\}\.final\.validated"/
  );
  assert.match(workflow, /Ignoring unvalidated AI-rewritten release notes/);
  assert.match(workflow, /gh release (create|edit)/);
  assert.match(workflow, /sync-release-artifacts:/);
  assert.doesNotMatch(workflow, /sync-release-docs/);
  assert.doesNotMatch(workflow, /global-release/);
  assert.doesNotMatch(workflow, /pr-analyzer/);
  assert.doesNotMatch(workflow, /snapshot:/);
  assert.doesNotMatch(workflow, /release\/\*\*/);
  assert.doesNotMatch(workflow, /branches:\s*[\s\S]*-\s*next/);
});

test('package scripts expose CI version and release commands only', async () => {
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));

  assert.equal(
    packageJson.scripts['ci:version'],
    'pnpm changeset version && pnpm install --no-frozen-lockfile'
  );
  assert.equal(packageJson.scripts['ci:release'], 'pnpm release');
  assert.equal(packageJson.scripts['release:releases'], undefined);
});

test('release docs keep old migration route redirects', async () => {
  const nextConfig = await readFile(nextConfigPath, 'utf8');

  assert.match(
    nextConfig,
    /source:\s*'\/docs\/migration'[\s\S]*destination:\s*'\/docs\/releases'|destination:\s*'\/docs\/releases'[\s\S]*source:\s*'\/docs\/migration'/
  );
  assert.match(
    nextConfig,
    /source:\s*'\/cn\/docs\/migration'[\s\S]*destination:\s*'\/cn\/docs\/releases'|destination:\s*'\/cn\/docs\/releases'[\s\S]*source:\s*'\/cn\/docs\/migration'/
  );
});
