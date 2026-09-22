# Animated direct AI document edits

Objective:
Ship animated direct AI edits in Plate and Sciobot, verify history and browser behavior, publish via GitHub CI, and consume the published npm version.

Goal plan:
docs/plans/2026-09-22-animated-direct-ai-document-edits.md

Template:
docs/plans/templates/task.md

Primary template:
docs/plans/templates/task.md

Applied packs:
- browser (docs/plans/templates/packs/browser.md)
- package-api (docs/plans/templates/packs/package-api.md)

Task source:
- type: user feature request
- id / link: this conversation (no tracker)
- title: Animated direct AI editing for Plate materials
- acceptance criteria: explicit requirements listed below, including npm publication and Sciobot integration

Timed checkpoint:
- requested duration: N/A: no duration requested
- semantics: one-shot execution
- initial confidence score: N/A: use executable evidence
- improvement loop: unit, browser, source review, repair, release
- final score / loop closure: executable checks and publication evidence recorded below

Completion threshold:
- Direct edits default on; explicit suggestions retained; animated top-to-bottom reveal and scrolling; normal undo/redo; playground E2E; published npm package integrated in Sciobot.
- If a PR is created or updated, this exact task plan exists at the PR head,
  identifies that exact PR, and the PR body names it exactly once.
- Task closure is legal only when the source-of-truth acceptance criteria are
  satisfied or explicitly narrowed, required verification evidence is recorded,
  code-review and release-artifact gates are closed when applicable, tracker/PR
  sync is complete or marked N/A with reason, and
  `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-09-22-animated-direct-ai-document-edits.md` passes.

Verification surface:
- Plate: direct-edit package tests; playwright.direct-edit.config.ts; pnpm check; autoreview. Sciobot: typecheck, existing edit/suggestion regressions; npm version and export readback.

Constraints:
- Preserve existing user-facing behavior outside the task scope.
- Prefer the durable ownership boundary over caller-by-caller patches.
- Do not create PRs, comments, commits, or pushes unless the task/user/skill
  requires them.
- Do not add broad ceremony when the task is trivial or docs-only.

Boundaries:
- Source of truth: user feature request and robustness follow-up.
- Allowed edit scope: Plate AI package, source-map playground, tests/release/plan; Sciobot shared Plate review bridge and document tool schemas.
- Browser surface: http://127.0.0.1:3999/#direct-edit.
- Tracker sync: N/A: no tracker item. PR and release only.
- Non-goals: changing worksheet JSON review, slide editing, existing registry or templates.

Output budget strategy:
- Focused source reads; command logs under /tmp/plate-ai-*; capped excerpts.

Blocked condition:
- Missing GitHub publication access or a verified release gate with no in-scope repair.

Task state:
- task_type: additive feature
- task_complexity: non-trivial
- current_phase: closeout
- current_phase_status: done
- next_phase: complete
- goal_status: complete

Current verdict:
- verdict: completed with authorized baseline exception
- confidence: focused package/browser/integration checks passed
- next owner: task
- reason: published package consumed by Sciobot; see final evidence

Pre-solution issue challenge:
- reporter claim: users do not accept suggestion overlays; direct edits requested
- suggested diagnosis or fix: optional explicit-suggestion flag and shared direct-edit API
- repro ladder:
  - tests / source-level repro: N/A feature request; tests cover required behavior
  - Playwright / automated browser: nine scenarios passed
  - Browser plugin: unavailable; dev-browser fallback used
  - screenshot / visual proof: final screenshot inspected
- reproduction verdict: N/A additive feature
- validity verdict: valid user requirement
- best long-term fix boundary: package transforms/playback, shared Sciobot routing
- harsh honest feedback: old review-only default does not meet the requested direct editing behavior
- hard-stop decision: none

Completion rule:
- Do not call `update_goal(status: complete)` while any required checklist item
  remains unchecked. If an item does not apply, check it and add `N/A: <reason>`.
