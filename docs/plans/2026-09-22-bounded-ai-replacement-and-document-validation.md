# Bounded AI replacement and document validation

Objective:
Fix generic-document validation and bound AI playback, verify the reported email, publish the correction and update Sciobot.

Goal plan:
docs/plans/2026-09-22-bounded-ai-replacement-and-document-validation.md

Template:
docs/plans/templates/task.md

Primary template:
docs/plans/templates/task.md

Applied packs:
- browser (docs/plans/templates/packs/browser.md)
- package-api (docs/plans/templates/packs/package-api.md)

Task source:
- type: user bug report
- id / link: conversation screenshot and chat 94fda690-5af1-4f62-bc49-38713979e824
- title: Slow and blank AI rewrite plus generic-document validation failure
- acceptance criteria: bounded playback, retained old text, clean lists, correct material validation, undo/redo and publication

Timed checkpoint:
- requested duration: N/A no timed work duration; playback deadline is a product requirement
- semantics: one-shot repair
- initial confidence score: N/A executable evidence
- improvement loop: reproduce, fix, browser/unit/review, publish, integrate
- final score / loop closure: waiting on release and final installed-package verification

Completion threshold:
- Full rewrite has a short retained-content transition; total animation capped at 2000ms; generic email set accepted without lesson schema; correct syntax/schema errors; published package integrated and tests pass.
- If a PR is created or updated, this exact task plan exists at the PR head,
  identifies that exact PR, and the PR body names it exactly once.
- Task closure is legal only when the source-of-truth acceptance criteria are
  satisfied or explicitly narrowed, required verification evidence is recorded,
  code-review and release-artifact gates are closed when applicable, tracker/PR
  sync is complete or marked N/A with reason, and
  `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-09-22-bounded-ai-replacement-and-document-validation.md` passes.

Verification surface:
- Plate 14 unit tests and 12 Chromium cases, actual email replay, package typecheck/root check/autoreview; Sciobot 25 focused tests and frontend/backend types; npm artifact readback.

Constraints:
- Preserve existing user-facing behavior outside the task scope.
- Prefer the durable ownership boundary over caller-by-caller patches.
- Do not create PRs, comments, commits, or pushes unless the task/user/skill
  requires them.
- Do not add broad ceremony when the task is trivial or docs-only.

Boundaries:
- Source of truth: user report, screenshot, and production snapshot read-only.
- Allowed edit scope: Plate direct-edit playback/playground/tests; Sciobot document validation/tests/dependency.
- Browser surface: localhost:3999/#direct-edit, with exact local email replay.
- Tracker sync: N/A no issue; dedicated implementation PR and npm release.
- Non-goals: production document writes, unrelated slides work, table-normalizer baseline fixes.

Output budget strategy:
- Focused searches and capped output; full logs in /tmp/ai-redo-*; imported private snapshot stays outside repository.

Blocked condition:
- Missing publication auth, failing in-scope verification without repair, or loss of required source access.

Task state:
- task_type: bug fix
- task_complexity: non-trivial
- current_phase: verification
- current_phase_status: in_progress
- next_phase: publication and installed-package checks
- goal_status: active

Current verdict:
- verdict: valid reproduction; focused fixes pass
- confidence: source proof plus browser and hook tests
- next owner: task
- reason: per-region duration/transparent pending text and unconditional lesson schema reproduced

Pre-solution issue challenge:
- reporter claim: rewrite takes about 20s, loses visible old content, leaves blank lists, rejects valid plain email
- suggested diagnosis or fix: fixed budget and separate full rewrite transition; verified correct ownership in package and material-aware bridge
- repro ladder:
  - tests / source-level repro: 18*(1400+360)ms possible; unconditional lesson schema confirmed from recorded tool failure
  - Playwright / automated browser: 12 corrected behavior scenarios pass
  - Browser plugin: unavailable; approved dev-browser fallback used
  - screenshot / visual proof: /home/lofcz/.dev-browser/tmp/ai-redo-final.png inspected
- reproduction verdict: valid
- validity verdict: valid
- best long-term fix boundary: package animation scheduling and shared material-kind executor
- harsh honest feedback: earlier tests checked final text but missed intermediate blank content and total latency; both are explicit regressions here
- hard-stop decision: none; reproduced and authorized

Completion rule:
- Do not call `update_goal(status: complete)` while any required checklist item
  remains unchecked. If an item does not apply, check it and add `N/A: <reason>`.
- Do not call `update_goal(status: complete)` until every completion threshold
  above is satisfied, final handoff evidence is recorded, and
  `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-09-22-bounded-ai-replacement-and-document-validation.md` passes.
- Do not create hook state for this goal. This file plus the active goal are the
  durable state.

