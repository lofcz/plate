# Bootstrap manual npm publication and trust

Objective:
Create a local script for the user to publish the four pending @lofcz packages and configure GitHub trusted publishing for lofcz/plate release.yml. Parent release goal remains incomplete until user execution and registry verification.

Goal plan:
docs/plans/2026-10-19-npm-bootstrap-trust.md

Template:
docs/plans/templates/task.md

Primary template:
docs/plans/templates/task.md

Applied packs:
- agent-native (docs/plans/templates/packs/agent-native.md)

Task source:
- type: user prompt
- id / link: current chat, follow-up to source PR #54 and version PR #55
- title: Create a script for manual publication and OIDC trust
- acceptance criteria: one runnable helper with human browser/2FA; four-package scope; safe retries; mocked/dry-run proof; dedicated PR ownership

Timed checkpoint:
- requested duration: none
- semantics: N/A: no duration
- initial confidence score: N/A: executable command gates
- improvement loop: implement helper, mock failures, review, user execution, verify registry
- final score / loop closure: 13 mocked scenarios pass; review clean; user execution and 12/12 npm readback confirmed

Completion threshold:
- [x] Runnable script targets only table, csv, list-classic and test-utils using their current manifest versions.
- [x] Interactive npm browser/2FA remains with the user; agent performs only dry-run and mocked verification.
- [x] Published versions are skipped; registry/auth/publish/trust errors stop execution; trust allows publishing from lofcz/plate release.yml.
- [x] Script has help/dry-run, verifies prerequisites, and builds release artifacts unless explicitly skipped.
- [x] Focused mocked proof, shell syntax, agent-native review and autoreview pass; handoff gives one exact command.
- Parent goal: docs/plans/2026-10-19-sync-upstream-release.md. No goal completion claim for script creation alone.

Verification surface:
- bash -n; non-mutating --help/--dry-run; mocked CLI integration covering skip/publish/trust/failure; agent-native audit and structured autoreview. No real npm login, publish or trust by the agent.

Constraints:
- User explicitly owns manual npm authentication/publication/trust. Preserve normal OIDC CI. Do not publish any other package or modify package versions, manifests, registry or templates.

Boundaries:
- Source: latest user request to create a script, existing scripts/bootstrap-publish.ps1, installed npm trust CLI and fork release.yml.
- Allowed: script and focused proof; dedicated plan. Existing documentation restorations belong to parent task.
- Browser: N/A: terminal helper; browser authentication is intentionally human-only.
- Branch: codex/npm-bootstrap-trust-2026-10-19; dedicated script task, future PR must name this exact plan.
- Delivery blocker: npm/CI recovery still needs human execution; helper was available immediately and successfully run by the user; do not rerun publication on their behalf.

Output budget strategy:
- Save full check/review logs under /tmp or .tmp; show bounded summaries; avoid unbounded repository searches.

Blocked condition:
- User login/2FA/publication is required for the parent release. Script verification must use mocks and dry-run; no external npm mutation is authorized for the agent.

Task state:
- task_type: release helper and fork workflow preservation
- task_complexity: non-trivial
- current_phase: complete
- current_phase_status: done
- next_phase: none
- goal_status: complete

Current verdict:
- verdict: complete
- confidence: 95
- next owner: task
- reason: syntax/dry-run, 13 mocked scenarios and review pass; real npm readback is now 12/12; helper and inherited fork docs delivered in #56

Pre-solution issue challenge:
- reporter claim: N/A: user requests a terminal script
- suggested diagnosis or fix: compose existing npm/pnpm commands, preserve human browser/2FA
- repro ladder:
  - tests / source-level repro: mocked CLI failure/success scenarios
  - Playwright / automated browser: N/A: no UI behavior
  - Browser plugin: N/A: npm auth is intentionally user-owned
  - screenshot / visual proof: N/A: terminal helper