- Do not call `update_goal(status: complete)` until every completion threshold
  above is satisfied, final handoff evidence is recorded, and
  `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-09-22-animated-direct-ai-document-edits.md` passes.
- Do not create hook state for this goal. This file plus the active goal are the
  durable state.

Start Gates:
| Gate | Applies | Evidence |
|------|---------|----------|
| Timed checkpoint parsed | N/A | User feature request; no tracker, video, timed duration, or bug reproduction prerequisite. |
| Skill analysis before edits | yes | See requirement extraction, execution decisions, and source-backed verification checkpoints below. |
| Active goal checked or created | N/A | Durable file used; user did not request a goal-tool lifecycle. |
| Source of truth read before edits | yes | See requirement extraction, execution decisions, and source-backed verification checkpoints below. |
| Tracker comments and attachments read | N/A | User feature request; no tracker, video, timed duration, or bug reproduction prerequisite. |
| Video transcript evidence required | N/A | User feature request; no tracker, video, timed duration, or bug reproduction prerequisite. |
| Pre-solution issue challenge required | N/A | User feature request; no tracker, video, timed duration, or bug reproduction prerequisite. |
| Reproduction verdict before implementation | N/A | User feature request; no tracker, video, timed duration, or bug reproduction prerequisite. |
| Repro escalation ladder selected | N/A | User feature request; no tracker, video, timed duration, or bug reproduction prerequisite. |
| Suggested fix reviewed against durable boundary | yes | See requirement extraction, execution decisions, and source-backed verification checkpoints below. |
| `docs/solutions` checked for non-trivial existing-code work | yes | See requirement extraction, execution decisions, and source-backed verification checkpoints below. |
| TDD decision before behavior change or bug fix | yes | See requirement extraction, execution decisions, and source-backed verification checkpoints below. |
| Branch decision for code-changing task | yes | codex/animated-ai-edits; one task plan, PR after required check, then authorized release. |
| Release artifact decision | yes | Changeset skill read; package patch changesets and generated barrels; npm publication requested. |
| Browser tool decision for browser surface | yes | Source-map playground #direct-edit; dev-browser fallback and repository Chromium E2E; see verification checkpoint. |
| PR expectation decision | yes | codex/animated-ai-edits; one task plan, PR after required check, then authorized release. |
| Dedicated task plan selected for exact PR | yes | codex/animated-ai-edits; one task plan, PR after required check, then authorized release. |
| Tracker sync expectation decision | N/A | User feature request; no tracker, video, timed duration, or bug reproduction prerequisite. |
| Output budget strategy recorded | yes | See requirement extraction, execution decisions, and source-backed verification checkpoints below. |
| Browser pack selected | yes | Source-map playground #direct-edit; dev-browser fallback and repository Chromium E2E; see verification checkpoint. |
| Browser route / app surface identified | yes | Source-map playground #direct-edit; dev-browser fallback and repository Chromium E2E; see verification checkpoint. |
| Browser tool decision recorded | yes | Source-map playground #direct-edit; dev-browser fallback and repository Chromium E2E; see verification checkpoint. |
| Console/network caveat policy recorded | yes | Source-map playground #direct-edit; dev-browser fallback and repository Chromium E2E; see verification checkpoint. |
| Package/API pack selected | yes | See requirement extraction, execution decisions, and source-backed verification checkpoints below. |
| Public surface or package boundary identified | yes | See requirement extraction, execution decisions, and source-backed verification checkpoints below. |
| Release artifact path selected | yes | Changeset skill read; package patch changesets and generated barrels; npm publication requested. |
| `changeset` skill loaded when `.changeset` is required | yes | Changeset skill read; package patch changesets and generated barrels; npm publication requested. |
| Barrel/export impact decision recorded | yes | Changeset skill read; package patch changesets and generated barrels; npm publication requested. |


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
- [x] Browser pack: route, interaction path, and expected visible outcome are recorded before proof.
- [x] Browser pack: browser proof uses the repo-approved browser tool or records a blocker/waiver.
- [x] Browser pack: console and network errors are checked or explicitly out of scope.
- [x] Browser pack: screenshot, trace, or exact verification caveat is ready for final handoff.
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
| Named verification threshold | yes | Run the command, proof, source audit, or artifact check named in this plan | See final release/integration evidence below. |
| Pre-solution issue challenge verdict | N/A | Record reporter claim, suggested fix, repro verdict, validity verdict, durable boundary, and hard-stop/pivot decision before implementation | Additive user feature; no specific reported defect requires reproduction. |
| Repro escalation ladder | N/A | For bug/behavior claims, record test/source-level, Playwright, Browser, and screenshot/visual-proof outcomes or N/A/blocker reasons before `not reproduced` | Additive feature; package tests, repository browser tests, and dev-browser visual inspection supply behavior proof. |
| Bug reproduced before fix | N/A | Record failing test/repro or N/A with reason | Additive feature; the listStart review finding has a focused regression. |
| Targeted behavior verification | yes | Run focused test/proof for changed behavior or record N/A | 14 package tests / 313 assertions, nine Chromium scenarios, 22 Sciobot regression tests. |
| TypeScript or typed config changed | yes | Run relevant typecheck | Root Plate check passed all 56 package typechecks; Sciobot final checks recorded below. |
| Package exports or file layout changed | yes | Run `pnpm brl` before final verification and keep generated barrel updates | pnpm brl generated AI and core React exports; committed. |
| Package manifests, lockfile, or install graph changed | yes | Run `pnpm install` and relevant package checks | pnpm install succeeded with tinyexec ^1.2.4; package checks passed. |
| Agent rules or skills changed | N/A | Run `pnpm install` and verify generated skill sync | No agent rules or skill source changed. |
| Workspace authority proof | yes | Run verification in the owning repo/package/app/route/tool and record cwd; do not count the wrong workspace as proof | Plate commands in GitHub/plate; Sciobot checks in GitHub/sciobot-next. Browser route is localhost:3999/#direct-edit. |
| Browser surface changed | yes | Capture Browser Use proof or record explicit waiver/blocker | Browser plugins unavailable; dev-browser fallback connected to dedicated Chromium and exercised playground. |
| Browser final proof | yes | Attach screenshot or exact browser verification caveat when browser proof applies | /home/lofcz/.dev-browser/tmp/plate-ai-final.png inspected; nine browser scenarios pass. |
| CI-controlled template output changed | N/A | Restore generated template output or record why it is intentionally kept | No template files changed; release CI owns generated output. |
| Package behavior or public API changed | yes | Add a changeset or record why no changeset applies | Three patch changesets included; AI React barrel exports applyAnimatedAIEdit. |
| User-visible registry output changed | N/A | Use the registry-changelog pack: add/update `apps/www/src/registry/changelog/entries/*.mdx`, run `node tooling/scripts/generate-ui-changelog-entries.mjs --write`, run `node tooling/scripts/generate-ui-changelog-entries.mjs --check`, or record N/A | No registry component changes. |
| Docs or content changed | N/A | For docs-heavy work, use `--template docs`; for supporting public docs/content/API/example changes, load `docs-creator` and close the docs pack; for typo/link-only edits, record the explicit reason and proportional proof | Only internal task evidence and changesets; no public reference docs changed. |
| High-risk mini gate | yes | For public API/runtime/package-boundary/browser/agent-action/command-contract changes, record realistic failure mode, proof plan, and why the chosen boundary is right; otherwise N/A | History, rich content, cancellation and user-input races covered by unit, browser, and hook tests; package owns transforms and playback. |
| Agent-native review for agent/tooling changes | yes | For `.agents/**`, `.claude/**`, `.codex/**`, skills, hooks, commands, prompts, or user-action tooling, load `.agents/skills/agent-native-reviewer/SKILL.md` and close accepted/actionable findings, or record N/A | Tool schema/prompt review: optional false default, explicit true only, ordered edits, shared routing. No accepted findings remain. |
| Local install corruption suspected | N/A | Run `pnpm run reinstall` once, rerun the exact failing command, or record N/A | Transient dist resolution overlapped the root build; sequential rerun passed. Table fixture failures reproduce independently in unchanged code. |
| Autoreview for non-trivial implementation changes | yes | Load `.agents/skills/autoreview/SKILL.md`; use dirty local `--mode local`, branch/PR `--mode branch --base <base>`, or committed slice `--mode commit --commit <ref>` until no accepted/actionable findings, or record N/A for docs-only/trivial/no local patch | Four Plate reviews and Sciobot review completed; listStart fixed. Source-backed rejection of false Slate mutation/null-property claims recorded below. |
| PR create or update | yes | Run `check` before PR work and sync PR body to the task-style final handoff | Full check executed: lint/build/types pass, 109 baseline table failures. User explicitly authorized publication with failures documented in PR #42. |
| Per-PR task ownership | yes | Verify one task-plan body line, plan at exact head, and exact PR ownership in this plan | PR #42 body has exactly one task-plan line; plan at head 8378804166 identifies PR #42; readback verified. |
| Task-style PR body verified | yes | Verify the PR body with `gh pr view --json body`; it must preserve auto-release blocks when applicable, must not include a current-PR self-link, and must use the kitcn PR #270 emoji format: `🐛 Fixes ...`, `🟢 95-100% confidence`, `Phase / 🧪 Tests / 🌐 Browser` table, and bold emoji Outcome/Caveat/Design/Verified sections | gh pr view body readback contains auto-release block, task line, emoji sections and phase table; no self-link. |
| PR proof image hosting | N/A | If PR body needs browser proof, replace local image paths with hosted GitHub URLs or record N/A | PR cites executable browser cases; screenshot is local visual inspection evidence, not embedded in PR. |
| Tracker sync-back | N/A | Post concise issue/Linear sync after PR exists, or record N/A/blocker | No issue or tracker supplied. |
| Final handoff contract | yes | Fill the final handoff fields below with exact PR/issue/confidence/tests/browser/outcome/caveats/design/verification content or N/A reason | See populated final handoff fields and release evidence. |
| Final lint | yes | Run `pnpm lint:fix` or scoped equivalent | Plate root lint and scoped checks passed; Sciobot scoped lint recorded below. |
| Output budget discipline | yes | Verify no unbounded high-volume command output was streamed, or record the accidental output and recovery | Logs artifacted under /tmp; accidental long generated release-index lines were truncated; subsequent queries use selected fields. |
| Timed checkpoint | N/A | If duration was requested, keep improving until elapsed, then finish the current loop cleanly; otherwise N/A | No timed duration requested. |
| Goal plan complete | yes | Run `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-09-22-animated-direct-ai-document-edits.md` | Completion checker run at final closeout. |
| Browser interaction proof | yes | Exercise the target route/interaction with the approved browser tool or record blocker | dev-browser exercised direct-edit mode; repository browser suite covers ordered edits, undo, interruptions, rich content and nested preparation. |
| Browser console/network check | yes | Record console/network state or why it is not applicable | No external network required for local playground; E2E behavior passes. Console/network cleanliness is not a release claim. |
| Browser final proof artifact | yes | Record screenshot/trace/route proof or exact caveat | /home/lofcz/.dev-browser/tmp/plate-ai-final.png; E2E output under ignored test-results/direct-edit. |
| Public API / package boundary proof | yes | Source-audit public API, exports, and package boundary impact | Additive applyAnimatedAIEdit export from @platejs/ai/react; options documented in source; no migration required. |
| Release artifact classification | yes | Record whether the change is published package behavior/API/types/config/runtime, registry-only, or no published user-visible delta | Published runtime/API changes: AI package, generated core exports, depset dependency; all patch changesets. |
| Published package changeset | yes | If published package users see a delta, load `changeset`, add/update one `.changeset/*.md` per package, and prove no forbidden `minor` on `@platejs/slate`, `@platejs/core`, or `platejs` | AI/core/depset patch changesets; no forbidden minor changes. |
| Registry changelog | N/A | If the change is registry-only under `apps/www/src/registry/**`, use the `registry-changelog` pack and do not add a package changeset | Published package feature, not registry-only. |
| No release artifact | N/A | If no artifact is needed, record the exact reason: internal-only, docs-only, agent-only, test-only, or no user-visible delta from `main` | Patch changesets required and supplied for three affected published packages. |
| Package typecheck/build/test | yes | Run owning package checks or record N/A with reason | Root build and 56 typechecks pass; AI 14 tests pass; table baseline exception explicitly authorized. |
| Barrel/export generation | yes | Run `pnpm brl` when exports or exported file layout changed, otherwise N/A | pnpm brl run and generated exports committed. |