Start Gates:
| Gate | Applies | Evidence |
|------|---------|----------|
| Timed checkpoint parsed | N/A | No timed goal-tool request, tracker, or video; screenshot and private conversation are the source. |
| Skill analysis before edits | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Active goal checked or created | N/A | No timed goal-tool request, tracker, or video; screenshot and private conversation are the source. |
| Source of truth read before edits | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Tracker comments and attachments read | N/A | No timed goal-tool request, tracker, or video; screenshot and private conversation are the source. |
| Video transcript evidence required | N/A | No timed goal-tool request, tracker, or video; screenshot and private conversation are the source. |
| Pre-solution issue challenge required | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Reproduction verdict before implementation | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Repro escalation ladder selected | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Suggested fix reviewed against durable boundary | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| `docs/solutions` checked for non-trivial existing-code work | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| TDD decision before behavior change or bug fix | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Branch decision for code-changing task | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Release artifact decision | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Browser tool decision for browser surface | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| PR expectation decision | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Dedicated task plan selected for exact PR | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Tracker sync expectation decision | N/A | No timed goal-tool request, tracker, or video; screenshot and private conversation are the source. |
| Output budget strategy recorded | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Browser pack selected | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Browser route / app surface identified | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Browser tool decision recorded | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Console/network caveat policy recorded | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Package/API pack selected | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Public surface or package boundary identified | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Release artifact path selected | pending | Choose one: `.changeset`, registry changelog, or `N/A: no published user-visible delta` |
| `changeset` skill loaded when `.changeset` is required | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |
| Barrel/export impact decision recorded | yes | Task contract, valid reproduction, scope/branch, package patch classification and verification decisions recorded below before publication. |


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
| Goal plan complete | yes | Run `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-09-22-bounded-ai-replacement-and-document-validation.md` | pending |
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
| Intake and source read | in_progress | created plan | implementation |
| Implementation | pending | | verification |
| Verification | pending | | closeout |
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
- 2026-09-22T11:14:02.939Z Task goal plan created.

Reboot status:
| Question | Answer |
|----------|--------|
| Where am I? | Intake and source read |
| Where am I going? | Implementation, verification, PR/tracker sync, closeout |
| What is the goal? | TODO: Fill from Objective |
| What have I learned? | See Findings |
| What have I done? | See Timeline |

Open risks:
- Pending.

## Task contract and reproduction evidence
- Source: user's screenshot and chat 94fda690-5af1-4f62-bc49-38713979e824; reproduction valid.
- Exact original and requested Markdown imported read-only from production snapshot into /tmp/ai-edit-replay.json; conversation graph imported to local database through existing importer. No production writes.
- Root cause: per-region 1400ms plus 360ms scroll delay multiplied by 18 regions; transparent highlight ranges hid pending text but left list markers. Content swap happened before retaining visible old content.
- Validation root cause: document and lesson_plan both routed through lesson schema; set rejected generic email, edits returned misleading mandatory lesson-shape repair warnings. Syntax formatter mislabeled schema errors as tag-pair issues.
- Scope: package visual playback, playground/browser tests; Sciobot material-aware validation and regression tests; patch release and consuming dependency update.
- Threshold: whole rewrite <850ms browser, total burst <2200ms including scheduling tolerance; no transparent pending text, old inert snapshot visible during swap, exact final/undo/redo, cancellation cleanup; generic set succeeds, malformed MDX and invalid lesson schema rejected correctly.
- Architecture: atomic history transaction retained; precommit visible snapshot and bounded transition owned in package. Full rewrite preserves scroll, sparse accents ordered top to bottom. Previous burst deadline carried forward.
- Skills: task/autogoal browser+package-api packs; changeset, autoreview, dev-browser fallback (Browser Use tools unavailable); React performance.
- Branch: codex/bounded-ai-replacement from origin/main. Previous task's local plan preserved.
- Existing user's release authorization and documented 109 table-test baseline exception persist; run full check and document exact current outcome before PR.
- Verification authorities: package and Chromium playground in GitHub/plate; schema/hooks/typechecks in GitHub/sciobot-next; npm installed artifact after publishing.
- No timed duration, tracker, video, or registry/template source changes. No production deployment.

## Execution evidence
- 14 package tests / 313 assertions pass. 12 browser scenarios pass in 1.3m. Generic-schema bridge tests: five pass; combined 25 regression tests pass.
- Exact imported email replay: 658ms, old snapshot retained, final artifacts zero; deep-equal undo restores content/structure. JSON string comparison differed solely because property order changed; parsed objects equal.
- Package and Sciobot typechecks pass after narrowing root presence and selecting legacy draftType metadata.
- First review: no code finding; task-plan placeholder finding accepted, filling generated contract/gates before publication.
- Root check first attempt caught test-only evolving array type; explicitly typed Promise<void>[] and rerunning.

- Final browser coverage: 15 passing scenarios, including short custom budget, full rewrite wheel cancellation, and full rewrite unmount.
- Sciobot review accepted: transient draftType cannot classify restored legacy lessons. Keep no-file path lesson on its established strict contract; explicit file.kind selects generic-document validation. Six bridge tests pass, including cleared-metadata legacy case.

## Immediate release authorization
- User explicitly stopped the monorepo check and requested immediate deployment. Focused package types, 14 unit tests, 15 browser scenarios, 36 Sciobot tests, and both scoped reviews pass. Full check intentionally stopped; prior 109 baseline table failures remain documented.
