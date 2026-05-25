---
"@platejs/markdown": patch
---

Fix critical source-map bug: blocks whose body was filtered out by
`disallowedNodes` (e.g. `disallowedNodes: ['suggestion']` in an AI-review
overlay) silently lost their leaf segments. `resolveSelectionByPath` then
fell back to the nearest ancestor in `allSegments`, which for typical
MDX-wrapped content was the surrounding container (often an entire
`<activity>` or `<lesson_phase>`). A user selecting one suggested bullet
ended up with a quote chip advertising the whole 20+ line container.

The handler wrap inside `serializeMdWithSourceMap` now pushes a segment
for every block-level node it visits, regardless of whether the emitted
markdown body is empty. The `emitted.trim()` guard was over-broad: it
was originally meant to filter inline/text mdast nodes, but those
already lack `data.sourceMap` so the `source` check alone is sufficient.

Regression coverage added under `issue #9` in both
`resolveSelectionLines.slow.ts` and `serializeMdWithSourceMap.slow.ts`.
