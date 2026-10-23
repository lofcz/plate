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
| Release artifact path selected | yes | No exported API, peer range, package name or file layout changed. One Markdown patch changeset was consumed; CI also versioned AI as a runtime dependent. No registry UI or public documentation was edited; generated barrels passed CI. |
| `changeset` skill loaded when `.changeset` is required | yes | One @lofcz/platejs-markdown patch changeset |
| Barrel/export impact decision recorded | no | No exported API, peer range, package name or file layout changed. One Markdown patch changeset was consumed; CI also versioned AI as a runtime dependent. No registry UI or public documentation was edited; generated barrels passed CI. |

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
- [x] Current `main`, `next`, npm, GitHub release, and workflow state recorded.
- [x] Promotion PR reviewed or marked N/A.
- [x] Stable release workflow watched or marked N/A.
- [x] Direct `main -> next` sync dry run completed or marked N/A.
- [x] Clean checkout verified by the direct sync script before any real push, or
      N/A because only dry-run/status was requested.
- [x] Direct sync pushed to `next` when needed or blocker recorded.
- [x] Known release metadata conflicts auto-resolved by script or N/A.
- [x] Beta changesets created for packages changed by synced `main` commits or N/A.
- [x] Generated beta sync changesets versioned before push, or N/A because no
      package changes were synced.
- [x] Direct sync commit message triggers release only when versioned beta
      package changes exist; otherwise it includes `[skip release]`.
- [x] Beta pre mode exists on `next` in the sync commit, or standalone re-entry
      is N/A because no beta publication is pending.
- [x] Beta release workflow watched when beta publication is expected.
- [x] npm `latest` and `beta` read back.
- [x] Stale `sync/main-to-next` PRs closed after direct sync, or N/A.
- [x] Release-lane review completed: no wrong tag, wrong branch, missing pre
      state, unmerged source conflict, or unpublished expected package remains.
- [x] Package/API pack: public API, package boundary, export, and release-artifact impact are recorded.
- [x] Package/API pack: release artifact matrix is applied: `.changeset`, registry changelog, or explicit no-artifact reason.
- [x] Package/API pack: `.changeset` work loads `changeset` and follows its package/version/prose rules.
- [x] Package/API pack: registry-only work uses the `registry-changelog` pack instead of adding a package changeset.
- [x] Package/API pack: no-artifact decisions state why the diff has no published package user-visible delta from `main`.
- [x] Package/API pack: compatibility, migration, or hard-cut decision is explicit when public shape changes.
- [x] Package/API pack: package-owned typecheck/build/test proof is recorded or marked N/A with reason.
- [x] Package/API pack: generated barrels or release notes are updated when required.