- reproduction verdict: N/A: no bug claim
- validity verdict: valid
- best long-term fix boundary: local CLI helper; normal CI remains OIDC-only
- harsh honest feedback: pasted commands did not satisfy request for one file
- hard-stop decision: no real npm login/publication/trust by agent

Completion rule:
- Do not call `update_goal(status: complete)` while any required checklist item
  remains unchecked. If an item does not apply, check it and add `N/A: <reason>`.
- Do not call `update_goal(status: complete)` until every completion threshold
  above is satisfied, final handoff evidence is recorded, and
  `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-10-19-npm-bootstrap-trust.md` passes.
- Do not create hook state for this goal. This file plus the active goal are the
  durable state.

Start Gates:
| Gate | Applies | Evidence |
|------|---------|----------|
| Timed checkpoint parsed | no | N/A: no tracker, video, duration or reported bug; scoped release/helper work |
| Skill analysis before edits | yes | Source: user request, retained fork workflow, existing release.yml/bootstrap and installed npm CLI; concrete boundaries and proof recorded in this plan |
| Active goal checked or created | yes | Source: user request, retained fork workflow, existing release.yml/bootstrap and installed npm CLI; concrete boundaries and proof recorded in this plan |
| Source of truth read before edits | yes | Source: user request, retained fork workflow, existing release.yml/bootstrap and installed npm CLI; concrete boundaries and proof recorded in this plan |
| Tracker comments and attachments read | no | N/A: no tracker, video, duration or reported bug; scoped release/helper work |
| Video transcript evidence required | no | N/A: no tracker, video, duration or reported bug; scoped release/helper work |
| Pre-solution issue challenge required | no | N/A: no tracker, video, duration or reported bug; scoped release/helper work |
| Reproduction verdict before implementation | no | N/A: no tracker, video, duration or reported bug; scoped release/helper work |
| Repro escalation ladder selected | no | N/A: no tracker, video, duration or reported bug; scoped release/helper work |
| Suggested fix reviewed against durable boundary | yes | Source: user request, retained fork workflow, existing release.yml/bootstrap and installed npm CLI; concrete boundaries and proof recorded in this plan |
| `docs/solutions` checked for non-trivial existing-code work | no | N/A: no tracker, video, duration or reported bug; scoped release/helper work |
| TDD decision before behavior change or bug fix | yes | Source: user request, retained fork workflow, existing release.yml/bootstrap and installed npm CLI; concrete boundaries and proof recorded in this plan |
| Branch decision for code-changing task | yes | Source: user request, retained fork workflow, existing release.yml/bootstrap and installed npm CLI; concrete boundaries and proof recorded in this plan |
| Release artifact decision | yes | Source: user request, retained fork workflow, existing release.yml/bootstrap and installed npm CLI; concrete boundaries and proof recorded in this plan |
| Browser tool decision for browser surface | yes | Source: user request, retained fork workflow, existing release.yml/bootstrap and installed npm CLI; concrete boundaries and proof recorded in this plan |
| PR expectation decision | yes | Source: user request, retained fork workflow, existing release.yml/bootstrap and installed npm CLI; concrete boundaries and proof recorded in this plan |
| Dedicated task plan selected for exact PR | yes | Source: user request, retained fork workflow, existing release.yml/bootstrap and installed npm CLI; concrete boundaries and proof recorded in this plan |
| Tracker sync expectation decision | no | N/A: no tracker, video, duration or reported bug; scoped release/helper work |
| Output budget strategy recorded | yes | Source: user request, retained fork workflow, existing release.yml/bootstrap and installed npm CLI; concrete boundaries and proof recorded in this plan |
| Agent-native pack selected | yes | Source: user request, retained fork workflow, existing release.yml/bootstrap and installed npm CLI; concrete boundaries and proof recorded in this plan |
| Agent-facing action surface identified | yes | Source: user request, retained fork workflow, existing release.yml/bootstrap and installed npm CLI; concrete boundaries and proof recorded in this plan |
| Source rule versus generated mirror boundary identified | yes | Source: user request, retained fork workflow, existing release.yml/bootstrap and installed npm CLI; concrete boundaries and proof recorded in this plan |
| `agent-native-reviewer` loaded or waiver recorded | yes | Source: user request, retained fork workflow, existing release.yml/bootstrap and installed npm CLI; concrete boundaries and proof recorded in this plan |

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
- [x] Agent-native pack: source-of-truth rule files are edited instead of generated skill mirrors.
- [x] Agent-native pack: the changed agent action is discoverable from the skill/rule text.
- [x] Agent-native pack: generated mirrors are synced when `.agents/rules/**` changed, or N/A reason is recorded.
- [x] Agent-native pack: accepted agent-native review findings are fixed or explicitly rejected with reason.

