# Sync upstream and publish fork

Objective:
Sync upstream/main into lofcz/plate; retain fork improvements and publish verified npm versions through gh. Flow mode: one-shot execution.

Goal plan:
docs/plans/2026-10-19-sync-upstream-release.md

Template:
docs/plans/templates/task.md

Primary template:
docs/plans/templates/task.md

Applied packs:
- package-api (docs/plans/templates/packs/package-api.md)
- agent-native (docs/plans/templates/packs/agent-native.md)
- browser (docs/plans/templates/packs/browser.md)
- docs (docs/plans/templates/packs/docs.md)

Task source:
- type: user prompt
- id / link: current chat
- title: Sync fork with upstream and release to npm
- acceptance criteria: upstream ancestry retained; fork improvements retained; changesets target @lofcz packages; gh-driven npm release verified.

Timed checkpoint:
- requested duration: none
- semantics: N/A: no time requirement
- initial confidence score: N/A: command and artifact gates
- improvement loop: resolve merge, verify, review, deliver, publish, read back
- final score / loop closure: recorded after release

Completion threshold:
- [ ] Merge upstream/main 7937212aab, with zero missing upstream commits at delivery.
- [ ] Preserve @lofcz names/current version baselines, Jotai bundling, diff/suggestion, SMILES, table/core fixes, and AI playback/reveal behavior.
- [ ] Retarget pending upstream changesets and recreate already-consumed release notes for package deltas.
- [ ] Run check, package proof, scoped source audits, and autoreview with zero accepted findings.
- [ ] Deliver a dedicated sync PR and merge it for the explicitly requested release.
- [ ] Use gh CLI to invoke/observe release.yml and verify every published package/version and npm latest tag.
- If a PR is created or updated, this exact task plan exists at the PR head,
  identifies that exact PR, and the PR body names it exactly once.
- Task closure is legal only when the source-of-truth acceptance criteria are
  satisfied or explicitly narrowed, required verification evidence is recorded,
  code-review and release-artifact gates are closed when applicable, tracker/PR
  sync is complete or marked N/A with reason, and
  `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-10-19-sync-upstream-release.md` passes.

Verification surface:
- pnpm check; focused Markdown/DOCX/Slate tests; fork regression suites; changeset status; manifest and lockfile audits; merge ancestry.
- gh PR/workflow/release readback and npm view for the published package inventory.
- Browser tools: no browser-use or Browser tool exposed in this session; attempt discovery and dev server, record exact caveat.

Constraints:
- Preserve existing user-facing behavior outside the task scope.
- Prefer the durable ownership boundary over caller-by-caller patches.
- Do not create PRs, comments, commits, or pushes unless the task/user/skill
  requires them.
- Do not add broad ceremony when the task is trivial or docs-only.

Boundaries:
- Source of truth: user prompt, origin/main 8c500a93d1, upstream/main 7937212aab, prior sync plan.
- Allowed edit scope: merge resolutions, release metadata/changesets, required release blockers, this plan.
- Browser surface: standalone basic/AI editor demos for merged package behavior.
- Tracker sync: N/A: no issue; one dedicated PR.
- Non-goals: new product scope, beta promotion, manual template/registry generation.

Output budget strategy:
- Save verbose logs under .tmp; show summaries, conflict paths, scoped diffs. Initial upstream stat exceeded the cap; use shortstat/path filters thereafter.

Blocked condition:
- Missing GitHub/npm publishing authorization, unresolved release-blocking checks after diagnosis, or ambiguous destructive product conflict. Continue all independent authorized work first.

Task state:
- task_type: upstream sync and stable npm release
- task_complexity: non-trivial
- current_phase: delivery
- current_phase_status: in_progress
- next_phase: generated version PR and npm publication
- goal_status: active

Current verdict:
- verdict: proceed
- confidence: 90
- next owner: task
- reason: clean main, explicit user release authorization, fork CI publishing already configured

Pre-solution issue challenge:
- reporter claim: N/A: sync/release request
- suggested diagnosis or fix: merge upstream; reconcile fork identities and changesets
- repro ladder:
  - tests / source-level repro: 209 fork-only / 71 upstream-only commits
  - Playwright / automated browser: N/A: no bug reproduction
  - Browser plugin: blocked: no approved browser tool exposed
  - screenshot / visual proof: blocked with approved browser tool
