---
"@lofcz/platejs-diff": minor
"@lofcz/platejs-suggestion": minor
"@lofcz/platejs-ai": minor
---

Block-level diff with word-level hints (new-above-old)

`computeDiff` now supports three opt-in options that together let you produce
a code-editor-style diff instead of the default inline character diff:

- `granularity: 'inline' | 'block'` — when set to `'block'`, each top-level
  descendant is treated as the atomic diff unit. Paired delete/insert blocks
  carry a shared `pairId` so the suggestion plugin can accept/reject them as
  one change. Inside paired prose-like blocks (same element type, leafy
  children), a secondary word-level diff is computed and only the changed
  words get insert/delete marks; unchanged words and inline marks survive
  untouched. Non-prose pairs (different types, code blocks, MDX components,
  blocks with nested elements) fall back to whole-block delete + insert.
- `pairOrder: 'delete-first' | 'insert-first'` — controls flush order for
  paired blocks. The default `'delete-first'` matches `git diff`; pass
  `'insert-first'` to render the new content above the deleted content
  ("read-the-new-content-first" presentation).
- `wordBoundary?: RegExp` — caller-supplied tokenisation boundary used by
  block-mode word hinting. Default is `/(\s+)/u`. The regex MUST keep
  separators on `split()`; if it doesn't, it's wrapped automatically.
- `generatePairId?: () => string` — mints the shared id per matched
  (delete-block, insert-block) tuple. Pass a nanoid-based generator for
  globally-unique ids; defaults to a per-run counter.

`getDeleteProps` / `getInsertProps` now receive an optional second argument
`{ pairId }` so callers can attach the shared id to both halves of a pair.
The parameter is optional and existing callers continue to work unchanged.

`@platejs/suggestion`'s `diffToSuggestions` forwards the new options and
threads `pairId` into both halves of a pair via `getSuggestionProps`. Its
`unifyAdjacentSuggestionIds` post-pass now also handles the `insert → remove`
leaf order produced by `pairOrder: 'insert-first'`.

`@platejs/ai`'s `applyAISuggestions` accepts an optional `diffOptions` argument
that is forwarded to `diffToSuggestions`, so AI editors can opt into block
granularity without forking the helper.

All changes are additive and the default behavior is unchanged — callers
that don't set `granularity` get byte-for-byte the same output as before.
