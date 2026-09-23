---
"@lofcz/platejs-ai": patch
---

Replaced blocks no longer open a gap of empty lines during playback. The changed area keeps the old height until playback reaches it, collapses while the old blocks fade out, then grows line by line behind the typing caret. Pure inserts take no space before they are revealed.