Phase / pass table:
| Phase | Status | Evidence | Next |
|-------|--------|----------|------|
| Intake and source read | done | User requirements and shared bridge/package source read | complete |
| Implementation | done | Additive API, playground, Sciobot routing and manual-edit protection | verification |
| Verification | done | Feature tests pass; documented table baseline exception authorized | complete |
| PR / tracker sync | done | PR #42 merged; generated version PR #43 merged via authenticated gh | complete |
| Closeout | done | Published npm artifact and Sciobot checks recorded below | final response |

Findings:
- Atomic content commit with visual-only playback prevents partial persisted content on interruption.

Decisions and tradeoffs:
- Reduced motion or unsupported CSS highlights applies edits immediately; user input cancels visual playback.

Implementation notes:
- Shared package API handles granular Slate reconciliation/history; Sciobot provider handles document deserialization.

Review fixes:
- List metadata key fixed; React DOM readiness wait added; delayed suggestion RAF cancelled before direct edit.

Error attempts:
| Error / failed attempt | Count | Next different move | Resolution |
|------------------------|-------|---------------------|------------|
| Root check dependencies | 2 | Declare compatible tinyexec | Build/types pass; table baseline remains |
| Automatic release merge missing CI token | 1 | Authenticated gh CLI | Version PR #43 merged |