Completion Gates:
| Gate | Applies | Required action | Evidence |
|------|---------|-----------------|----------|
| Direct sync needed | no | Compare `origin/next..origin/main` | N/A: this fork has no next branch or beta lane; stable patch publication only. No sync, promotion, beta pre-mode or stale sync branch exists. |
| Direct sync result | no | Run direct sync or record no-op | N/A: this fork has no next branch or beta lane; stable patch publication only. No sync, promotion, beta pre-mode or stale sync branch exists. |
| Sync merge verification | no | Run `verify-main-to-next-sync` on merge commit | N/A: this fork has no next branch or beta lane; stable patch publication only. No sync, promotion, beta pre-mode or stale sync branch exists. |
| Beta pre mode | no | Read `.changeset/pre.json` on `next` | N/A: this fork has no next branch or beta lane; stable patch publication only. No sync, promotion, beta pre-mode or stale sync branch exists. |
| Latest release state | yes | Read GitHub release and npm `latest` | Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass. https://github.com/lofcz/plate/releases/tag/v53.6.3 |
| Beta release state | no | Read release workflow and npm `beta` | N/A: this fork has no next branch or beta lane; stable patch publication only. No sync, promotion, beta pre-mode or stale sync branch exists. |
| Stale sync PR cleanup | no | Close stale sync PRs or record N/A | N/A: this fork has no next branch or beta lane; stable patch publication only. No sync, promotion, beta pre-mode or stale sync branch exists. |
| Autoreview | yes | Review release-lane result and close accepted findings | Structured source autoreview /tmp/plate-ordinal-review-clean.json: zero findings after zero-ordinal fix. Release metadata and actual published artifact audited. |
| Goal plan complete | yes | Run `node .agents/skills/autogoal/scripts/check-complete.mjs <this plan>` | This exact plan owns PR #57; source head e1cdda2fbf has it and exactly one task-plan body line. Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass. Completion checker run before evidence commit. |
| Public API / package boundary proof | yes | Source-audit public API, exports, and package boundary impact | No exported API, peer range, package name or file layout changed. One Markdown patch changeset was consumed; CI also versioned AI as a runtime dependent. No registry UI or public documentation was edited; generated barrels passed CI. |
| Release artifact classification | yes | Record whether the change is published package behavior/API/types/config/runtime, registry-only, or no published user-visible delta | No exported API, peer range, package name or file layout changed. One Markdown patch changeset was consumed; CI also versioned AI as a runtime dependent. No registry UI or public documentation was edited; generated barrels passed CI. |
| Published package changeset | yes | If published package users see a delta, load `changeset`, add/update one `.changeset/*.md` per package, and prove no forbidden `minor` on `@platejs/slate`, `@platejs/core`, or `platejs` | No exported API, peer range, package name or file layout changed. One Markdown patch changeset was consumed; CI also versioned AI as a runtime dependent. No registry UI or public documentation was edited; generated barrels passed CI. |
| Registry changelog | no | If the change is registry-only under `apps/www/src/registry/**`, use the `registry-changelog` pack and do not add a package changeset | No exported API, peer range, package name or file layout changed. One Markdown patch changeset was consumed; CI also versioned AI as a runtime dependent. No registry UI or public documentation was edited; generated barrels passed CI. |
| No release artifact | no | If no artifact is needed, record the exact reason: internal-only, docs-only, agent-only, test-only, or no user-visible delta from `main` | No exported API, peer range, package name or file layout changed. One Markdown patch changeset was consumed; CI also versioned AI as a runtime dependent. No registry UI or public documentation was edited; generated barrels passed CI. |
| Package typecheck/build/test | yes | Run owning package checks or record N/A with reason | Exact source full GitHub check 39882729777 passed lint, 56 package builds, 56 typechecks and full test tiers; 9 consumer editor tests pass after final package upgrades. Consumer full typecheck has 4 unrelated grant-form errors, recorded below. |
| Barrel/export generation | no | Run `pnpm brl` when exports or exported file layout changed, otherwise N/A | No exported API, peer range, package name or file layout changed. One Markdown patch changeset was consumed; CI also versioned AI as a runtime dependent. No registry UI or public documentation was edited; generated barrels passed CI. |

Phase / pass table:
| Phase | Status | Evidence | Next |
|-------|--------|----------|------|
| State read | complete | Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass. | Final handoff |
| Promote stable | complete | N/A: this fork has no next branch or beta lane; stable patch publication only. No sync, promotion, beta pre-mode or stale sync branch exists. | Final handoff |
| Direct sync | complete | N/A: this fork has no next branch or beta lane; stable patch publication only. No sync, promotion, beta pre-mode or stale sync branch exists. | Final handoff |
| Beta release | complete | N/A: this fork has no next branch or beta lane; stable patch publication only. No sync, promotion, beta pre-mode or stale sync branch exists. | Final handoff |
| Cleanup and closeout | complete | Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass. | Final handoff |

Findings:
- No remaining release findings; zero-ordinal review finding was fixed before merge.

Timeline:
- Source PR #57 merged at de3fd5fdb7; version PR #58 merged at 2d13e0fb2a; publishing and generated registry/template jobs passed in https://github.com/lofcz/plate/actions/runs/39884162641. CI main after generated sync: 831819328e.

Decisions and tradeoffs:
- Direct sync is the default because routine release metadata conflicts are
  deterministic machinery, not human review material.

Review fixes:
- No remaining release findings; zero-ordinal review finding was fixed before merge.

Error attempts:
| Error / failed attempt | Count | Next different move | Resolution |
|------------------------|-------|---------------------|------------|
| None yet | 0 | | |

Verification evidence:
- Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass.

Reboot status:
| Where am I? | Where am I going? | What is the goal? | What learned? | What done? |
|-------------|-------------------|-------------------|---------------|------------|
| Stable release verified and consumer upgraded | Final handoff | Published fix without dependency patch | npm propagation verified using no-cache readback | Source and version PRs merged; checks below |

Open risks:
- Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass.

