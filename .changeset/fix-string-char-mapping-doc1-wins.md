---
'@lofcz/platejs-diff': patch
---

Fix `computeDiff` returning stale `ignoreProps` values on unchanged nodes. With `ignoreProps: ['id']` (or any other ignored prop), the engine kept the doc0 node identity for unchanged chars — so a node whose only difference was its `id` would silently revert to the old `id` in the output. `StringCharMapping.nodeToChar` now overwrites the entry with the latest occurrence, so doc1 wins for kept content while deletes and inserts stay correct.
