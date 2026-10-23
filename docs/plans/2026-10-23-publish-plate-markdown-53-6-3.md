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
- final score / loop closure: awaiting npm verification

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
- current_phase: verification
- current_phase_status: in_progress
- next_phase: publication
- goal_status: active

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
| Release artifact decision | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Browser tool decision for browser surface | no | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| PR expectation decision | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Dedicated task plan selected for exact PR | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Tracker sync expectation decision | no | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Output budget strategy recorded | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Package/API pack selected | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Public surface or package boundary identified | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Release artifact path selected | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| `changeset` skill loaded when `.changeset` is required | yes | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Barrel/export impact decision recorded | no | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |

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

Completion Gates:
| Gate | Applies | Required action | Evidence |
|------|---------|-----------------|----------|
| Named verification threshold | yes | Run the command, proof, source audit, or artifact check named in this plan | In progress: finish publication/readback and verify PR #58 body/head before closure. |
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
| Per-PR task ownership | yes | Verify one task-plan body line, plan at exact head, and exact PR ownership in this plan | In progress: finish publication/readback and verify PR #58 body/head before closure. |
| Task-style PR body verified | yes | Verify the PR body with `gh pr view --json body`; it must preserve auto-release blocks when applicable, must not include a current-PR self-link, and must use the kitcn PR #270 emoji format: `🐛 Fixes ...`, `🟢 95-100% confidence`, `Phase / 🧪 Tests / 🌐 Browser` table, and bold emoji Outcome/Caveat/Design/Verified sections | In progress: finish publication/readback and verify PR #58 body/head before closure. |
| PR proof image hosting | no | If PR body needs browser proof, replace local image paths with hosted GitHub URLs or record N/A | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Tracker sync-back | no | Post concise issue/Linear sync after PR exists, or record N/A/blocker | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Final handoff contract | yes | Fill the final handoff fields below with exact PR/issue/confidence/tests/browser/outcome/caveats/design/verification content or N/A reason | In progress: finish publication/readback and verify PR #58 body/head before closure. |
| Final lint | yes | Run `pnpm lint:fix` or scoped equivalent | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Output budget discipline | yes | Verify no unbounded high-volume command output was streamed, or record the accidental output and recovery | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Timed checkpoint | no | If duration was requested, keep improving until elapsed, then finish the current loop cleanly; otherwise N/A | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Goal plan complete | yes | Run `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-10-23-publish-plate-markdown-53-6-3.md` | In progress: finish publication/readback and verify PR #58 body/head before closure. |
| Public API / package boundary proof | yes | Source-audit public API, exports, and package boundary impact | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Release artifact classification | yes | Record whether the change is published package behavior/API/types/config/runtime, registry-only, or no published user-visible delta | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Published package changeset | yes | If published package users see a delta, load `changeset`, add/update one `.changeset/*.md` per package, and prove no forbidden `minor` on `@platejs/slate`, `@platejs/core`, or `platejs` | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Registry changelog | no | If the change is registry-only under `apps/www/src/registry/**`, use the `registry-changelog` pack and do not add a package changeset | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| No release artifact | no | If no artifact is needed, record the exact reason: internal-only, docs-only, agent-only, test-only, or no user-visible delta from `main` | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |
| Package typecheck/build/test | yes | Run owning package checks or record N/A with reason | PR #58 metadata audit: only Markdown/AI 53.6.3 versions and changelogs plus consumed source changeset; source unchanged from full passing GitHub check 39882729777. task/autogoal/changeset/release-lanes read; CI owns npm publication; exact PR has this dedicated plan. |
| Barrel/export generation | no | Run `pnpm brl` when exports or exported file layout changed, otherwise N/A | N/A: generated version/changelog metadata only; no new implementation, UI, exports, registry, public docs, agent rules, tracker issue or timed checkpoint. Source proof is owned by PR #57. |

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
- 2026-10-23T01:23:17.530Z Task goal plan created.

Reboot status:
| Question | Answer |
|----------|--------|
| Where am I? | Intake and source read |
| Where am I going? | Implementation, verification, PR/tracker sync, closeout |
| What is the goal? | Publish and verify both 53.6.3 packages |
| What have I learned? | See Findings |
| What have I done? | See Timeline |

Open risks:
- Pending.

Implementation audit:
- Generated PR #58 at 93bb091e93 changes only five release-metadata files. Markdown and AI patch versions are 53.6.3; prepare-release-changesets.mjs automatically includes AI as a runtime dependent. No package names, exports, peer ranges or implementation files changed.
- Full source check run 39882729777 completed successfully. Local duplicate build was stopped after exact source CI passed; a concurrent focused rerun had encountered a temporarily missing rebuilt Slate dist, not an implementation failure. No install corruption remains in the CI proof.
- This is the separate task invocation/plan for PR #58, not aggregate source-PR evidence. No second implementation autoreview applies to generated metadata; source structured review has zero findings.
- High-risk note: stale or wrong npm package is the release risk; verify exact published version and downloaded artifact before updating the consumer.
