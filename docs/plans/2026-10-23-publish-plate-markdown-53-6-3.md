# publish Plate Markdown 53.6.3

Objective:
Publish generated Plate Markdown and AI 53.6.3 metadata through CI, verify npm artifacts, and adopt Markdown in Sciobot.

Goal plan:
docs/plans/2026-10-23-publish-plate-markdown-53-6-3.md

Template:
docs/plans/templates/task.md

Primary template:
docs/plans/templates/task.md

Applied packs:
- package-api (docs/plans/templates/packs/package-api.md)

Task source:
- type: user release instruction; dedicated task invocation for generated version PR
- id / link: https://github.com/lofcz/plate/pull/58 (this plan owns PR #58)
- title: Publish Plate Markdown 53.6.3
- acceptance criteria: generated versions/changelogs only; CI publishes both packages; npm artifacts verified

Timed checkpoint:
- requested duration: N/A: none requested
- semantics: N/A: no timed checkpoint
- initial confidence score: 95%
- improvement loop: audit generated metadata against merged source PR #57
- final score / loop closure: 95%; npm artifacts and consumer proof verified

Completion threshold:
- Both 53.6.3 packages published, release tag verified, and source PR #57 fix present in the downloaded Markdown artifact.
- If a PR is created or updated, this exact task plan exists at the PR head,
  identifies that exact PR, and the PR body names it exactly once.
- Task closure is legal only when the source-of-truth acceptance criteria are
  satisfied or explicitly narrowed, required verification evidence is recorded,
  code-review and release-artifact gates are closed when applicable, tracker/PR
  sync is complete or marked N/A with reason, and
  `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-10-23-publish-plate-markdown-53-6-3.md` passes.

Verification surface:
- Exact unchanged implementation passed full check in GitHub run 39882729777; generated metadata audited via git diff; npm view/pack and release readback prove publication.

Constraints:
- Preserve existing user-facing behavior outside the task scope.
- Prefer the durable ownership boundary over caller-by-caller patches.
- Do not create PRs, comments, commits, or pushes unless the task/user/skill
  requires them.
- Do not add broad ceremony when the task is trivial or docs-only.

Boundaries:
- Source of truth: user request to release via gh; source PR #57; generated PR #58.
- Allowed edit scope: generated Markdown/AI versions and changelogs, consumed changeset, this task plan.
- Browser surface: N/A: version metadata has no UI change; source consumer Chromium evidence belongs to PR #57.
- Tracker sync: N/A: user request; PR #58 body is maintained.
- Non-goals: new source changes, beta branches, manual npm publishing.

Output budget strategy:
- Cap gh output to status and relevant steps; store complete CI output in /tmp/plate-ordinal-ci.log.

Blocked condition:
- Missing publishing auth or failed release workflow after one repair attempt blocks release.

Task state:
- task_type: release metadata
- task_complexity: multi-step generated release; no implementation changes
- current_phase: closeout
- current_phase_status: complete
- next_phase: final handoff
- goal_status: achieved

Current verdict:
- verdict: valid
- confidence: 95%
- next owner: task
- reason: generated metadata matches requested source fix and runtime-dependent release policy

Pre-solution issue challenge:
- reporter claim: release the merged Plate fix
- suggested diagnosis or fix: CI-controlled publication
- repro ladder:
  - tests / source-level repro: N/A: metadata release; source regression reproduced in PR #57
  - Playwright / automated browser: N/A: metadata has no browser behavior
  - Browser plugin: N/A: metadata has no browser behavior
  - screenshot / visual proof: N/A: metadata has no rendered surface
- reproduction verdict: N/A: publication request
- validity verdict: valid
- best long-term fix boundary: generated Changesets version PR and trusted-publishing workflow
- harsh honest feedback: no source changes belong in generated version PR
- hard-stop decision: proceed; exact source check passed

Completion rule:
- Do not call `update_goal(status: complete)` while any required checklist item
  remains unchecked. If an item does not apply, check it and add `N/A: <reason>`.
- Do not call `update_goal(status: complete)` until every completion threshold
  above is satisfied, final handoff evidence is recorded, and
  `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-10-23-publish-plate-markdown-53-6-3.md` passes.
- Do not create hook state for this goal. This file plus the active goal are the
  durable state.