Release scope clarification:
- This fork has no next branch. Beta sync, pre-mode restoration and stale sync PR cleanup are N/A; user requested a stable source-fix release only.
- gh commands must specify -R lofcz/plate because bare gh resolves to upstream udecode/plate.
- Browser plugin discovery found no Browser/browser-use tool. Parser behavior is verified in the owning package; the published consumer will be checked in actual Chromium in sciobot-next under the user's explicit real-Chromium instruction.
- Before-fix /tmp/plate-ordinal-before.log: exact 1./3./5. disappearance reproduced (1 failing regression).
- After-fix /tmp/plate-ordinal-after.log: all 5 list deserializer tests pass, including normalized serialization round trip.
- Default autoreview gpt-5.5 is unsupported on this ChatGPT account. Retry uses the account's configured gpt-6.1-sol; no user-requested engine/model was overridden.
- Exact source commit aca0fad6ed passed full GitHub CI check in run 39882729777; redundant local build was stopped after CI passed; source risk remains confined to one-item ordered lists beginning a bullet's contents. Genuine multi-item nested lists retain their existing path.

Review cycle 1: accepted zero-ordinal finding; reconstruct with nullish fallback, and include `0. month` in the parse/round-trip regression. No API or scope expansion.

Source verification: GitHub full check and barrel drift detection passed at aca0fad6ed, run https://github.com/lofcz/plate/actions/runs/39882729777. Structured autoreview /tmp/plate-ordinal-review-clean.json reports zero findings after the accepted zero-ordinal repair. Source PR #57 is prepared for merge.

Final release and consumer evidence:
- GitHub release: https://github.com/lofcz/plate/releases/tag/v53.6.3; source PR #57 and dedicated version PR #58 merged. Publish run https://github.com/lofcz/plate/actions/runs/39884162641 concluded success, including registry/template CI.
- Markdown and AI npm latest both read back as 53.6.3. Markdown integrity: sha512-TgmIGAveIMwDfU3vGb5nqdRG825UT5d5i1KaPp2vEEkTowKGz9VQJApJ1xcGUKMS7tKvktu2MwRuBH5+v1IJfg==. Downloaded tarball in /tmp/plate-53.6.3-artifact contains the one-item ordered-wrapper fix with nullish fallback.
- Consumer cwd /run/media/lofcz/ssd_external/GitHub/sciobot-next: both direct dependency and override aliases updated to 53.6.3 for Markdown and AI. bun install --ignore-scripts completed; no patchedDependencies or old nested Markdown remains. Temporary patch removed without touching other dirty work. No app commit/deployment was made.
- /tmp/sciobot-plate-53.6.3-editor-final.log: 9 passed, 0 failed after final AI/Markdown graph upgrade. Real direct AI edits, literal ordinals 0/1/3/5, serialize/reparse and reload data are covered.
- Actual Chromium against bundled installed package: /tmp/plate-53.6.3-artifact/chromium-proof.log/json/png. Parse, editor mutation, serialize/reparse preserve 0/1/3/5; stable serialization and zero page errors. This is isolated package browser proof, not a fresh full-app real-model E2E pass. Original two-workspace real API/Chromium E2E passed with equivalent dependency patch before source publication.

Verification limits:
- Full consumer typecheck currently reports four unrelated errors in grant StepPotreby.tsx/useGrantAutosave.ts. Broad workspace bridge test compilation fails on duplicate recordGrantConsent exports in concurrently edited src/services/schoolsApi.ts. These files are outside release edits and were preserved. Full-app browser retry is recorded separately; no post-release full-app E2E success is claimed.
- No beta lane exists on this fork (git ls-remote next and sync/main-to-next empty); all beta/sync/promotion checklist items are checked as explicit N/A. No exported API or public docs changed; docs-creator/registry changelog and new barrel generation are N/A. Existing CI barrel drift check passed. Metadata-only version PR does not require a second implementation autoreview or changeset; the source PR owns those. No agent-rule changes, tracker issue, video, timed checkpoint or image hosting applies.
- Open release risks: None. Consumer-wide grant checks remain outside this release scope.

Post-release full-app retry result:
- /tmp/sciobot-plate-53.6.3-e2e.log: first workspace loaded in fresh Chromium and exactly matched the saved real-model result. The next workspace login failed ECONNREFUSED after the local API disappeared. Frontend rebuild also reports unrelated grant API export linking errors. These are explicit limits of the post-release full-app retry, not a claimed two-workspace pass.