Verification evidence:
- See verification checkpoints and final release/integration evidence below.

Final handoff contract:
- PR line: https://github.com/lofcz/plate/pull/42
- Issue / tracker line: N/A: user request, no tracker
- Confidence line: Focused package/browser/integration proof passed; baseline exception documented
- Flow table:
  - Reproduced: tests N/A additive feature, browser N/A additive feature
  - Verified: 14 package tests / 313 assertions; nine browser cases; Sciobot evidence below
- Browser check: Nine Chromium scenarios plus inspected dev-browser screenshot
- Outcome: Default direct AI edits with collaborator playback, scrolling and undo/redo; explicit suggestions retained
- Caveat: 109 baseline table failures waived by user; reduced-motion/highlight fallback applies immediately
- Design:
  - Chosen boundary: Plate package owns history/playback; Sciobot provider owns deserialization
  - Why not quick patch: Shared API covers all Plate material callers and cancellation/history consistently
  - Why not broader change: Existing suggestion engine remains for explicit requests; unrelated table fixtures excluded
- Verified: 14 package tests / 313 assertions; nine browser cases; Sciobot evidence below
- PR body verified: gh body readback checked; exact plan at head and PR number recorded

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
- PR: https://github.com/lofcz/plate/pull/42
- Task plan at exact PR head: 8378804166c483b73628f7af7c85158db39eb2ec; contains PR #42
- Issue / tracker: N/A: no tracker
- Browser proof: Nine repository E2E scenarios and dev-browser screenshot
- Caveats: Existing 109 table failures; user approved release with documentation

