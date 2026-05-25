// Parse mdast-util-mdx-jsx attributes into a Slate props record.
//
// remark-mdx encodes the three attribute forms as:
//
//   1. `<tag attr>`            → { name: 'attr', value: null }
//   2. `<tag attr="hello">`    → { name: 'attr', value: 'hello' }
//   3. `<tag attr={expr}>`     → { name: 'attr', value: {
//                                    type: 'mdxJsxAttributeValueExpression',
//                                    value: '<expr>'
//                                 } }
//
// Form 1 is the MDX / JSX shorthand for "the attribute is present"
// (semantically `attr = true`, exactly like HTML's `<input checked>` or
// `<details open>`). Previously this was passed through verbatim as
// `props.attr = null`, which then went back out as `<tag attr="null">`
// on the next serialize and came back as `props.attr = "null"` (a
// string) — a self-amplifying junk-attribute leak. Diff engines that
// compare Slate trees by structural equality could not align otherwise-
// identical subtrees because one side carried the junk attribute and
// the other did not.
//
// We now treat null as the boolean-true sentinel it actually is in MDX,
// preserving real boolean attributes (`checked`, `disabled`, custom
// `<my_tag flag>`...) end-to-end. Undefined `value` (synthetic or
// malformed attribute with no value field at all) is still dropped
// defensively.
export function parseAttributes(attributes: any[]): Record<string, any> {
  const props: Record<string, any> = {};

  if (!attributes || attributes.length === 0) return props;

  for (const attr of attributes as any[]) {
    if (!attr?.name) continue;

    const raw = attr.value;

    // Synthetic / malformed attribute with no value field — skip.
    if (raw === undefined) continue;

    // MDX shorthand `<tag attr>` → attr is present, so it's true.
    if (raw === null) {
      props[attr.name] = true;
      continue;
    }

    // Expression form (`<tag attr={...}>`) is opaque to us; pass through.
    if (typeof raw === 'object') {
      props[attr.name] = raw;
      continue;
    }

    // String form. Try JSON for typed values (numbers, booleans,
    // objects, arrays) and fall back to the raw string.
    if (typeof raw === 'string') {
      try {
        props[attr.name] = JSON.parse(raw);
      } catch {
        props[attr.name] = raw;
      }
      continue;
    }

    props[attr.name] = raw;
  }

  return props;
}

// Convert a Slate props record back into mdast-util-mdx-jsx attributes.
//
// Mirrors `parseAttributes` so the serialize → parse round trip is
// lossless for the cases that matter:
//
//   - `true`               → `{ value: null }`  (`<tag attr>` shorthand,
//                                                round-trips back to `true`)
//   - `string`             → `{ value: string }`
//   - mdxAttributeValueExpression → pass through verbatim
//   - everything else (numbers, booleans-other-than-true, plain objects,
//     arrays, ...) → JSON-encoded string
//
// `undefined` and `null` props are dropped: they don't correspond to
// any meaningful Slate state, and emitting them as `<tag attr>` would
// be re-parsed as `attr = true`, changing the node's shape over a
// trivial round trip.
export function propsToAttributes(props: Record<string, any>): any[] {
  const out: any[] = [];

  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;

    // Preserve `<tag attr>` shorthand for boolean-true props so output
    // markdown stays compact and idempotent with the parser.
    if (value === true) {
      out.push({ name, type: 'mdxJsxAttribute', value: null });
      continue;
    }

    out.push({
      name,
      type: 'mdxJsxAttribute',
      value:
        typeof value === 'string' ||
        value?.type === 'mdxJsxAttributeValueExpression'
          ? value
          : JSON.stringify(value),
    });
  }

  return out;
}
