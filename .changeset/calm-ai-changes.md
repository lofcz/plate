---
"@lofcz/platejs-ai": minor
---

Make AI change tracking calmer. Changed blocks get one soft tint, with no side bar, word marks or removal markers. The tint fades out for good after the user rests the pointer on the block (`acknowledgeDelay`, default 600 ms), edits inside it, or starts a new AI session.

- Remove the Keep/Revert hover chip, the `labels` option, and the `accept`, `acceptAll`, `reject` and `rejectAll` APIs. Use `aiChanges.settleAll()` to clear every highlight.
- Pure removals are no longer tracked as changes; playback still shows removed blocks leaving.