Start Gates:
| Gate | Applies | Evidence |
|------|---------|----------|
| Timed checkpoint parsed | no | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Skill analysis before edits | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Active goal checked or created | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Source of truth read before edits | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Tracker comments and attachments read | no | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Video transcript evidence required | no | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Pre-solution issue challenge required | no | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Reproduction verdict before implementation | no | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Repro escalation ladder selected | no | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Suggested fix reviewed against durable boundary | no | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| `docs/solutions` checked for non-trivial existing-code work | no | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| TDD decision before behavior change or bug fix | no | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Branch decision for code-changing task | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Release artifact decision | yes | No exported API, peer range, package name or file layout changed. One Markdown patch changeset was consumed; CI also versioned AI as a runtime dependent. No registry UI or public documentation was edited; generated barrels passed CI. |
| Browser tool decision for browser surface | no | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| PR expectation decision | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Dedicated task plan selected for exact PR | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Tracker sync expectation decision | no | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Output budget strategy recorded | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Package/API pack selected | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Public surface or package boundary identified | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Release artifact path selected | yes | No exported API, peer range, package name or file layout changed. One Markdown patch changeset was consumed; CI also versioned AI as a runtime dependent. No registry UI or public documentation was edited; generated barrels passed CI. |
| `changeset` skill loaded when `.changeset` is required | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Barrel/export impact decision recorded | no | No exported API, peer range, package name or file layout changed. One Markdown patch changeset was consumed; CI also versioned AI as a runtime dependent. No registry UI or public documentation was edited; generated barrels passed CI. |

Work Checklist:
- [x] If a duration was requested, it is recorded as minimum active work unless
      explicitly marked hard stop; when no better metric exists, initial and
      final confidence scores are recorded.
- [x] Short objective plus outcome, completion threshold, verification surface,
      constraints, boundaries, and blocked condition are concrete.
- [x] Task source classified with source type, id/link, title, task type,
      acceptance criteria, caveats, likely files/routes/packages, browser
      surface, and root-cause layer.
- [x] Required video or screen-recording evidence is cached/read as normalized
      `<video-transcripts>` XML, or marked N/A with reason.
- [x] For public tracker bug reports, behavior claims, technical diagnoses, or
      suggested fixes, reporter claims are challenged before implementation
      with a recorded verdict: `valid`, `not reproduced`, `invalid`,
      `wont-fix`, `partially valid`, or `platform limitation`. Feature, docs,
      support, or cleanup requests with no bug claim may mark reproduction
      `N/A` with reason.
- [x] Repro escalation ladder followed for bug/behavior claims: focused
      test/source-level repro first when applicable; existing repo-owned
      Playwright regression/test harness next when available and useful as
      executable coverage; do not use standalone Playwright, Puppeteer, or raw
      DevTools as a substitute for the repo Browser policy;
      `[@Browser](plugin://browser@openai-bundled)` next when tests or
      Playwright cannot reproduce or cannot model the surface honestly;
      screenshot or explicit visual-proof waiver when visual/native state
      matters.
- [x] Hard-stop rule followed for bug/behavior claims: no code when the issue
      is not reproduced, invalid, or won't-fix; partial validity pivots to the
      best long-term fix and records what was wrong or incomplete in the issue's
      proposed path.
- [x] Nearby repo instructions and implementation patterns read before edits.
- [x] Implementation fixes the right ownership boundary, or the narrower choice
      is recorded with reason.
- [x] Release artifact requirement recorded: changeset, registry changelog, or
      N/A with reason.
- [x] Final handoff shape decided: bug/feature/testing/batch/review/tracker
      requirements, PR body sync, and issue/Linear sync when applicable.
- [x] Branch handling recorded for code-changing work: dedicated branch used,
      new branch needed, or N/A with reason.
- [x] Every PR has its own `task` invocation and dedicated plan; this plan is
      not aggregate evidence for another PR.
- [x] If a PR exists, its body has exactly one
      `🧭 Task plan: docs/plans/<plan>.md` line, this file exists at the exact PR
      head, and this plan records that exact PR number or URL.
- [x] Local-env-rot retry policy recorded for any surprising repo-wide failure:
      reinstall/rerun evidence or N/A with reason.
- [x] Workspace authority recorded: every proof command names the cwd/tool that
      owns the changed behavior.
- [x] High-risk note recorded for public API, runtime, package-boundary,
      browser behavior, agent-action, or command-contract changes, or marked
      N/A with reason.
- [x] Review/autoreview target selected from actual diff state for non-trivial
      implementation work, or marked N/A with reason.
- [x] Agent-native review decision recorded for `.agents/**`, `.claude/**`,
      `.codex/**`, skills, hooks, commands, prompts, or user-action tooling.
