---
"@lofcz/platejs-core": patch
---

Fix `.configure({ inputRules })` losing rules on subsequent editor instances, and fix `createTextSubstitutionInputRule` not firing on the final character of flat matches (e.g. `->` → `→`, `(c)` → `©`). Merged from upstream udecode/plate#4983.
