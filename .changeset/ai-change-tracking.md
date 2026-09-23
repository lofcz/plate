---
"@lofcz/platejs-ai": minor
---

Rework direct AI edits around a structural diff and a minimal live-tree commit, so unaffected nodes keep their identity and large documents no longer lag while edits apply.

- Play edits back with a typing caret and fading trail, fade removed blocks out as ghosts before inserting the replacement, and highlight rewritten words.
- Add `AIChangesPlugin`: changed sections stay highlighted until the user hovers them, types into them, or a new edit session starts. A hover chip lets the user keep or revert each change.
- `applyAnimatedAIEdit(editor, value, options)` commits the target value itself and returns the committed changes. New options: `beforeValue` (canonical pre-edit value), `session`, `ignoreProps`. The `apply` callback and `getAIEditPaths` are removed.
- `acceptAISuggestions` and `rejectAISuggestions` resolve each suggestion once and also clear transient markers inside void elements.