- [x] Merge verified helper/workflow preservation PR #56 and read back final delivery.

Completion Gates:
| Gate | Applies | Required action | Evidence |
|------|---------|-----------------|----------|
| Named verification threshold | yes | Run the command, proof, source audit, or artifact check named in this plan | bash -n, help and dry-run PASS; 13 mocked CLI scenarios PASS with zero external npm mutations; user ran real script successfully |
| Pre-solution issue challenge verdict | no | Record reporter claim, suggested fix, repro verdict, validity verdict, durable boundary, and hard-stop/pivot decision before implementation | N/A: requested terminal helper, no user-reported behavior bug; failure handling covered by mocked CLI proof |
| Repro escalation ladder | no | For bug/behavior claims, record test/source-level, Playwright, Browser, and screenshot/visual-proof outcomes or N/A/blocker reasons before `not reproduced` | N/A: requested terminal helper, no user-reported behavior bug; failure handling covered by mocked CLI proof |
| Bug reproduced before fix | no | Record failing test/repro or N/A with reason | N/A: requested terminal helper, no user-reported behavior bug; failure handling covered by mocked CLI proof |
| Targeted behavior verification | yes | Run focused test/proof for changed behavior or record N/A | bash -n, help and dry-run PASS; 13 mocked CLI scenarios PASS with zero external npm mutations; user ran real script successfully |
| TypeScript or typed config changed | no | Run relevant typecheck | N/A: Bash operator helper and retained internal workflow documentation only; no package/runtime/UI/registry output delta |
| Package exports or file layout changed | no | Run `pnpm brl` before final verification and keep generated barrel updates | N/A: Bash operator helper and retained internal workflow documentation only; no package/runtime/UI/registry output delta |
| Package manifests, lockfile, or install graph changed | no | Run `pnpm install` and relevant package checks | N/A: Bash operator helper and retained internal workflow documentation only; no package/runtime/UI/registry output delta |
| Agent rules or skills changed | no | Run `pnpm install` and verify generated skill sync | N/A: fork rules/generated mirrors retained; no edits to .agents/rules or SKILL.md; no mirror regeneration required |
| Workspace authority proof | yes | Run verification in the owning repo/package/app/route/tool and record cwd; do not count the wrong workspace as proof | Source commands run in /run/media/lofcz/ssd_external/GitHub/plate; Sciobot no-cache dry-run run separately in owning sciobot-next cwd, exit 0, no app/lock edits |
| Browser surface changed | no | Capture Browser Use proof or record explicit waiver/blocker | N/A: Bash operator helper and retained internal workflow documentation only; no package/runtime/UI/registry output delta |
| Browser final proof | no | Attach screenshot or exact browser verification caveat when browser proof applies | N/A: Bash operator helper and retained internal workflow documentation only; no package/runtime/UI/registry output delta |
| CI-controlled template output changed | no | Restore generated template output or record why it is intentionally kept | N/A: root templates untouched; inherited docs/plans/templates are internal fork source docs restored from baseline |
| Package behavior or public API changed | no | Add a changeset or record why no changeset applies | N/A: Bash operator helper and retained internal workflow documentation only; no package/runtime/UI/registry output delta |
| User-visible registry output changed | no | Use the registry-changelog pack: add/update `apps/www/src/registry/changelog/entries/*.mdx`, run `node tooling/scripts/generate-ui-changelog-entries.mjs --write`, run `node tooling/scripts/generate-ui-changelog-entries.mjs --check`, or record N/A | N/A: Bash operator helper and retained internal workflow documentation only; no package/runtime/UI/registry output delta |
| Docs or content changed | yes | For docs-heavy work, use `--template docs`; for supporting public docs/content/API/example changes, load `docs-creator` and close the docs pack; for typo/link-only edits, record the explicit reason and proportional proof | Only internal workflow docs/templates restored exactly; no new public reference or MDX. Parent task owns supporting upstream docs proof |
| High-risk mini gate | yes | For public API/runtime/package-boundary/browser/agent-action/command-contract changes, record realistic failure mode, proof plan, and why the chosen boundary is right; otherwise N/A | Risk: publish wrong package/version or continue after errors. Fixed four-package scope, manifest validation, exact trust permission check and 13 mocked CLI scenarios PASS; real npm auth/publication stays with user |
| Agent-native review for agent/tooling changes | yes | For `.agents/**`, `.claude/**`, `.codex/**`, skills, hooks, commands, prompts, or user-action tooling, load `.agents/skills/agent-native-reviewer/SKILL.md` and close accepted/actionable findings, or record N/A | Incremental agent-native audit PASS: retained source owners and CLI discoverability; new helper exposes help/dry-run, shares workspace, and leaves user-reserved browser/2FA to human |
| Local install corruption suspected | no | Run `pnpm run reinstall` once, rerun the exact failing command, or record N/A | N/A: initial missing-dist symptoms coincided with active artifact build; coherent full check passed. No mixed React/Bun/pnpm runtime-corruption signals; no unnecessary reinstall |
| Autoreview for non-trivial implementation changes | yes | Load `.agents/skills/autoreview/SKILL.md`; use dirty local `--mode local`, branch/PR `--mode branch --base <base>`, or committed slice `--mode commit --commit <ref>` until no accepted/actionable findings, or record N/A for docs-only/trivial/no local patch | Source review-closure.json and bootstrap-review.json both report zero findings; helper review gpt-6.1-sol, confidence 0.91 |
| PR create or update | yes | Run `check` before PR work and sync PR body to the task-style final handoff | Full check PASS before #56; body names this plan once; exact head 953df5265b1a201c9c404e5637da4c1c3ab34c1c owns #56; merged a7c5a98389a8793cdbce99d6c3d71307173c9fa1 |
| Per-PR task ownership | yes | Verify one task-plan body line, plan at exact head, and exact PR ownership in this plan | Full check PASS before #56; body names this plan once; exact head 953df5265b1a201c9c404e5637da4c1c3ab34c1c owns #56; merged a7c5a98389a8793cdbce99d6c3d71307173c9fa1 |
| Task-style PR body verified | yes | Verify the PR body with `gh pr view --json body`; it must preserve auto-release blocks when applicable, must not include a current-PR self-link, and must use the kitcn PR #270 emoji format: `🐛 Fixes ...`, `🟢 95-100% confidence`, `Phase / 🧪 Tests / 🌐 Browser` table, and bold emoji Outcome/Caveat/Design/Verified sections | Full check PASS before #56; body names this plan once; exact head 953df5265b1a201c9c404e5637da4c1c3ab34c1c owns #56; merged a7c5a98389a8793cdbce99d6c3d71307173c9fa1 |
| PR proof image hosting | no | If PR body needs browser proof, replace local image paths with hosted GitHub URLs or record N/A | N/A: no browser screenshot available; exact browser caveat recorded in PR bodies |
| Tracker sync-back | no | Post concise issue/Linear sync after PR exists, or record N/A/blocker | N/A: direct user request, no issue/Linear tracker |
| Final handoff contract | yes | Fill the final handoff fields below with exact PR/issue/confidence/tests/browser/outcome/caveats/design/verification content or N/A reason | Full check PASS before #56; body names this plan once; exact head 953df5265b1a201c9c404e5637da4c1c3ab34c1c owns #56; merged a7c5a98389a8793cdbce99d6c3d71307173c9fa1 |
| Final lint | yes | Run `pnpm lint:fix` or scoped equivalent | pnpm lint:fix PASS (3385 files, no fixes); full-check lint PASS; bash syntax and git diff --check PASS |
| Output budget discipline | yes | Verify no unbounded high-volume command output was streamed, or record the accidental output and recovery | Initial upstream stat and broad utility search exceeded cap; recovered with scoped paths, bounded reads and saved log/artifact summaries |
| Timed checkpoint | no | If duration was requested, keep improving until elapsed, then finish the current loop cleanly; otherwise N/A | N/A: no duration requested |
| Goal plan complete | yes | Run `node .agents/skills/autogoal/scripts/check-complete.mjs docs/plans/2026-10-19-npm-bootstrap-trust.md` | Run this plan through node .agents/skills/autogoal/scripts/check-complete.mjs after PR delivery and record result in final audit |
| Agent source / generated sync | no | Run `pnpm install` when `.agents/rules/**` changed and verify generated mirrors | N/A: fork rules/generated mirrors retained; no edits to .agents/rules or SKILL.md; no mirror regeneration required |
| Agent action discoverability | yes | Source-audit the skill/rule path an agent will read | scripts/bootstrap-publish-and-trust.sh --help/--dry-run document the exact CLI; retained fork task/autogoal/release command docs/templates restored together |
| Agent-native review | yes | Load `.agents/skills/agent-native-reviewer/SKILL.md` and close accepted findings, or record N/A | Incremental agent-native audit PASS: retained source owners and CLI discoverability; new helper exposes help/dry-run, shares workspace, and leaves user-reserved browser/2FA to human |

