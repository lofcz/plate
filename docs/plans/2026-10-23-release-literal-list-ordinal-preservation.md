# Release Lane Maintenance

Objective:
Publish the list-ordinal preservation fix through GitHub CI, verify the npm package, and consume it in sciobot-next without a dependency patch.

Goal plan:
docs/plans/2026-10-23-release-literal-list-ordinal-preservation.md

Template:
docs/plans/templates/release-lanes.md

Primary template:
docs/plans/templates/release-lanes.md

Applied packs:
- package-api

Completion threshold:
- Requested release lane mode is complete: status, sync, promote, verify, or full.
- `main`/`latest` and `next`/`beta` state is read back from GitHub and npm.
- Direct `main -> next` sync is complete when needed, with known release metadata
  conflicts repaired automatically and beta changesets created for synced
  packages, then versioned before the sync commit is pushed.
- `.changeset/pre.json` exists only on `next`, uses beta pre mode when beta is
  expected to continue, and is restored in the same unskipped sync commit when
  the sync creates beta changesets.
- Release workflows passed or a blocker is recorded with run URLs and logs.
- `node .agents/skills/autogoal/scripts/check-complete.mjs <this plan>` passes.

Verification surface:
- `git fetch origin main next`
- `node tooling/scripts/release-branch-prs.mjs sync-main-to-next --dry-run`
- `node tooling/scripts/release-branch-prs.mjs sync-main-to-next --push` when sync applies
- `node tooling/scripts/release-branch-prs.mjs verify-main-to-next-sync`
- `gh run list`, `gh run watch`, and `gh run view --log` for release/promote workflows
- `npm view platejs dist-tags --json`
- `npm view platejs@latest version`
- `npm view platejs@beta version`

Constraints:
- Do not publish manually with `npm publish`.
- Do not commit `.changeset/pre.json` to `main`.
- Do not route minor changesets to `next`; minor releases target `main`.
- Treat `next` as the major beta lane. Patch changes on `next` are only for
  active beta-lane fixes or direct-sync beta metadata.
- Do not push a direct `next` sync commit with beta changesets unless beta pre
  mode is present in that same commit.
- Do not leave generated beta changeset files waiting for a Version Packages PR
  in the direct sync lane; version them before pushing.
- Do not trigger `release.yml` from a direct sync commit that has no versioned
  beta package changes to publish.
- Do not run a real direct sync from a dirty checkout.
- Do not squash or rebase `next -> main` promotion PRs.
- Do not create routine `main -> next` sync PRs.
- Stop for source conflicts outside known release metadata.

Boundaries:
- Allowed branches: `main`, `next`, promote PR from `next -> main`.
- Allowed release files: package manifests, changelogs, `.changeset/pre.json`,
  generated beta sync changesets, release workflow/scripts.
- Non-goals: feature code changes, package source edits unrelated to release
  lane repair, manual npm publication.

Output budget strategy:
- Keep workflow logs capped to failing sections or grep excerpts.
- Record URLs for long logs instead of pasting full logs.

Blocked condition:
- Missing auth, rejected protected branch mutation, real source conflict,
  failed release workflow after one repair attempt, or npm/GitHub release state
  mismatch.

Start Gates:
| Gate | Applies | Evidence |
|------|---------|----------|
| Skill analysis before edits | yes | task, autogoal, release-lanes, changeset, testing and autoreview read |
| Active goal checked or created | yes | Thread goal created before remote mutations |
| Requested mode classified | yes | Stable patch publication; no beta promotion |
| Remote state fetched | yes | main fetched; next branch absent on this fork |
| Release auth available | yes | gh authenticated; npm read returned markdown latest 53.6.2; CI owns OIDC publication |
| Current lane state read | yes | main c571aa8b38; no next branch; no stable pre mode; npm markdown latest 53.6.2 |
| Package/API pack selected | yes | package-api materialized by scaffold |
| Public surface or package boundary identified | yes | Markdown list parsing/serialization; no exported shape change |
| Release artifact path selected | yes | .changeset/markdown-preserve-bullet-ordinals.md |
| `changeset` skill loaded when `.changeset` is required | yes | One @lofcz/platejs-markdown patch changeset |
| Barrel/export impact decision recorded | yes | N/A: no exports or exported file layout changes |

Explicit user requirements:
- Add the existing sciobot-next dependency fix to Plate source, with a regression test.
- Use gh CLI to release a new stable Plate version through CI.
- Upgrade sciobot-next to the published package and remove its temporary patch.
- Preserve unrelated sciobot-next changes; no beta promotion or broad feature work.
- Done requires a published npm package containing the source fix and passing focused consumer tests.
- Scope includes packages/markdown, its patch changeset, this release ledger, and consumer dependency metadata.
- Source risk: numbered prose inside a bullet can lose its ordinal. Prove both parse and serialize/reparse preservation.
- Public API/exports remain unchanged; no migration or barrel changes apply.
- Source PR ownership: https://github.com/lofcz/plate/pull/57 (this plan owns PR #57).

Work Checklist:
- [x] Explicit user requirements copied into this plan.
- [ ] Current `main`, `next`, npm, GitHub release, and workflow state recorded.
- [ ] Promotion PR reviewed or marked N/A.
- [ ] Stable release workflow watched or marked N/A.
- [ ] Direct `main -> next` sync dry run completed or marked N/A.
- [ ] Clean checkout verified by the direct sync script before any real push, or
      N/A because only dry-run/status was requested.
- [ ] Direct sync pushed to `next` when needed or blocker recorded.
- [ ] Known release metadata conflicts auto-resolved by script or N/A.
- [ ] Beta changesets created for packages changed by synced `main` commits or N/A.
- [ ] Generated beta sync changesets versioned before push, or N/A because no
      package changes were synced.
