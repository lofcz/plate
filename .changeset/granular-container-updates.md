---
"@lofcz/platejs-diff": minor
"@lofcz/platejs-suggestion": minor
---

Granular container property updates in diffs + block-element update accept/reject.

**diff:** Add `getStructuralKey` so two nodes that are "the same block" (per the `getDiffStrategy` container identity) map to the same DMP char, keeping them paired instead of cascading into a whole-container delete+insert. `DiffStrategy` containers now support `updateProps`: prop-only changes (identity intact) mark a granular `update` suggestion on the container rather than replacing the block. Fixes a single `lesson_activity` rename/duration change striking through the entire parent `lesson_phase`.

**suggestion:** Store both old (`properties`) and new (`newProperties`) values for block-element update suggestions; `acceptSuggestion` keeps the new values and clears the suggestion flags, `rejectSuggestion` restores old values / unsets newly added ones and clears the flags.