Phase / pass table:
| Phase | Status | Evidence | Next |
|-------|--------|----------|------|
| Intake and source read | done | User script request, existing bootstrap, fork workflow and installed npm trust CLI read | implementation |
| Implementation | done | Helper with exact targets/trust checks and 43 baseline-identical workflow docs | verification |
| Verification | done | Full check 56 builds/types, 3984 fast, 570 slow; 13 mocks; clean review; 12 tarball integrity/export checks | delivery |
| PR / tracker sync | done | #56 owns this exact plan; body names it once; no tracker | closeout |
| Closeout | done | Final check/registry/tag/release evidence PASS; helper/docs #56 merged at a7c5a98389a8793cdbce99d6c3d71307173c9fa1 | complete |

Findings:
- Existing bootstrap PowerShell utility handles token publication only. New helper composes human web login, four exact package publishes and trusted-publisher checks.
- User execution completed all four packages; registry readback verifies 12/12 target versions.
- Inherited 43 internal fork workflow documents match baseline exactly and must be delivered with preserved owners.

Decisions and tradeoffs:
- Keep the helper local/interactive, with --help/--dry-run/--skip-build. Do not add token fallback to routine CI.
- Preserve the same four package names and manifest versions. Verify repository/workflow/environment and publish permission before skipping trust.
- Include inherited workflow documentation restoration from parent scope in final delivery; no product/package/registry source changes.

