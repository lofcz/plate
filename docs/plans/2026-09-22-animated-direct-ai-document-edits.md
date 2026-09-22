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
- final score / loop closure: open until verified and published

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
- current_phase: verification and release
- current_phase_status: in_progress
- next_phase: implementation
- goal_status: active

Current verdict:
- verdict: pending
- confidence: pending
- next owner: task
- reason: pending

Pre-solution issue challenge:
- reporter claim: pending
- suggested diagnosis or fix: pending
- repro ladder:
  - tests / source-level repro: pending
  - Playwright / automated browser: pending
  - Browser plugin: pending
  - screenshot / visual proof: pending
- reproduction verdict: pending
- validity verdict: pending
- best long-term fix boundary: pending
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
- [ ] If a duration was requested, it is recorded as minimum active work unless
      explicitly marked hard stop; when no better metric exists, initial and
      final confidence scores are recorded.
- [ ] Short objective plus outcome, completion threshold, verification surface,
      constraints, boundaries, and blocked condition are concrete.
- [ ] Task source classified with source type, id/link, title, task type,
      acceptance criteria, caveats, likely files/routes/packages, browser
      surface, and root-cause layer.
- [ ] Required video or screen-recording evidence is cached/read as normalized
      `<video-transcripts>` XML, or marked N/A with reason.
- [ ] For public tracker bug reports, behavior claims, technical diagnoses, or
      suggested fixes, reporter claims are challenged before implementation
      with a recorded verdict: `valid`, `not reproduced`, `invalid`,
      `wont-fix`, `partially valid`, or `platform limitation`. Feature, docs,
      support, or cleanup requests with no bug claim may mark reproduction
      `N/A` with reason.
- [ ] Repro escalation ladder followed for bug/behavior claims: focused
      test/source-level repro first when applicable; existing repo-owned
      Playwright regression/test harness next when available and useful as
      executable coverage; do not use standalone Playwright, Puppeteer, or raw
      DevTools as a substitute for the repo Browser policy;
      `[@Browser](plugin://browser@openai-bundled)` next when tests or
      Playwright cannot reproduce or cannot model the surface honestly;
      screenshot or explicit visual-proof waiver when visual/native state
      matters.
- [ ] Hard-stop rule followed for bug/behavior claims: no code when the issue
      is not reproduced, invalid, or won't-fix; partial validity pivots to the
      best long-term fix and records what was wrong or incomplete in the issue's
      proposed path.
- [ ] Nearby repo instructions and implementation patterns read before edits.
- [ ] Implementation fixes the right ownership boundary, or the narrower choice
      is recorded with reason.
- [ ] Release artifact requirement recorded: changeset, registry changelog, or
      N/A with reason.
- [ ] Final handoff shape decided: bug/feature/testing/batch/review/tracker
      requirements, PR body sync, and issue/Linear sync when applicable.
- [ ] Branch handling recorded for code-changing work: dedicated branch used,
      new branch needed, or N/A with reason.
- [ ] Every PR has its own `task` invocation and dedicated plan; this plan is
      not aggregate evidence for another PR.
- [ ] If a PR exists, its body has exactly one
      `🧭 Task plan: docs/plans/<plan>.md` line, this file exists at the exact PR
      head, and this plan records that exact PR number or URL.
- [ ] Local-env-rot retry policy recorded for any surprising repo-wide failure:
      reinstall/rerun evidence or N/A with reason.
- [ ] Workspace authority recorded: every proof command names the cwd/tool that
      owns the changed behavior.
- [ ] High-risk note recorded for public API, runtime, package-boundary,
      browser behavior, agent-action, or command-contract changes, or marked
      N/A with reason.
- [ ] Review/autoreview target selected from actual diff state for non-trivial
      implementation work, or marked N/A with reason.
- [ ] Agent-native review decision recorded for `.agents/**`, `.claude/**`,
      `.codex/**`, skills, hooks, commands, prompts, or user-action tooling.
- [ ] Output budget discipline recorded and followed: broad searches are
      scoped, capped, counted, or artifacted instead of streamed into goal
      context.
