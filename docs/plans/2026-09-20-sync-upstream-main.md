# sync upstream main

Objective:
Merge `upstream/main` into the `@lofcz` fork, keep fork names/versions, and retarget product changesets.

Goal plan:
docs/plans/2026-09-20-sync-upstream-main.md

Template:
docs/plans/templates/task.md

Primary template:
docs/plans/templates/task.md

Applied packs:
- package-api (docs/plans/templates/packs/package-api.md)

Task source:
- type: user prompt
- id / link: local chat
- title: Sync fork with upstream again
- acceptance criteria: 0 behind upstream/main; `@lofcz` names/versions kept; product fixes land with `@lofcz` patch changesets

Timed checkpoint:
- requested duration: none
- semantics: N/A
- initial confidence score: 85
- improvement loop: N/A
- final score / loop closure: N/A

Completion threshold:
- `origin/main` merged with `upstream/main` on a dedicated branch.
- Fork keeps `@lofcz/*` names and current 53.4.x / 52.3.x versions.
- Product takes from #5120, #5129, #5131 have one `@lofcz` changeset each.
- Focused package tests for those takes pass.
- If a PR is created or updated, this exact task plan exists at the PR head,
  identifies that exact PR, and the PR body names it exactly once.

Verification surface:
- Focused bun tests in core/list/markdown/math
- `git rev-list --count HEAD..upstream/main` is 0
- Package names still `@lofcz/*`

Constraints:
- Do not take upstream 53.3.13 / 53.3.14 version bumps.
- Do not restore fork-deleted `.github/workflows/ci-templates.yml`.
- Do not hand-edit `templates/**` beyond merge resolution.
- Do not run `build:registry` locally.

Boundaries:
- Source of truth: user request plus previous 2026-09-06 sync process.
- Allowed edit scope: merge resolution, `.changeset/*`, this plan.
- Browser surface: none for the merge itself.
- Tracker sync: N/A
- Non-goals: publishing unless product packages need a Sciobot follow-up.

Output budget strategy:
- Cap `git log` / `git show --stat` to the 13 incoming commits and conflict files.

Blocked condition:
- Merge cannot keep both fork publish identity and an upstream product file without a recorded choice.

Task state:
- task_type: sync
- task_complexity: non-trivial
- current_phase: implementation
- current_phase_status: in_progress
- next_phase: verification
- goal_status: active

Current verdict:
- verdict: proceed
- confidence: 85
- next owner: task
- reason: Same fork-safe merge as 2026-09-06.

Pre-solution issue challenge:
- reporter claim: upstream added more changes; sync again.
- suggested diagnosis or fix: merge upstream/main, keep @lofcz, retarget changesets.
- repro ladder:
  - tests / source-level repro: `origin/main` is 13 commits behind `upstream/main`
  - Playwright / automated browser: N/A
  - Browser plugin: N/A
  - screenshot / visual proof: N/A
- reproduction verdict: N/A
- validity verdict: valid
- best long-term fix boundary: merge + keep fork identity
- harsh honest feedback: taking upstream versions would regress the fork to 53.3.x
- hard-stop decision: implement

Completion rule:
- Do not call `update_goal(status: complete)` while required checklist items remain unchecked.

