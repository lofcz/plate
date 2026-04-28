# @lofcz/platejs

> [!NOTE]
> This is a maintained fork of [udecode/plate](https://github.com/udecode/plate) published under the `@lofcz/` npm scope. If you ended up here by accident, you almost certainly want the upstream repo instead.

<p>
<div align="center">
  <a href="https://www.npmjs.com/package/@lofcz/platejs-core"><img src="https://img.shields.io/npm/dm/@lofcz/platejs-core.svg" alt="Total Downloads"></a>
  <a target="_blank" href="https://github.com/lofcz/plate/releases/latest"><img src="https://img.shields.io/github/v/release/lofcz/plate" /></a>
  <a target="_blank" href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
  <a target="_blank" href="https://discord.gg/mAZRuBzGM3"><img src="https://img.shields.io/badge/chat-on%20discord-7289da.svg?sanitize=true" /></a>
  <a target="_blank" href="https://github.com/lofcz/plate/blob/main/LICENSE"><img src="https://badgen.now.sh/badge/license/MIT" /></a>
</div>

## Consuming

In your project's `package.json`, alias each `@platejs/*` dependency to the fork:

```json
"dependencies": {
  "@platejs/ai": "npm:@lofcz/platejs-ai@^53.0.0",
  "platejs": "npm:@lofcz/platejs@^53.0.0"
}
```

Add matching overrides so transitive deps also resolve to the fork:

```json
"overrides": {
  "@platejs/ai": "npm:@lofcz/platejs-ai@^53.0.0",
  "platejs": "npm:@lofcz/platejs@^53.0.0"
}
```

All source-level imports (`from '@platejs/ai/react'`, `from 'platejs'`, etc.) work unchanged.

## Syncing upstream

Contributing to this repo (issues, conventions, workflows): see [CONTRIBUTING.md](CONTRIBUTING.md).

Run `sync_upstream.bat` (or `powershell scripts/sync-upstream.ps1`). It:

1. Fetches and merges `upstream/main`
2. Re-applies `@lofcz/` renames to any new/changed package.json files
3. Converts upstream changesets (`@platejs/*` names) to `@lofcz/*` names so they publish correctly
4. Runs `pnpm install`



## Making changes

1. Edit code in `packages/`.
2. Run `prepare_release.bat` (or `pnpm changeset`) — select affected packages, pick semver bump, write a summary.
3. Commit the generated `.changeset/*.md` file alongside your code changes.
4. Push to `main`.

## Publishing

Fully automated via GitHub Actions:

1. **CI** runs lint, typecheck, tests. If barrels drifted, it auto-commits the fix.
2. **Release** (runs after CI passes) detects pending changesets and opens a "Version packages" PR that bumps versions.
3. Merging that PR triggers Release again, which publishes bumped packages to npm via trusted publishing (OIDC, no tokens).

Manual trigger: Actions tab > Release > Run workflow.