- [x] Output budget discipline recorded and followed: broad searches are
      scoped, capped, counted, or artifacted instead of streamed into goal
      context.
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
| Named verification threshold | yes | Run the command, proof, source audit, or artifact check named in this plan | This exact plan owns PR #58; version head e79369f485 has it and exactly one task-plan body line. Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass. Completion checker run before evidence commit. |
| Pre-solution issue challenge verdict | no | Record reporter claim, suggested fix, repro verdict, validity verdict, durable boundary, and hard-stop/pivot decision before implementation | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Repro escalation ladder | no | For bug/behavior claims, record test/source-level, Playwright, Browser, and screenshot/visual-proof outcomes or N/A/blocker reasons before `not reproduced` | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Bug reproduced before fix | yes | Record failing test/repro or N/A with reason | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Targeted behavior verification | yes | Run focused test/proof for changed behavior or record N/A | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| TypeScript or typed config changed | no | Run relevant typecheck | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Package exports or file layout changed | no | Run `pnpm brl` before final verification and keep generated barrel updates | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Package manifests, lockfile, or install graph changed | yes | Run `pnpm install` and relevant package checks | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Agent rules or skills changed | no | Run `pnpm install` and verify generated skill sync | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Workspace authority proof | yes | Run verification in the owning repo/package/app/route/tool and record cwd; do not count the wrong workspace as proof | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Browser surface changed | no | Capture Browser Use proof or record explicit waiver/blocker | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Browser final proof | no | Attach screenshot or exact browser verification caveat when browser proof applies | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| CI-controlled template output changed | no | Restore generated template output or record why it is intentionally kept | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Package behavior or public API changed | yes | Add a changeset or record why no changeset applies | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| User-visible registry output changed | no | Use the registry-changelog pack: add/update `apps/www/src/registry/changelog/entries/*.mdx`, run `node tooling/scripts/generate-ui-changelog-entries.mjs --write`, run `node tooling/scripts/generate-ui-changelog-entries.mjs --check`, or record N/A | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Docs or content changed | no | For docs-heavy work, use `--template docs`; for supporting public docs/content/API/example changes, load `docs-creator` and close the docs pack; for typo/link-only edits, record the explicit reason and proportional proof | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| High-risk mini gate | yes | For public API/runtime/package-boundary/browser/agent-action/command-contract changes, record realistic failure mode, proof plan, and why the chosen boundary is right; otherwise N/A | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Agent-native review for agent/tooling changes | no | For `.agents/**`, `.claude/**`, `.codex/**`, skills, hooks, commands, prompts, or user-action tooling, load `.agents/skills/agent-native-reviewer/SKILL.md` and close accepted/actionable findings, or record N/A | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Local install corruption suspected | no | Run `pnpm run reinstall` once, rerun the exact failing command, or record N/A | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Autoreview for non-trivial implementation changes | no | Load `.agents/skills/autoreview/SKILL.md`; use dirty local `--mode local`, branch/PR `--mode branch --base <base>`, or committed slice `--mode commit --commit <ref>` until no accepted/actionable findings, or record N/A for docs-only/trivial/no local patch | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| PR create or update | yes | Run `check` before PR work and sync PR body to the task-style final handoff | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Per-PR task ownership | yes | Verify one task-plan body line, plan at exact head, and exact PR ownership in this plan | This exact plan owns PR #58; version head e79369f485 has it and exactly one task-plan body line. Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass. Completion checker run before evidence commit. |
| Task-style PR body verified | yes | Verify the PR body with `gh pr view --json body`; it must preserve auto-release blocks when applicable, must not include a current-PR self-link, and must use the kitcn PR #270 emoji format: `🐛 Fixes ...`, `🟢 95-100% confidence`, `Phase / 🧪 Tests / 🌐 Browser` table, and bold emoji Outcome/Caveat/Design/Verified sections | This exact plan owns PR #58; version head e79369f485 has it and exactly one task-plan body line. Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass. Completion checker run before evidence commit. |
| PR proof image hosting | no | If PR body needs browser proof, replace local image paths with hosted GitHub URLs or record N/A | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Tracker sync-back | no | Post concise issue/Linear sync after PR exists, or record N/A/blocker | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Final handoff contract | yes | Fill the final handoff fields below with exact PR/issue/confidence/tests/browser/outcome/caveats/design/verification content or N/A reason | This exact plan owns PR #58; version head e79369f485 has it and exactly one task-plan body line. Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass. Completion checker run before evidence commit. |
| Final lint | yes | Run `pnpm lint:fix` or scoped equivalent | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Output budget discipline | yes | Verify no unbounded high-volume command output was streamed, or record the accidental output and recovery | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Timed checkpoint | no | If duration was requested, keep improving until elapsed, then finish the current loop cleanly; otherwise N/A | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Goal plan complete | yes | Run `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-10-23-publish-plate-markdown-53-6-3.md` | This exact plan owns PR #58; version head e79369f485 has it and exactly one task-plan body line. Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass. Completion checker run before evidence commit. |
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
| Intake and source read | complete | Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass. | Final handoff |
| Implementation | complete | Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass. | Final handoff |
| Verification | complete | Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass. | Final handoff |
| PR / tracker sync | complete | Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass. | Final handoff |
| Closeout | complete | Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass. | Final handoff |