- [ ] Browser pack: route, interaction path, and expected visible outcome are recorded before proof.
- [ ] Browser pack: browser proof uses the repo-approved browser tool or records a blocker/waiver.
- [ ] Browser pack: console and network errors are checked or explicitly out of scope.
- [ ] Browser pack: screenshot, trace, or exact verification caveat is ready for final handoff.
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
| Named verification threshold | pending | Run the command, proof, source audit, or artifact check named in this plan | pending |
| Pre-solution issue challenge verdict | pending | Record reporter claim, suggested fix, repro verdict, validity verdict, durable boundary, and hard-stop/pivot decision before implementation | pending |
| Repro escalation ladder | pending | For bug/behavior claims, record test/source-level, Playwright, Browser, and screenshot/visual-proof outcomes or N/A/blocker reasons before `not reproduced` | pending |
| Bug reproduced before fix | pending | Record failing test/repro or N/A with reason | pending |
| Targeted behavior verification | pending | Run focused test/proof for changed behavior or record N/A | pending |
| TypeScript or typed config changed | pending | Run relevant typecheck | pending |
| Package exports or file layout changed | pending | Run `pnpm brl` before final verification and keep generated barrel updates | pending |
| Package manifests, lockfile, or install graph changed | pending | Run `pnpm install` and relevant package checks | pending |
| Agent rules or skills changed | pending | Run `pnpm install` and verify generated skill sync | pending |
| Workspace authority proof | pending | Run verification in the owning repo/package/app/route/tool and record cwd; do not count the wrong workspace as proof | pending |
| Browser surface changed | pending | Capture Browser Use proof or record explicit waiver/blocker | pending |
| Browser final proof | pending | Attach screenshot or exact browser verification caveat when browser proof applies | pending |
| CI-controlled template output changed | pending | Restore generated template output or record why it is intentionally kept | pending |
| Package behavior or public API changed | pending | Add a changeset or record why no changeset applies | pending |
| User-visible registry output changed | pending | Use the registry-changelog pack: add/update `apps/www/src/registry/changelog/entries/*.mdx`, run `node tooling/scripts/generate-ui-changelog-entries.mjs --write`, run `node tooling/scripts/generate-ui-changelog-entries.mjs --check`, or record N/A | pending |
| Docs or content changed | pending | For docs-heavy work, use `--template docs`; for supporting public docs/content/API/example changes, load `docs-creator` and close the docs pack; for typo/link-only edits, record the explicit reason and proportional proof | pending |
| High-risk mini gate | pending | For public API/runtime/package-boundary/browser/agent-action/command-contract changes, record realistic failure mode, proof plan, and why the chosen boundary is right; otherwise N/A | pending |
| Agent-native review for agent/tooling changes | pending | For `.agents/**`, `.claude/**`, `.codex/**`, skills, hooks, commands, prompts, or user-action tooling, load `.agents/skills/agent-native-reviewer/SKILL.md` and close accepted/actionable findings, or record N/A | pending |
| Local install corruption suspected | pending | Run `pnpm run reinstall` once, rerun the exact failing command, or record N/A | pending |
| Autoreview for non-trivial implementation changes | pending | Load `.agents/skills/autoreview/SKILL.md`; use dirty local `--mode local`, branch/PR `--mode branch --base <base>`, or committed slice `--mode commit --commit <ref>` until no accepted/actionable findings, or record N/A for docs-only/trivial/no local patch | pending |
| PR create or update | pending | Run `check` before PR work and sync PR body to the task-style final handoff | pending |
| Per-PR task ownership | pending | Verify one task-plan body line, plan at exact head, and exact PR ownership in this plan | pending |
| Task-style PR body verified | pending | Verify the PR body with `gh pr view --json body`; it must preserve auto-release blocks when applicable, must not include a current-PR self-link, and must use the kitcn PR #270 emoji format: `🐛 Fixes ...`, `🟢 95-100% confidence`, `Phase / 🧪 Tests / 🌐 Browser` table, and bold emoji Outcome/Caveat/Design/Verified sections | pending |
| PR proof image hosting | pending | If PR body needs browser proof, replace local image paths with hosted GitHub URLs or record N/A | pending |
| Tracker sync-back | pending | Post concise issue/Linear sync after PR exists, or record N/A/blocker | pending |
| Final handoff contract | pending | Fill the final handoff fields below with exact PR/issue/confidence/tests/browser/outcome/caveats/design/verification content or N/A reason | pending |
| Final lint | pending | Run `pnpm lint:fix` or scoped equivalent | pending |
| Output budget discipline | pending | Verify no unbounded high-volume command output was streamed, or record the accidental output and recovery | pending |
| Timed checkpoint | pending | If duration was requested, keep improving until elapsed, then finish the current loop cleanly; otherwise N/A | pending |
| Goal plan complete | yes | Run `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-09-22-animated-direct-ai-document-edits.md` | pending |
| Browser interaction proof | pending | Exercise the target route/interaction with the approved browser tool or record blocker | pending |
| Browser console/network check | pending | Record console/network state or why it is not applicable | pending |
| Browser final proof artifact | pending | Record screenshot/trace/route proof or exact caveat | pending |
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
| Intake and source read | done | User requirements and shared bridge/package source read | complete |
| Implementation | done | Additive API, playground, Sciobot routing and manual-edit protection | verification |
| Verification | in_progress | Feature tests pass; root check running after depset repair | release |
| PR / tracker sync | pending | | final response |
| Closeout | pending | | final response |

Findings:
- None yet.

Decisions and tradeoffs:
- None yet.

Implementation notes:
- None yet.

Review fixes:
- None yet.

Error attempts:
| Error / failed attempt | Count | Next different move | Resolution |
|------------------------|-------|---------------------|------------|
| None yet | 0 | | |

Verification evidence:
- Pending.

Final handoff contract:
- PR line: pending
- Issue / tracker line: pending
- Confidence line: pending
- Flow table:
  - Reproduced: tests pending, browser pending
  - Verified: tests pending, browser pending
- Browser check: pending
- Outcome: pending
- Caveat: pending
- Design:
  - Chosen boundary: pending
  - Why not quick patch: pending
  - Why not broader change: pending
- Verified: pending
- PR body verified: pending

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
- PR: pending
- Task plan at exact PR head: pending
- Issue / tracker: pending
- Browser proof: pending
- Caveats: pending

Timeline:
- 2026-09-22T09:55:02.895Z Task goal plan created.

Reboot status:
| Question | Answer |
|----------|--------|
| Where am I? | Intake and source read |
| Where am I going? | Implementation, verification, PR/tracker sync, closeout |
| What is the goal? | Verified direct AI edits, npm publication, and Sciobot integration |
| What have I learned? | See Findings |
| What have I done? | See Timeline |

Open risks:
- Pending.

## Requirement extraction and implementation contract
- [ ] Optional `is_suggesion` defaults false; true only for explicit suggestion requests.
- [ ] Shared Plate editing covers documents, complete preparations, and other Plate materials.
- [ ] Direct content replacement with polished collaborator cursor and typing reveal.
- [ ] Normal undo/redo, no partially typed persisted documents.
- [ ] Changed regions animate sequentially top to bottom with smooth viewport tracking.
- [ ] Dedicated mode in source-map-playground with deep browser E2E coverage.
- [ ] Publish using gh-driven CI and verify npm artifact.
- [ ] Update Sciobot dependency and integrate published API.

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