- reproduction verdict: N/A: no bug claim
- validity verdict: valid
- best long-term fix boundary: upstream ancestry plus fork publishing ownership
- harsh honest feedback: blind upstream metadata replacement would break fork publication
- hard-stop decision: proceed

Completion rule:
- Do not call `update_goal(status: complete)` while any required checklist item
  remains unchecked. If an item does not apply, check it and add `N/A: <reason>`.
- Do not call `update_goal(status: complete)` until every completion threshold
  above is satisfied, final handoff evidence is recorded, and
  `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-10-19-sync-upstream-release.md` passes.
- Do not create hook state for this goal. This file plus the active goal are the
  durable state.

Start Gates:
| Gate | Applies | Evidence |
|------|---------|----------|
| Timed checkpoint parsed | no | N/A: upstream sync/release; no tracker, bug report, duration, or independent feature design |
| Skill analysis before edits | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Active goal checked or created | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Source of truth read before edits | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Tracker comments and attachments read | no | N/A: upstream sync/release; no tracker, bug report, duration, or independent feature design |
| Video transcript evidence required | no | N/A: upstream sync/release; no tracker, bug report, duration, or independent feature design |
| Pre-solution issue challenge required | no | N/A: upstream sync/release; no tracker, bug report, duration, or independent feature design |
| Reproduction verdict before implementation | no | N/A: upstream sync/release; no tracker, bug report, duration, or independent feature design |
| Repro escalation ladder selected | no | N/A: upstream sync/release; no tracker, bug report, duration, or independent feature design |
| Suggested fix reviewed against durable boundary | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| `docs/solutions` checked for non-trivial existing-code work | no | N/A: upstream sync/release; no tracker, bug report, duration, or independent feature design |
| TDD decision before behavior change or bug fix | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Branch decision for code-changing task | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Release artifact decision | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Browser tool decision for browser surface | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| PR expectation decision | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Dedicated task plan selected for exact PR | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Tracker sync expectation decision | no | N/A: upstream sync/release; no tracker, bug report, duration, or independent feature design |
| Output budget strategy recorded | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Package/API pack selected | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Public surface or package boundary identified | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Release artifact path selected | pending | Choose one: `.changeset`, registry changelog, or `N/A: no published user-visible delta` |
| `changeset` skill loaded when `.changeset` is required | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Barrel/export impact decision recorded | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Agent-native pack selected | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Agent-facing action surface identified | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Source rule versus generated mirror boundary identified | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| `agent-native-reviewer` loaded or waiver recorded | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Browser pack selected | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Browser route / app surface identified | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Browser tool decision recorded | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Console/network caveat policy recorded | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Docs pack selected | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| `docs-creator` loaded | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Docs lane selected | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Target docs and nearest sibling docs read | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Docs style doctrine read | yes | Selected; follow source-backed sync/release contract above; record final proof below |
| Documented source owner identified | yes | Selected; follow source-backed sync/release contract above; record final proof below |

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
- [ ] Package/API pack: public API, package boundary, export, and release-artifact impact are recorded.
- [ ] Package/API pack: release artifact matrix is applied: `.changeset`, registry changelog, or explicit no-artifact reason.
- [ ] Package/API pack: `.changeset` work loads `changeset` and follows its package/version/prose rules.
- [ ] Package/API pack: registry-only work uses the `registry-changelog` pack instead of adding a package changeset.
- [ ] Package/API pack: no-artifact decisions state why the diff has no published package user-visible delta from `main`.
- [ ] Package/API pack: compatibility, migration, or hard-cut decision is explicit when public shape changes.
- [ ] Package/API pack: package-owned typecheck/build/test proof is recorded or marked N/A with reason.
- [ ] Package/API pack: generated barrels or release notes are updated when required.
- [ ] Agent-native pack: source-of-truth rule files are edited instead of generated skill mirrors.
- [ ] Agent-native pack: the changed agent action is discoverable from the skill/rule text.
- [ ] Agent-native pack: generated mirrors are synced when `.agents/rules/**` changed, or N/A reason is recorded.
- [ ] Agent-native pack: accepted agent-native review findings are fixed or explicitly rejected with reason.
- [ ] Browser pack: route, interaction path, and expected visible outcome are recorded before proof.
- [ ] Browser pack: browser proof uses the repo-approved browser tool or records a blocker/waiver.
- [ ] Browser pack: console and network errors are checked or explicitly out of scope.
- [ ] Browser pack: screenshot, trace, or exact verification caveat is ready for final handoff.
- [ ] Docs pack: docs lane, target docs, nearest sibling docs, and source owner are recorded.
- [ ] Docs pack: every named API, import, option, route, component, transform, demo, and preview is source-backed or marked N/A with reason.
- [ ] Docs pack: docs use current-state reference voice, not changelog voice.
- [ ] Docs pack: links, anchors, and previews target real leaf pages or are marked N/A with reason.

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
| Goal plan complete | yes | Run `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-10-19-sync-upstream-release.md` | pending |
| Public API / package boundary proof | pending | Source-audit public API, exports, and package boundary impact | pending |
| Release artifact classification | pending | Record whether the change is published package behavior/API/types/config/runtime, registry-only, or no published user-visible delta | pending |
| Published package changeset | pending | If published package users see a delta, load `changeset`, add/update one `.changeset/*.md` per package, and prove no forbidden `minor` on `@platejs/slate`, `@platejs/core`, or `platejs` | pending |
| Registry changelog | pending | If the change is registry-only under `apps/www/src/registry/**`, use the `registry-changelog` pack and do not add a package changeset | pending |
| No release artifact | pending | If no artifact is needed, record the exact reason: internal-only, docs-only, agent-only, test-only, or no user-visible delta from `main` | pending |
| Package typecheck/build/test | pending | Run owning package checks or record N/A with reason | pending |
| Barrel/export generation | pending | Run `pnpm brl` when exports or exported file layout changed, otherwise N/A | pending |
| Agent source / generated sync | pending | Run `pnpm install` when `.agents/rules/**` changed and verify generated mirrors | pending |
| Agent action discoverability | pending | Source-audit the skill/rule path an agent will read | pending |
| Agent-native review | pending | Load `.agents/skills/agent-native-reviewer/SKILL.md` and close accepted findings, or record N/A | pending |
| Browser interaction proof | pending | Exercise the target route/interaction with the approved browser tool or record blocker | pending |
| Browser console/network check | pending | Record console/network state or why it is not applicable | pending |
| Browser final proof artifact | pending | Record screenshot/trace/route proof or exact caveat | pending |
| Docs source-backed claim audit | pending | Verify docs claims against current source or record N/A | pending |
| Docs links / routes / previews | pending | Verify leaf links, routes, anchors, and preview names or record N/A | pending |
| Docs MDX/content parser | pending | Run `pnpm --filter www build:source` for MDX/content changes, or record N/A | pending |
| Plugin page specifics | pending | For plugin pages, apply `docs-creator` kit/manual/API rules; otherwise N/A | pending |