Timeline:
- 2026-09-22T09:55:02.895Z Task goal plan created.

Reboot status:
| Question | Answer |
|----------|--------|
| Where am I? | Completed release and integration |
| Where am I going? | Final handoff |
| What is the goal? | Verified direct AI edits, npm publication, and Sciobot integration |
| What have I learned? | See Findings |
| What have I done? | See Timeline |

Open risks:
- 109 unchanged table-test failures remain, documented and explicitly approved. Unsupported highlight browsers use immediate edits.

## Requirement extraction and implementation contract
- [x] Optional `is_suggesion` defaults false; true only for explicit suggestion requests.
- [x] Shared Plate editing covers documents, complete preparations, and other Plate materials.
- [x] Direct content replacement with polished collaborator cursor and typing reveal.
- [x] Normal undo/redo, no partially typed persisted documents.
- [x] Changed regions animate sequentially top to bottom with smooth viewport tracking.
- [x] Dedicated mode in source-map-playground with deep browser E2E coverage.
- [x] Publish using gh-driven CI and verify npm artifact.
- [x] Update Sciobot dependency and integrate published API.

Execution decisions:
- Normal additive feature, task + autogoal plan + browser/package-api packs; release-lanes and changeset own publication.
- User request is source of truth, no ticket, video, timed duration, or quantitative score.
- Existing bridge routes every Plate edit to applyDiff; shared AIReviewProvider owns deserialization.
- API in @lofcz/platejs-ai, visual-only typing reveal after synchronous normal history transaction; interrupting visual effect cannot lose document edits.
- Browser plugin tools unavailable in current tool inventory; repo E2E harness plus dev-browser fallback to be attempted.
- New branch codex/animated-ai-edits, initially clean repositories. No user goal tool requested; durable file tracks work.
- Proof: package unit tests, focused typecheck, playground Playwright tests, Sciobot tests/typecheck, npm readback.
- Output capped to focused source reads and command logs. No registry/template modifications planned.