Findings:
- No remaining release findings; generated metadata contains no source changes.

Decisions and tradeoffs:
- No remaining release findings; generated metadata contains no source changes.

Implementation notes:
- No remaining release findings; generated metadata contains no source changes.

Review fixes:
- No remaining release findings; generated metadata contains no source changes.

Error attempts:
| Error / failed attempt | Count | Next different move | Resolution |
|------------------------|-------|---------------------|------------|
| None yet | 0 | | |

Verification evidence:
- Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass.

Final handoff contract:
- PR line: https://github.com/lofcz/plate/pull/58
- Issue / tracker line: N/A: direct user request
- Confidence line: 95%
- Flow table:
  - Reproduced: N/A: version metadata; source regression owned by PR #57
  - Verified: source full CI and generated metadata audit; published consumer tests and Chromium pass
- Browser check: actual installed package passes Chromium; full-app rerun has unrelated grant API build limitation
- Outcome: both packages published at 53.6.3 and consumer patch removed
- Caveat: consumer full typecheck and bridge build encounter unrelated grant form/API edits
- Design:
  - Chosen boundary: trusted-publishing CI and Changesets metadata
  - Why not quick patch: consumer dependency patch replaced with actual npm release
  - Why not broader change: no new implementation belongs in version metadata PR
- Verified: Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass.
- PR body verified: gh pr view #58; exactly one task plan line, task format preserved

Task-style PR body contract:
- Preserve any existing `<!-- auto-release:start -->` block. If a changeset is
  part of the diff and repo policy expects auto release, include that block.
- Use the accepted kitcn PR #270 visual format. The body starts with an emoji
  issue/tracker/fix line, for example `🐛 Fixes #123` or `🐛 Fixes ➖ N/A`, then
  exactly one `🧭 Task plan: docs/plans/<plan>.md` line, then an emoji
  confidence line like `🟢 95-100% confidence`. The plan must exist at the
  exact PR head and identify that exact PR.
- Use this exact table header: `| Phase | 🧪 Tests | 🌐 Browser |`.
- Use `Reproduced` and `Verified` rows. Mark passing proof with `🟢`, repro or
  failing proof with `🔴`, and non-applicable cells with `➖ N/A`.
- Use bold emoji section headings: `**✅ Outcome**`, `**⚠️ Caveat**`,
  `**🏗️ Design**`, and `**🧪 Verified**`.
- Never include a line that links to the current PR itself. The current PR URL
  belongs in the final response, not in its own description.
- Do not replace this with a generic `Summary` / `Verification` PR body, an
  adaptive prose body from a git helper skill, plain `## Outcome` sections, or
  an unrelated generated badge footer unless the caller or repo template
  explicitly asks for it.
- Proof is `gh pr view --json body` output or a concise source-backed summary
  of that output.

Final handoff / sync:
- PR: https://github.com/lofcz/plate/pull/58 (merged)
- Task plan at exact PR head: e79369f485, this file identifies #58
- Issue / tracker: N/A: direct user request
- Browser proof: /tmp/plate-53.6.3-artifact/chromium-proof.json and .png
- Caveats: unrelated consumer grant errors; see verification limits below

Timeline:
- 2026-10-23T01:23:17.530Z Task goal plan created.

Reboot status:
| Question | Answer |
|----------|--------|
| Where am I? | Release verified, consumer upgraded |
| Where am I going? | Final handoff |
| What is the goal? | Publish and verify both 53.6.3 packages |
| What have I learned? | See Findings |
| What have I done? | See Timeline |

Open risks:
- Published Markdown/AI latest 53.6.3; release run 39884162641 passed both jobs; npm tarball contains paragraph.start ?? 1. Sciobot manifest/lock/installed graph uses both 53.6.3 packages and no patch; 9 editor tests and actual Chromium parse/mutate/reparse pass.

Implementation audit:
- Generated PR #58 at 93bb091e93 changes only five release-metadata files. Markdown and AI patch versions are 53.6.3; prepare-release-changesets.mjs automatically includes AI as a runtime dependent. No package names, exports, peer ranges or implementation files changed.
- Full source check run 39882729777 completed successfully. Local duplicate build was stopped after exact source CI passed; a concurrent focused rerun had encountered a temporarily missing rebuilt Slate dist, not an implementation failure. No install corruption remains in the CI proof.
- This is the separate task invocation/plan for PR #58, not aggregate source-PR evidence. No second implementation autoreview applies to generated metadata; source structured review has zero findings.
- High-risk note: stale or wrong npm package is the release risk; verify exact published version and downloaded artifact before updating the consumer.

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