Implementation notes:
- None yet.

Review fixes:
- None yet.

Error attempts:
| Error / failed attempt | Count | Next different move | Resolution |
|------------------------|-------|---------------------|------------|
| None yet | 0 | | |

Verification evidence:
- bash -n, help and dry-run PASS; 13 mocked CLI scenarios PASS with zero external npm mutations; user ran real script successfully
- Source review-closure.json and bootstrap-review.json both report zero findings; helper review gpt-6.1-sol, confidence 0.91
- .tmp/upstream-sync/bootstrap-script-proof.json and bootstrap-review.json contain focused results.
- .tmp/upstream-sync/npm-verification.json proves 12/12 target versions/latest/integrity and fork aliases; user output confirms successful publication/trust.
- Fresh whole-repo check /tmp/plate-bootstrap-check.log PASS before PR creation: 56 builds/types, 3984 fast, 570 slow, timing gate exit 0; no runtime source edits.
- 43 inherited restored docs match baseline 8c500a93d1 exactly: closeout-audit.json.

Final handoff contract:
- PR line: https://github.com/lofcz/plate/pull/56
- Issue / tracker line: N/A: direct user request
- Confidence line: 95%; executable proof and clean structured review
- Flow table:
  - Reproduced: partial release auth blocker; 13 mocked CLI success/failure cases; browser N/A for terminal helper
  - Verified: full pnpm check plus script syntax/dry-run/mocks; browser N/A for terminal helper