Phase / pass table:
| Phase | Status | Evidence | Next |
|-------|--------|----------|------|
| Intake and source read | in_progress | created plan | implementation |
| Implementation | pending | | verification |
| Verification | pending | | closeout |
| PR / tracker sync | pending | | final response |
| Closeout | pending | | final response |

Findings:
- Upstream 7937212aab carries 71 commits beyond the fork merge base; several were previously squash-synced.
- New package deltas belong to Markdown, DOCX IO, Slate and core Slate dependencies.
- Fork source for AI, diff, suggestion, SMILES, table, core React callbacks, bundled jotai-x and tsdown bundling is unchanged.
- All package names, versions and @lofcz workspace aliases match origin/main before release versioning.
- Approved Browser/Browser Use tools are absent; dev server starts on port 3189. Port 3100 belongs to an existing process.
- Docs source parity passes; pnpm brl passes (54 tasks); pnpm lint:fix passes with zero rewrites.

Decisions and tradeoffs:
- Keep the fork agent workflow as one ownership unit: agent config/rules/skills, workflow-only scripts, docs/development, and preset. Take upstream generic tooling improvements.
- Preserve fork OIDC publishing/release tests, generated release history, and all CI-owned templates. Upstream app/registry source improvements remain.
- Keep upstream HTML conversion owner and native-autolink guard; transplant fork paired-void handling into legacyHtmlToJsx.
- Keep fork slow-test timeout with upstream git-visible test selection.
- Recreate four consumed upstream patch changesets under @lofcz; prepare-release-changesets derives five runtime-dependent releases.

