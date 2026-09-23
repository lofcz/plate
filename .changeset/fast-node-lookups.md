---
"@lofcz/platejs-slate": patch
"@lofcz/platejs-core": patch
---

Avoid throwing Slate lookups for missing paths in `NodeApi.get`, `NodeApi.parent` and `editor.api.node`; Slate serializes the whole document into those errors, which made transforms on large documents take seconds. `getPluginType` returns the key directly for unregistered plugins instead of building a throwaway plugin.
