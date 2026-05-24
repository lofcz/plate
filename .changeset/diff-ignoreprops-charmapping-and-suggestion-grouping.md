---
'@lofcz/platejs-diff': patch
---

`computeDiff` now honours `ignoreProps` at the char-mapping layer. Two nodes that differ only in an ignored property (e.g. fresh `id`s from `deserializeMd` on every parse) are recognised as the same node by DMP, instead of forcing the whole region into a delete+insert pair.

`groupConsecutiveChanges` and `runScopeWordHints` now work with suggestion-plugin consumers. The transform recognises both marker styles — the engine's `diffOperation` + `pairId` and the suggestion plugin's `suggestion` + `suggestion.id` — so `diffToSuggestions` callers get run grouping and run-scope word hints instead of silently dropping them. The leaf-cleanup pass also strips `suggestion`, `suggestion_<id>`, and `suggestionTransient` keys so the rehint doesn't bake stale marks into the rebuilt leaf.
