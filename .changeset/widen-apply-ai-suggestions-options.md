---
'@lofcz/platejs-ai': patch
---

`ApplyAISuggestionsOptions` now forwards `groupConsecutiveChanges` and `runScopeWordHints` from `ComputeDiffOptions`. Callers of `applyAISuggestions` can opt into the run-scope, git-diff-style presentation (consecutive change blocks coalesced into one run, all deletes above all inserts, word-level marks recomputed across concatenated run text) by passing these flags alongside the existing `granularity: 'block'` + `pairOrder: 'insert-first'`. Mirrors the same options already available on `diffToSuggestions` and `computeDiff`.
