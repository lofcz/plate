---
'@lofcz/platejs-markdown': patch
---

Fix `parseAttributes` / `propsToAttributes` mishandling of MDX boolean attributes and stop the self-amplifying junk-attribute leak across serialize → deserialize round-trips.

remark-mdx encodes `<tag attr>` (the JSX / HTML boolean-attribute shorthand) as `{ name: 'attr', value: null }`. The semantic of that form is `attr = true` — exactly like `<input checked>` or `<details open>`. The previous code passed `null` through verbatim as `props.attr = null`, which then went out on the next serialize as `<tag attr="null">` (because `JSON.stringify(null) === 'null'`) and came back as `props.attr = 'null'` (a string). The same key kept changing shape on every round trip, polluting nodes with stale attributes and breaking idempotency of `serialize → deserialize`.

This was especially harmful for diff engines that compare Slate trees by structural equality (or that hand nodes to DMP via `StringCharMapping`): two otherwise-identical subtrees with the same content would disagree on a junk attribute like `_id` and be emitted as a full delete + insert pair, defeating per-block container strategies that should have recursed into inner content changes.

- `parseAttributes` now correctly maps `value: null` → `true`, preserving real MDX boolean attributes (`checked`, `disabled`, custom `<my_tag flag>`...) end-to-end. `value: undefined` (synthetic / malformed attribute object with no value field at all) is still skipped defensively. Expression-form values (`mdxJsxAttributeValueExpression`) are passed through untouched.
- `propsToAttributes` is the symmetric inverse: `value: true` is emitted as `{ value: null }` to preserve the `<tag attr>` shorthand, `false` is JSON-encoded (so it round-trips as a boolean, not flipped to `true` on the next parse), and `undefined` / `null` props are dropped (they don't correspond to meaningful Slate state, and emitting them as `<tag attr>` would resurrect them as `true` on the next parse).
- Locked in by new regression tests in `parseAttributes.spec.ts` covering both the boolean-attr round trip and the junk-prop drop.