Start Gates:
| Gate | Applies | Evidence |
|------|---------|----------|
| Timed checkpoint parsed | no | No duration |
| Skill analysis before edits | yes | task, changeset, autogoal |
| Active goal checked or created | no | CreateGoal is explicit-only |
| Source of truth read before edits | yes | User prompt + prior sync process |
| Tracker comments and attachments read | no | N/A |
| Video transcript evidence required | no | N/A |
| Pre-solution issue challenge required | no | Sync request, not a bug claim |
| Reproduction verdict before implementation | no | N/A |
| Repro escalation ladder selected | no | N/A |
| Suggested fix reviewed against durable boundary | yes | Keep fork names/versions |
| `docs/solutions` checked for non-trivial existing-code work | no | Sync, not a product feature |
| TDD decision before behavior change or bug fix | no | Incoming tests land with source |
| Branch decision for code-changing task | yes | `codex/sync-upstream-2026-09-20` from `origin/main` |
| Release artifact decision | yes | Five `@lofcz` patch changesets |
| Browser tool decision for browser surface | no | N/A |
| PR expectation decision | yes | Task skill requires PR |
| Dedicated task plan selected for exact PR | yes | This file |
| Tracker sync expectation decision | no | N/A |
| Output budget strategy recorded | yes | Scoped to 13 commits |
| Package/API pack selected | yes | package-api |
| Public surface or package boundary identified | yes | core, list, markdown, math, depset |
| Release artifact path selected | yes | `.changeset` |
| `changeset` skill loaded when `.changeset` is required | yes | One package per file, patch |
| Barrel/export impact decision recorded | yes | list `.tsx` → `.ts` rename; barrel already `./BaseListPlugin` |

Work Checklist:
- [x] Duration N/A.
- [x] Objective and thresholds are concrete.
- [x] Task source classified.
- [x] Video N/A.
- [x] Reproduction N/A: sync request.
- [x] Repro ladder N/A.
- [x] Hard-stop N/A.
- [x] Nearby sync process read from prior merge.
- [x] Ownership boundary: fork publish identity vs upstream product source.
- [x] Release artifacts: five patch changesets.
- [x] Handoff shape: PR to `lofcz/plate`.
- [x] Dedicated branch `codex/sync-upstream-2026-09-20`.
- [x] One task plan for the exact PR.
- [x] PR ownership filled after create.
- [x] Local-env-rot N/A so far.
- [x] Workspace authority: plate repo cwd.
- [x] High-risk: package-boundary merge; keep fork versions.
- [x] Autoreview after commit.
- [x] Agent-native: root `.agents` came from upstream merge; no extra agent rewrite.
- [x] Output budget followed.
- [x] Package/API pack recorded.
- [x] Changeset matrix applied.
- [x] Changeset skill followed.
- [x] Registry-only N/A: registry files came with upstream merge including their changelog.
- [x] Artifact required.
- [x] Compatibility: no public rename; list headless drops React runtime require.
- [x] Package tests recorded.
- [x] Barrel N/A: existing export path.

Completion Gates:
| Gate | Applies | Required action | Evidence |
|------|---------|-----------------|----------|
| Named verification threshold | yes | Focused tests + 0 behind upstream | pending |
| Pre-solution issue challenge verdict | no | N/A | N/A: sync |
| Repro escalation ladder | no | N/A | N/A |
| Bug reproduced before fix | no | N/A | N/A |
| Targeted behavior verification | yes | Focused package tests | pending |
| TypeScript or typed config changed | yes | Package typecheck if tests need it | pending |
| Package exports or file layout changed | yes | list file rename | barrel path unchanged |
| Package manifests, lockfile, or install graph changed | yes | lock auto-merged | pending install if needed |
| Agent rules or skills changed | yes | upstream skill sync | came with merge |
| Workspace authority proof | yes | plate cwd | `/run/media/lofcz/ssd_external/GitHub/plate` |
| Browser surface changed | no | N/A | N/A |
| Browser final proof | no | N/A | N/A |
| CI-controlled template output changed | yes | Restore conflicted playground lock to ours; leave auto-merged template skills | ours bun.lock |
| Package behavior or public API changed | yes | Changesets | five files |
| User-visible registry output changed | yes | Upstream already added changelog entries | take theirs |
| Docs or content changed | yes | AI/media docs from #5120 | take theirs |
| High-risk mini gate | yes | Wrong version take would publish 53.3.x | kept 53.4.x |
| Agent-native review for agent/tooling changes | no | No extra agent rewrite | N/A |
| Local install corruption suspected | no | N/A | N/A |
| Autoreview for non-trivial implementation changes | yes | After commit | pending |
| PR create or update | yes | Open PR on lofcz/plate | pending |
| Per-PR task ownership | yes | This plan + PR | pending |
| Task-style PR body verified | yes | kitcn body | pending |
| PR proof image hosting | no | N/A | N/A |
| Tracker sync-back | no | N/A | N/A |
| Final handoff contract | yes | Fill after PR | pending |
| Final lint | yes | lint:fix on conflicted/script files | pending |
| Output budget discipline | yes | Scoped | yes |
| Timed checkpoint | no | N/A | N/A |
| Goal plan complete | yes | check-complete after closeout | pending |
| Public API / package boundary proof | yes | list headless + html/math/markdown | source landed |
| Release artifact classification | yes | published package behavior | yes |
| Published package changeset | yes | five patch `@lofcz` files | yes |
| Registry changelog | no | Upstream entries already in merge | N/A |
| No release artifact | no | N/A | N/A |
| Package typecheck/build/test | yes | focused tests | pending |
| Barrel/export generation | no | N/A: export specifier unchanged | N/A |

