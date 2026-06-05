---
"@lofcz/platejs-core": patch
"@lofcz/platejs-table": patch
"@lofcz/platejs-docx-io": patch
---

Ship merged upstream code that had no changeset of its own:

- core: large-document rendering and node-id performance work; `transformInitialValue` pipeline (legacy `normalizeInitialValue` handlers stay supported via alias).
- table: remove the table when deleting its final column.
- docx-io: drop leading blank paragraphs in `exportToDocx`.