- Browser check: N/A: terminal helper. Parent source task records unavailable browser tools.
- Outcome: user ran helper successfully; all twelve packages verified; helper/workflow docs merged
- Caveat: human browser/2FA intentional; parent UI browser proof unavailable; optional manifest checker is upstream-only
- Design:
  - Chosen boundary: npm/pnpm CLI composition with fixed package scope and trusted-publisher checks
  - Why not quick patch: one runnable script must validate identities and stop after auth/registry/publish/trust failures
  - Why not broader change: routine OIDC workflow needs no token fallback or new publishing policy
- Verified: 13 mocks, syntax/help/dry-run, clean review, final full check, user execution and npm/GitHub readback
- PR body verified: gh exact head/body readback for #56; one task-plan line, no self-link

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
- PR: https://github.com/lofcz/plate/pull/56, merged a7c5a98389a8793cdbce99d6c3d71307173c9fa1
- Task plan at exact PR head: verified 953df5265b1a201c9c404e5637da4c1c3ab34c1c
- Issue / tracker: N/A: no tracker
- Browser proof: N/A: terminal helper; inherited source browser caveat recorded
- Caveats: human auth intentional; inherited browser/optional manifest-checker limitations recorded

Timeline:
- 2026-10-19T03:56:35.683Z Task goal plan created.

Reboot status:
| Question | Answer |
|----------|--------|
| Where am I? | Complete; helper and retained fork workflow docs merged |
| Where am I going? | No required work remains; final completion audit |
| What is the goal? | Deliver a verified human-operated npm bootstrap helper and preserve fork workflow docs |
| What have I learned? | See Findings |
| What have I done? | See Timeline |

Open risks:
- No remaining publication or delivery blocker. Twelve npm versions, tarballs and release tags verified; three task-owned PRs merged.
- Browser proof unavailable; optional upstream-only manifest checker rejects intentional fork aliases.
- Four manual bootstrap packages lack provenance for this version; trusted publishers are configured for future CI.
- One upstream DOCX pageNumber feature arrived after the frozen 7937212aab snapshot; it belongs to a subsequent release.
- Postpublish registry/template job skipped after manual recovery; no local generated outputs changed.

Task intake:
- Separate task invocation for the requested local bootstrap script. User wants one runnable file, not pasted commands.
- N/A: tracker, bug claim, video, duration, product API/behavior changes, changesets and browser QA.
- Risk: accidental duplicate/wrong-name publication or continuing after failed trust. Fixed package allowlist, manifest identity check, stop-on-error, dry-run and mocked CLI ordering prove the boundary.

