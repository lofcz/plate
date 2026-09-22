# Soft AI document reveal

Objective:
Replace the abrupt full-rewrite flash with a readable hold and soft directional reveal, retaining the two-second maximum budget. Reuse Sciobot suggestion preparation, acceptance, grouping and collapsed-section navigation for full fidelity and one atomic undo transaction.

Task source:
User requests a prettier transition after deployed 53.4.12; prior authorization to publish/deploy persists. User explicitly forbids whole-monorepo checks.

Completion threshold:
A 1350ms hold/reveal/settle transition; no global opacity flash; all overlays clean up; focused browser proof; published and deployed.

Verification surface:
17 direct-edit Chromium scenarios including large section insertion, first-change scrolling, sequential live reveal, 18-region rewrite, budget, interruption and unmount. Seven Sciobot parity cases compare direct commits to accepted suggestions, exact undo/redo and a single final onChange notification; 14 focused Sciobot tests total. Scoped AI typecheck and reviews.

Constraints:
Preserve atomic undo/redo, reduced motion, original visible snapshot and deadline. No monorepo checks.

Boundaries:
AI package playback and commit/reveal adapters, browser assertions, patch release; Sciobot shared review-diff preparation and acceptance, navigation helper, parity tests and dependency.

Blocked condition:
Actual release/deployment failure without an in-scope repair.

Work Checklist:
- [x] Source inspected: old 480ms whole-root dimming/blur makes a flash.
- [x] Focused verification and visual inspection.
- [ ] Publish patch and deploy Sciobot.

Phase / pass table:
| Phase | Status | Evidence |
|---|---|---|
| Implementation | done | Hold then feathered mask reveal with restrained light sweep |
| Verification/release | in_progress | Focused checks only, per user |

Verification evidence:
Focused checks recorded during execution.

Reboot status:
17 Chromium tests and 14 Sciobot tests pass; package types pass; visual sweep inspected via dev-browser. Final review, publish and deploy pending.

Open risks:
Existing baseline table failures remain outside scope; monorepo gate waived by user.

PR: https://github.com/lofcz/plate/pull/46

Review: Plate structured autoreview clean. Downstream review correctly requires the pending dependency update before deployment; resolved by publishing this API and updating Sciobot together. AI unit tests: 14 pass, 313 assertions.