Implementation notes:
- Dedicated branch: codex/sync-upstream-release-2026-10-19. Pending real merge preserves both upstream/fork ancestry.
- Review scope frozen at ~182 files, mostly upstream docs/plans and source; no new product scope.
- Agent-native audit: retained fork task/autogoal/release commands remain discoverable and CLI-accessible; new generic type-probe/trial-power commands have CLI flags and tests. No UI-only actions introduced.
- Source proof cwd: /run/media/lofcz/ssd_external/GitHub/plate.
- Browser proof expected route: /blocks/basic-blocks-demo. Interactive proof blocked by unavailable approved tool; HTTP smoke is separate.
- Docs lane: supporting upstream reference docs; source-owned changes retained verbatim, check:docs passes.
- High-risk: loss of fork identities or hidden runtime-dependent releases; exact manifest audit and changeset inventory cover that risk.

Review fixes:
- Structured Codex review completed clean; no code fixes required.
- Default helper model gpt-5.5 is unsupported by this account; reran with configured gpt-6.1-sol.
- CLI/action parity audit passes: no new human-only workflow, retained task/release commands, tested generic CLI helpers.

Error attempts:
| Error / failed attempt | Count | Next different move | Resolution |
|------------------------|-------|---------------------|------------|
| None yet | 0 | | |

Verification evidence:
- pnpm install --no-frozen-lockfile: PASS (1m9s).
- pnpm brl: PASS (54 tasks).
- pnpm lint:fix: PASS (3366 files, no fixes).
- pnpm --filter www check:docs: PASS.
- Full package artifact build: PASS (56/56, 5m16s).
- Registry changelog generation/check: PASS, 27 events; source combines upstream entries and fork history.
- Initial focused graph typecheck overlapped the full graph artifact rebuild, producing missing-export errors. Resolve through the coherent full check; no product patch or reinstall needed for an observed build race.
- Dev server on 3189 started; route compilation did not finish within HTTP timeout. Stopped this task server. No browser/visual success claim.
- Manifest identity/version/workspace alias audit: PASS.
- Initial focused test attempt hit missing core dist while dependency build was running; rerun after required artifact build. This failure matches the in-progress build, not product source or install corruption.
- Structured autoreview: PASS, zero accepted/actionable findings (gpt-6.1-sol; helper default gpt-5.5 rejected by account). Full check and focused graph typecheck in progress; logs /tmp/plate-sync-*.log.

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
- 2026-10-19T02:32:18.838Z Task goal plan created.

Reboot status:
| Question | Answer |
|----------|--------|
| Where am I? | Intake and source read |
| Where am I going? | Implementation, verification, PR/tracker sync, closeout |
| What is the goal? | Sync upstream and publish fork |
| What have I learned? | See Findings |
| What have I done? | See Timeline |

Open risks:
- Pending.

Initial release inventory before gate repairs (Changesets linked group):
- @lofcz/platejs-ai -> 53.6.2
- @lofcz/platejs-code-drawing -> 53.6.2
- @lofcz/platejs-test-utils -> 53.6.2
- @lofcz/platejs-utils -> 53.6.2
- @lofcz/platejs -> 53.6.2
- @lofcz/platejs-core -> 53.6.2
- @lofcz/platejs-docx-io -> 53.6.2
- @lofcz/platejs-markdown -> 53.6.2
- @lofcz/platejs-slate -> 53.6.2

Release blocker investigation and repair:
- Full initial check: 56 builds PASS, 56 typechecks PASS; fast tests exposed 168 existing failures in list-classic/table fixtures.
- Baseline proof: detached origin/main source with source aliases and legacy Slate 0.126.2 reproduces 9/21 focused failures (4 first-list crashes, 5 table expected-tree failures). Log: /tmp/plate-sync-baseline-proof.log. No upgrade regression was inferred from those failures.
- Critical release exception: normalize the first list without passing undefined previous path into NodeApi.get. Existing shorthand tests go red before, green after.
- Preserve fork table root invariant in explicit test input/output fixtures. No weakening, skipped tests, or product feature removal.
- Direct new adjacency regression: inserting a table after another table produced table/table/p instead of table/p/table/p in both merge modes. New focused test fails 2/2 before repair. Normalize the new table's preceding boundary as well as its following boundary.
- Correct existing vertical-cell-navigation fixture to match documented same-column next-row behavior; align explicit second-table paths with separator paragraphs.
- Focused repair proof: 441/441 tests, 82 files, zero failures. Source guards are limited to list-classic normalization and table root normalization. New patch changesets cover both packages.
- Review scope remains within release blockers and retained fork behavior; no public API or config changes. Additional test files are direct fixture alignment for the retained invariant.
- Baseline worktree created only for diagnosis, then removed; original workspace untouched by baseline tsconfig edits.
- Remaining gates: full check rerun after source repairs, structured autoreview of repairs, dedicated PR/version PR, npm publication/readback.

