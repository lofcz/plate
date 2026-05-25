// Helper function to parse JSON attributes to props.
//
// MDX boolean attributes (`<tag attr>` with no `=value`) arrive here as
// `{ name: 'attr', value: null }`. Without filtering, they end up as
// `props.attr = null` on the Slate node, then on the next serialize pass
// `propsToAttributes` re-emits them as `<tag attr>` again — except
// because the value is now `null` it serializes as the string `"null"`,
// growing the markdown with junk on every round trip and making the
// node disagree with a freshly-deserialized version of itself. Diff
// engines that compare nodes via JSON-equality then fail to align
// otherwise-identical subtrees.
//
// We deliberately skip nullish values: a Slate node prop with explicit
// `null` is meaningless (rules either set a real value or omit the key),
// so dropping it on parse is safer than letting it propagate.
export function parseAttributes(attributes: any[]): Record<string, any> {
  const props: Record<string, any> = {};

  if (attributes && attributes.length > 0) {
    attributes.forEach((attr: any) => {
      if (!attr.name) return;
      if (attr.value === undefined || attr.value === null) return;

      let value = attr.value;

      try {
        value = JSON.parse(attr.value);
      } catch (_error) {
        value = attr.value;
      }

      props[attr.name] = value;
    });
  }

  return props;
}

// Helper function to convert props to attributes.
//
// Skips `undefined` / `null` values for the symmetric reason: writing
// them out as `<tag prop>` (boolean) or `<tag prop="null">` (string)
// would be re-parsed by `parseAttributes` as something other than the
// original `undefined` / `null`, breaking idempotency of the
// serialize → parse round trip.
export function propsToAttributes(props: Record<string, any>): any[] {
  return Object.entries(props)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([name, value]) => ({
      name,
      type: 'mdxJsxAttribute',
      value:
        typeof value === 'string' ||
        value?.type === 'mdxJsxAttributeValueExpression'
          ? value
          : JSON.stringify(value),
    }));
}
