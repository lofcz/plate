---
'@lofcz/platejs-markdown': patch
---

Fix `parseAttributes` / `propsToAttributes` self-amplifying junk attribute leak across serialize → deserialize round-trips.

MDX boolean attributes (`<tag attr>` with no `=value`) arrive from `remark-mdx` as `{ name: 'attr', value: null }`. The previous `parseAttributes` accepted `null` (only `undefined` was filtered) and set `props.attr = null` on the Slate node. On the next serialize, `propsToAttributes` saw `attr: null`, ran it through `JSON.stringify(null) = "null"`, and re-emitted `<tag attr="null">` — which `parseAttributes` then read back as `attr: "null"` (a string). The same key would keep changing shape on every round trip, polluting nodes with stale attributes and breaking idempotency of `serialize → deserialize`.

This was especially harmful for diff engines that compare Slate trees by JSON equality (or that hand nodes to DMP via `StringCharMapping`): two otherwise-identical subtrees with the same content would disagree on a junk attribute like `_id` and be emitted as a full delete + insert pair, defeating per-block container strategies that should have recursed into inner changes.

- `parseAttributes` now skips attributes whose value is `null` or `undefined`. Boolean MDX attributes no longer leak into the Slate node.
- `propsToAttributes` symmetrically filters out `null` / `undefined` values so serialize stays idempotent with parse.
- Locked in by a regression test in `parseAttributes.spec.ts`.