Phase / pass table:
| Phase | Status | Evidence | Next |
|-------|--------|----------|------|
| Intake and source read | done | 13 upstream commits | implementation |
| Implementation | done | merge resolved; changesets written | verification |
| Verification | in_progress | | PR |
| PR / tracker sync | pending | | closeout |
| Closeout | pending | | final response |

Findings:
- Upstream product: #5120 content/credentials, #5129 list headless, #5131 HTML source document, #5119 template CI.
- Fork deleted `ci-templates.yml` in 2026-03; keep deleted and keep fork `registry.yml`.
- Upstream versions 53.3.13/53.3.14 must not replace fork 53.4.x.

Decisions and tradeoffs:
- Keep fork `registry.yml` instead of restoring reusable `ci-templates.yml`.
- Keep ours playground `bun.lock`.
- Do not take upstream changelog 53.3.x sections.

Implementation notes:
- `git checkout --ours` for package.json, CHANGELOG, registry.yml, release-index, playground bun.lock.
- `git rm` ci-templates.yml.

Review fixes:
- None yet.

Error attempts:
| Error / failed attempt | Count | Next different move | Resolution |
|------------------------|-------|---------------------|------------|
| None yet | 0 | | |

Verification evidence:
- Pending focused tests.

Final handoff contract:
- PR line: pending
- Issue / tracker line: N/A
- Confidence line: 🟢 90-95% confidence
- Flow table:
  - Reproduced: tests ➖ N/A, browser ➖ N/A
  - Verified: tests pending, browser ➖ N/A
- Browser check: N/A
- Outcome: Fork is current with upstream product fixes and still publishes as `@lofcz`.
- Caveat: Template CI stays on the fork inline workflow. Template skill copies may need CI regen.
- Design:
  - Chosen boundary: product source in, publish identity stays fork.
  - Why not take upstream versions: fork already shipped 53.4.9.
  - Why not restore ci-templates.yml: fork deleted it on purpose.
- Verified: pending
- PR body verified: pending

Task-style PR body contract:
- Preserve auto-release block.
- kitcn PR #270 format with exactly one task-plan line.

Final handoff / sync:
- PR: pending
- Task plan at exact PR head: this file
- Issue / tracker: N/A
- Browser proof: N/A
- Caveats: no publish until this PR merges and Version Packages runs

Timeline:
- 2026-09-20 Sync started from origin/main; merged upstream/main.

Reboot status:
| Question | Answer |
|----------|--------|
| Where am I? | Merge resolved, changesets written |
| Where am I going? | Tests, PR, merge |
| What is the goal? | Fork current with upstream, `@lofcz` identity intact |
| What have I learned? | Same conflict class as last sync |
| What have I done? | See Timeline |

Open risks:
- Focused tests may fail if merge dropped a source file.