- [ ] Direct sync commit message triggers release only when versioned beta
      package changes exist; otherwise it includes `[skip release]`.
- [ ] Beta pre mode exists on `next` in the sync commit, or standalone re-entry
      is N/A because no beta publication is pending.
- [ ] Beta release workflow watched when beta publication is expected.
- [ ] npm `latest` and `beta` read back.
- [ ] Stale `sync/main-to-next` PRs closed after direct sync, or N/A.
- [ ] Release-lane review completed: no wrong tag, wrong branch, missing pre
      state, unmerged source conflict, or unpublished expected package remains.
- [ ] Package/API pack: public API, package boundary, export, and release-artifact impact are recorded.
- [ ] Package/API pack: release artifact matrix is applied: `.changeset`, registry changelog, or explicit no-artifact reason.
- [ ] Package/API pack: `.changeset` work loads `changeset` and follows its package/version/prose rules.
- [ ] Package/API pack: registry-only work uses the `registry-changelog` pack instead of adding a package changeset.
- [ ] Package/API pack: no-artifact decisions state why the diff has no published package user-visible delta from `main`.
- [ ] Package/API pack: compatibility, migration, or hard-cut decision is explicit when public shape changes.
- [ ] Package/API pack: package-owned typecheck/build/test proof is recorded or marked N/A with reason.
- [ ] Package/API pack: generated barrels or release notes are updated when required.

Completion Gates:
| Gate | Applies | Required action | Evidence |
|------|---------|-----------------|----------|
| Direct sync needed | pending | Compare `origin/next..origin/main` | pending |
| Direct sync result | pending | Run direct sync or record no-op | pending |
| Sync merge verification | pending | Run `verify-main-to-next-sync` on merge commit | pending |
| Beta pre mode | pending | Read `.changeset/pre.json` on `next` | pending |
| Latest release state | pending | Read GitHub release and npm `latest` | pending |
| Beta release state | pending | Read release workflow and npm `beta` | pending |
| Stale sync PR cleanup | pending | Close stale sync PRs or record N/A | pending |
| Autoreview | pending | Review release-lane result and close accepted findings | pending |
| Goal plan complete | yes | Run `node .agents/skills/autogoal/scripts/check-complete.mjs <this plan>` | pending |
| Public API / package boundary proof | pending | Source-audit public API, exports, and package boundary impact | pending |
| Release artifact classification | pending | Record whether the change is published package behavior/API/types/config/runtime, registry-only, or no published user-visible delta | pending |
| Published package changeset | pending | If published package users see a delta, load `changeset`, add/update one `.changeset/*.md` per package, and prove no forbidden `minor` on `@platejs/slate`, `@platejs/core`, or `platejs` | pending |
| Registry changelog | pending | If the change is registry-only under `apps/www/src/registry/**`, use the `registry-changelog` pack and do not add a package changeset | pending |
| No release artifact | pending | If no artifact is needed, record the exact reason: internal-only, docs-only, agent-only, test-only, or no user-visible delta from `main` | pending |
| Package typecheck/build/test | pending | Run owning package checks or record N/A with reason | pending |
| Barrel/export generation | pending | Run `pnpm brl` when exports or exported file layout changed, otherwise N/A | pending |

Phase / pass table:
| Phase | Status | Evidence | Next |
|-------|--------|----------|------|
| State read | pending | | Decide sync/promote/verify |
| Promote stable | pending | | Sync main to next |
| Direct sync | pending | | Re-enter beta |
| Beta release | pending | | Verify npm/GitHub |
| Cleanup and closeout | pending | | Final handoff |

Findings:
- None yet.

Timeline:
- TODO: Record each command, run URL, push SHA, and release readback.

Decisions and tradeoffs:
- Direct sync is the default because routine release metadata conflicts are
  deterministic machinery, not human review material.

Review fixes:
- None yet.

Error attempts:
| Error / failed attempt | Count | Next different move | Resolution |
|------------------------|-------|---------------------|------------|
| None yet | 0 | | |

Verification evidence:
- Pending.

Reboot status:
| Where am I? | Where am I going? | What is the goal? | What learned? | What done? |
|-------------|-------------------|-------------------|---------------|------------|
| TODO | TODO | TODO | TODO | TODO |

Open risks:
- Pending.

Release scope clarification:
- This fork has no next branch. Beta sync, pre-mode restoration and stale sync PR cleanup are N/A; user requested a stable source-fix release only.
- gh commands must specify -R lofcz/plate because bare gh resolves to upstream udecode/plate.
- Browser plugin discovery found no Browser/browser-use tool. Parser behavior is verified in the owning package; the published consumer will be checked in actual Chromium in sciobot-next under the user's explicit real-Chromium instruction.
- Before-fix /tmp/plate-ordinal-before.log: exact 1./3./5. disappearance reproduced (1 failing regression).
- After-fix /tmp/plate-ordinal-after.log: all 5 list deserializer tests pass, including normalized serialization round trip.
- Default autoreview gpt-5.5 is unsupported on this ChatGPT account. Retry uses the account's configured gpt-6.1-sol; no user-requested engine/model was overridden.
- Exact source commit aca0fad6ed passed full GitHub CI check in run 39882729777; local duplicate check continues; source risk remains confined to one-item ordered lists beginning a bullet's contents. Genuine multi-item nested lists retain their existing path.

Review cycle 1: accepted zero-ordinal finding; reconstruct with nullish fallback, and include `0. month` in the parse/round-trip regression. No API or scope expansion.

Source verification: GitHub full check and barrel drift detection passed at aca0fad6ed, run https://github.com/lofcz/plate/actions/runs/39882729777. Structured autoreview /tmp/plate-ordinal-review-clean.json reports zero findings after the accepted zero-ordinal repair. Source PR #57 is prepared for merge.