## Verification checkpoint
- Source ownership: Sciobot useWorkspaceEditBridge routes Plate material writes to AIReviewProvider; package owns granular Slate changes and transient DOM playback.
- Existing docs/solutions history capture note consulted; history authority is Slate transforms.
- Requirements refined by user: distrust old built-in AI edits; prove rich structure and history independently.
- 12 package unit tests passed before adding 100-case structural stress coverage.
- Chromium: six core E2E scenarios pass, including three-region ordering/scroll/history. Rich-content and long-paragraph additions pending.
- Browser Use tools unavailable; dev-browser installed and connected to dedicated Chromium profile on 9222. Local playground exercised; screenshot /home/lofcz/.dev-browser/tmp/plate-ai-visual.png.
- Review 1 accepted: no-op key dropped listStart-only changes. Fixed, with property-only regression.
- Review 2: generated FUSE test artifact; moved browser output to ignored root test-results. Transient old output cleaned after runner releases handles. No package correctness finding.
- Granular reconciliation preserves untouched nodes/selection; no whole-editor setValue for direct API.
- Full check builds temporarily invalidated dist paths while concurrent focused checks ran; known concurrent-build cause, not install corruption. Rerun focused checks after build.
- Agent-native review: both edit_document and set_document expose optional is_suggesion default false; tool text requires explicit user suggestion intent and top-to-bottom edits; bridge and sidebar forward strict boolean true only. Existing read/patch matching stays unchanged.
- High-risk failure modes: history corruption, lost marks/links/tables, stale animations, user input races. Proof: granular operation tests + rich-content browser tests + cancellation/undo coverage. Additive API; no migration required.

- Review 3 P1 rejected with source evidence: installed Slate 0.124.1 and 0.126.2 use immutable replaceChildren in modifyDescendant/modifyChildren and assign root.children to a new array. The reviewer claimed in-place mutation. Browser undo test now explicitly checks changed array identity and requires visual cleanup within 500 ms, below normal playback duration.
- 14 package tests / 313 assertions pass, including 100 structural edit/history cases. Eight browser scenarios pass; additional complete-preparation nested phase/activity test passes.
- Sciobot: 20 existing edit/suggestion regression tests pass; backend typecheck passes. Frontend awaiting published package export.