Script implementation checkpoint:
- Created executable scripts/bootstrap-publish-and-trust.sh. Run: bash scripts/bootstrap-publish-and-trust.sh. Optional --dry-run and --skip-build are documented by --help.
- Scope: table, csv, list-classic and test-utils only; every target manifest identity checked before external commands; versions come from current manifests.
- Build precedes browser login; token environment variables are cleared for the subprocess; normal release.yml stays unchanged. No credentials are written by the script.
- Registry lookup only permits publication after E404; auth/network errors stop. Publish and trust failures stop before later packages.
- Existing versions skip publication; matching GitHub lofcz/plate release.yml trust with no environment constraint and createPackage permission skips trust creation. Stage-only or other-repo trust does not count.
- bash -n, --help and actual --dry-run pass. Mocked CLI integration: 13 scenarios pass, zero external npm mutations. Evidence .tmp/upstream-sync/bootstrap-script-proof.json; reusable local harness .tmp/upstream-sync/test-bootstrap-script.py.
- Agent-native review: help exposes commands, same workspace and npm primitives are available to agents, and browser/2FA remains intentionally human-only under explicit user instruction. No accepted findings.
- Structured autoreview PASS: local diff, configured gpt-6.1-sol, zero findings, confidence 0.91. Evidence .tmp/upstream-sync/bootstrap-review.json. Script source unchanged after review.
- User-owned manual step is complete. Deliver the helper and inherited restored workflow docs after the final check; package/registry/template source stays untouched.

Inherited delivery scope:
- This task also delivers the parent release's 43 restored fork workflow documents, unchanged from baseline, plus final plan evidence. This is preserved original sync scope, not new product work.
- [x] Commit/push helper and inherited docs after full check, bind this plan to #56, then merge and audit readback.

Publication recovery evidence:
- User completed bootstrap; 2026-10-19T13:52:26.498Z registry readback: 12/12 versions/latest/integrity/dependency aliases pass.
- Sciobot bun install --dry-run --ignore-scripts --no-cache PASS in owning repo, 880ms; consumer package.json/bun.lock not changed by agent. Recommend bun install --no-cache after publication propagation.
- GitHub release https://github.com/lofcz/plate/releases/tag/v53.6.2 and all twelve package tags verified at d81a8eee2cca9f38a0cb04d88a0019405bf109c6.
- Release run 39195543568 attempt 2 requested once after manual auth/publication repair; terminal outcome and artifact-job disposition must be read back before final goal completion.

Terminal workflow readback:
- ReleaseOrVersionPR run 39195543568 attempt 2 SUCCESS. All versions were already published by then; the conditional registry/template job was skipped. Root generated outputs remain under CI ownership; none generated locally. GitHub release/tags were recovered with gh after full 12/12 registry verification.

Exact PR ownership: lofcz/plate#56 (https://github.com/lofcz/plate/pull/56). This separate task invocation owns only this helper/workflow preservation PR. Parent #54/#55 each retain their own task plan.
- Full final check evidence: .tmp/upstream-sync/bootstrap-check-result.json and /tmp/plate-bootstrap-check.log, exit 0.
- Actual published artifact evidence: 12 tarballs, 497787 bytes, 45 export targets verified; .tmp/upstream-sync/npm-artifact-verification.json.

Final completion audit:
- Source #54 and version #55 merged with exact plan ownership; helper/workflow preservation #56 merged at a7c5a98389a8793cdbce99d6c3d71307173c9fa1, exact head 953df5265b1a201c9c404e5637da4c1c3ab34c1c.
- Final full check PASS (56 builds, 56 typechecks, 3984 fast, 570 slow, timing gate); focused helper proof 13/13; structured review zero findings.
- Public registry metadata 12/12 PASS; actual tarball integrity and manifests 12/12 PASS; 45 export targets present; twelve package tags plus v53.6.2 point to frozen source d81a8eee2cca9f38a0cb04d88a0019405bf109c6.
- Release workflow attempt 2 SUCCESS; conditional registry/template job skipped after manual publication. Source release/package improvements and retained fork workflows are delivered.
- User's npm prerequisite is resolved. Sciobot uncached Bun dry-run passed; no consumer edits by agent. Existing consumer core/utils overrides remain at older pins and were reported to user.
- Origin tag fetch retained three existing legacy local tags rather than clobber them; all thirteen new release tags fetched and verified. No legacy refs moved.
- All named plan checkers run before goal completion; final evidence-only documentation commit is pushed with [skip release].
