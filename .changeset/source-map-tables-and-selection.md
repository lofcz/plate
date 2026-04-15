---
"@lofcz/platejs-markdown": patch
"@lofcz/platejs-slate": patch
---

Fix source map generation for tables inside MDX containers and add `resolveSelectionByPath`

**`@lofcz/platejs-markdown`**

- Fix `attachDescendantSources` to recurse into `table` nodes nested inside MDX containers, ensuring `table_cell` segments are produced for nested tables.
- Add `resolveSelectionByPath` — resolves a Plate editor selection to markdown line ranges using source-map path mapping with sub-line narrowing and MDX container expansion.
- Return `allSegments` (including container-level segments) from `serializeMdWithSourceMap` alongside the existing leaf-only `segments`.
- Allow empty text-centric blocks (empty paragraphs) to produce segments for accurate line mapping.
- Add `attachListSources` for correct source mapping of flat Slate list paragraphs to nested mdast list structures inside MDX.

**`@lofcz/platejs-slate`**

- Log a warning in `toSlateRange` when DOM-to-Slate range conversion fails instead of silently swallowing the error.