Release helper blocker:
- A real second prepare-release-changesets run deleted previously generated runtime-dependent changesets. Generated releases were incorrectly counted as manual roots; auto output oscillated between dependency sets.
- Added idempotence regression: first-pass generated dependents must remain identical when their generated changesets are present in the next Changesets status. Red: 7 pass, 1 fail (expected dependent inventory, received empty array).
- Filter generated-only release entries out of manual release roots, then recompute runtime transitive dependents from the actual manual roots. Keep manual releases that also carry generated IDs.
- Focused package/helper matrix: 449/449 tests, 83 files, zero failures.
- Source repairs limited to three release blockers: list path crash, retained table adjacency invariant, and release preparation idempotence. No public API shape changes.
- Scoped typecheck caught missing previous-path narrowing; added the explicit path guard, then rerun through full check.

Final release inventory: 12 packages at 53.6.2, including CSV as a runtime table dependent. Real preparation run twice: identical filenames/SHA-256 contents (evidence .tmp/upstream-sync/changeset-idempotence.json).

Final structured autoreview: PASS, zero findings, Codex gpt-6.1-sol; evidence .tmp/upstream-sync/review-final.json. Includes all normalization/fixture/idempotence repairs and twelve-package release inventory. No additional review cycle needed unless source changes again.

Browser fallback evidence: approved Browser Use/Browser tools absent. Applied dev-browser fallback; direct `dev-browser --connect http://127.0.0.1:9222` failed with `Daemon failed to start within 5 seconds`. No screenshot or interactive proof claim. Dev server startup succeeded earlier; route compilation exceeded HTTP timeout. Final handoff must disclose this browser limitation.

Agent-workflow preservation audit: retain fork MCP configuration, skiller lock, contributor routing, benchmark operator docs/rendered index together with restored fork agent rules and benchmark scripts. These are part of the excluded upstream pstack migration, not product updates. Generic source improvements remain. This narrows the reviewed sync diff; no new package source edits.

Slow-lane fixture repairs:
- Final check pass 2: lint/build 56/56/typecheck 56/56/fast tests PASS; slow lane exposed three more table expected-tree mismatches and existing AI async-mock import deadlocks/incomplete editor stubs.
- Align tableMergeBehavior.slow.tsx fixtures with the retained root paragraph invariant.
- AI mocks awaited the actual platejs/react export inside the replacement module factory, creating an import cycle. Pre-import actual exports before registering synchronous partial mocks across all five sibling affected AI slow specs.
- Fill withoutNormalizing on the two existing editor stubs used by accept/reject utility tests; no production AI behavior changes.
- Exact timeout repro: pnpm exec bun test aiChatActions.slow.ts --test-name-pattern 'stops chat' timed out. After fixture repair: 6/6 pass in 598ms.
- These edits affect tests only; the reviewed three runtime/release-helper fixes remain unchanged. Rerun owning slow lane, lint/typecheck and final full check before delivery.

Affected AI/table slow lane after test-only repairs: all passing; exact counts/log /tmp/plate-sync-slow-repair-proof.log. Final lint plus full check rerun started. AI production source stays unchanged; review/update source preservation claim excludes only these fixture files.

Affected slow fixture proof: 20/20 tests pass with the owned slow runner. Final whole-repo lint:fix passes, 3385 files, no changes. Production AI source audit (excluding existing package metadata and repaired slow specs): zero diffs from origin/main. Final full-check closure log: /tmp/plate-sync-check-closure.log; final test-only review: /tmp/plate-sync-review-closure.log.

Final complete check: PASS (exit 0), 56 builds, 56 typechecks, all fast/slow tests, timing hard gate. Lane pass counts: {"test": 3984, "test:slow": 570, "test:slowest": 3984}. Nonblocking timing warning zone only; no performance scope expansion. Evidence /tmp/plate-sync-check-closure.log and .tmp/upstream-sync/check-result.json. Final structured review .tmp/upstream-sync/review-closure.json: zero findings. Every changed published dependency is covered by the twelve-package release.