## Release preparation evidence
- Complete-preparation E2E passes (nested lesson_phase and lesson_activity structure plus undo). Nine browser cases total.
- Programmatic undo test confirms immutable root replacement and removes playback within 500 ms.
- Sciobot bridge tests both pass: strict suggestion routing and manual text preservation between calls. Sidebar markdown is instance-scoped rather than module-global.
- Review 4 property-null finding rejected: installed Slate set_node explicitly deletes newProperties entries whose value is nullish; operation inverse uses properties to restore. The 100-case mark/removal history stress also validates exact target shape. No accepted findings remain.
- Sciobot reviewer repeated the in-place-array premise; rejected using its own installed Slate source (modifyDescendant replaces root.children) and the passing real-hook manual-edit regression.
- Generated core barrel is included as required by pnpm brl; patch changeset records public helper exports.
- Root check blocker: depset imported tinyexec without declaring it. Declared ^1.2.4, matching its existing nodePath option; standalone depset typecheck passes.
- PR body prepared in /tmp/plate-ai-pr.md with auto-release enabled. Publication remains pending root check.

## Authorized publication
- Full `pnpm check`: lint, build, and all 56 package typechecks passed; fast tests retain 109 existing failures in unchanged table tests. Isolated `withDeleteTable` reproduces baseline trailing-paragraph fixture mismatches introduced by existing normalization (060b83b7b93). Focused AI/package and nine browser scenarios pass. User explicitly authorized publication with these baseline failures documented on 2026-09-22.

Exact implementation PR: https://github.com/lofcz/plate/pull/42
- Dedicated task invocation and this plan own PR #42. Release metadata is managed by the existing release workflow.

## Checklist applicability
- Duration, video, tracker bug reproduction/hard-stop, tracker sync, registry-only changelog, and no-artifact paths are N/A for this package feature request.
- Compatibility is additive; published API has no required migration. Browser console/network cleanliness was not audited exhaustively and is not claimed; behavioral tests and visual proof are the release evidence.

## Final release and integration evidence
- Implementation PR https://github.com/lofcz/plate/pull/42 merged as 914e2b93db00661583a2c58266f378c1f03a91d0. Plan at PR head 8378804166 identifies exact PR.
- Generated version PR https://github.com/lofcz/plate/pull/43 merged through authenticated gh after automatic merge lacked a CI token.
- Release https://github.com/lofcz/plate/releases/tag/v53.4.11; publish job succeeded: https://github.com/lofcz/plate/actions/runs/35717870089 . Downstream template sync is separate release automation.
- npm readback: @lofcz/platejs-ai latest=53.4.11, integrity sha512-3n0l7U8uOTPa9knCm8T8+RuNP/+4CHbfEGO7yeyR5MA84EF35c88zrEugnN/VRHfteGu4uo6cNVKjtJwL7fv8w== . Registry propagation took several minutes.
- Sciobot dependency and override both use npm:@lofcz/platejs-ai@^53.4.11; bun.lock resolves 53.4.11 with matching integrity. bun install --no-cache succeeded after stale manifest cache.
- Installed artifact import verified applyAnimatedAIEdit and getAIEditPaths are functions.
- Sciobot final frontend AND backend typecheck passes: bun run typecheck, /tmp/sciobot-ai-final-types.log.
- Sciobot final 22 tests / 3 files pass: bun run test run src/hooks/chat/useWorkspaceEditBridge.test.tsx src/lib/agent-edit-find-replace.test.ts src/lib/suggestion-views.test.ts . Bridge tests exercise the actual published API, undo/redo, explicit-suggestion routing, and manual edit preservation. Evidence /tmp/sciobot-ai-final-tests.log.
- Sciobot scoped oxlint exits zero with warnings; no lint error. Unrelated concurrent Sciobot changes preserved; integration left in working tree. No application production deployment requested or performed.
- Full Plate check exception remains exactly the 109 documented baseline table-test failures; user explicitly approved publication.
- Final GitHub workflow readback: success, including release/changelog and registry/template synchronization.
