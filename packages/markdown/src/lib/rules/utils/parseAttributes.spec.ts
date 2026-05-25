import { parseAttributes, propsToAttributes } from './parseAttributes';

describe('parseAttributes', () => {
  it('parses JSON values and keeps raw strings when parsing fails', () => {
    const attributes = [
      { name: 'count', value: '3' },
      { name: 'enabled', value: 'true' },
      { name: 'config', value: '{"theme":"dark"}' },
      { name: 'label', value: 'plain-text' },
      { name: 'missingValue' },
      { value: 'ignored' },
    ];

    expect(parseAttributes(attributes as any)).toEqual({
      config: { theme: 'dark' },
      count: 3,
      enabled: true,
      label: 'plain-text',
    });
  });

  it('treats MDX boolean attributes (null value) as `true` per JSX semantics', () => {
    // remark-mdx parses `<tag attr>` as `{ name: 'attr', value: null }`.
    // JSX / HTML semantics for the shorthand are "the attribute is
    // present, value is true" — like `<input checked>` or `<details
    // open>`. parseAttributes must surface that as `props.attr = true`,
    // not drop it (which would silently nuke legitimate boolean attrs).
    const attributes = [
      { name: 'checked', value: null },
      { name: 'disabled', value: null },
      { name: 'realValue', value: '42' },
    ];

    expect(parseAttributes(attributes as any)).toEqual({
      checked: true,
      disabled: true,
      realValue: 42,
    });
  });

  it('skips attributes with truly undefined value (synthetic / malformed)', () => {
    // Distinct from `value: null` (MDX shorthand). `undefined` here
    // means the attribute object never carried a value field at all,
    // which is structurally invalid mdast — drop it defensively.
    const attributes = [{ name: 'noValue' }, { name: 'real', value: 'kept' }];

    expect(parseAttributes(attributes as any)).toEqual({
      real: 'kept',
    });
  });
});

describe('propsToAttributes', () => {
  it('serializes strings directly and JSON-encodes other values', () => {
    // `enabled: true` is intentionally not in this case — see the
    // dedicated test for boolean-true → `<tag attr>` shorthand below.
    expect(
      propsToAttributes({
        config: { theme: 'dark' },
        count: 3,
        label: 'plain-text',
      })
    ).toEqual([
      { name: 'config', type: 'mdxJsxAttribute', value: '{"theme":"dark"}' },
      { name: 'count', type: 'mdxJsxAttribute', value: '3' },
      { name: 'label', type: 'mdxJsxAttribute', value: 'plain-text' },
    ]);
  });

  it('preserves mdx attribute value expressions without stringifying them', () => {
    const expression = {
      data: { estree: { body: [], type: 'Program' } },
      type: 'mdxJsxAttributeValueExpression',
      value: '640',
    };

    expect(
      propsToAttributes({
        width: expression,
      })
    ).toEqual([{ name: 'width', type: 'mdxJsxAttribute', value: expression }]);
  });

  it('emits `value: null` for boolean-true props to preserve `<tag attr>` shorthand', () => {
    // Round-trips losslessly with parseAttributes: true → null → true.
    // Without this, `{ checked: true }` would go out as
    // `<tag checked="true">` (still semantically correct but verbose).
    expect(propsToAttributes({ checked: true, disabled: true })).toEqual([
      { name: 'checked', type: 'mdxJsxAttribute', value: null },
      { name: 'disabled', type: 'mdxJsxAttribute', value: null },
    ]);
  });

  it('JSON-encodes `false` so it round-trips as a boolean (not the string "false")', () => {
    // parseAttributes will JSON.parse("false") back to `false`. If we
    // instead emitted `value: null`, the next parse would resurrect it
    // as `true` — flipping the meaning across a single round trip.
    expect(propsToAttributes({ disabled: false })).toEqual([
      { name: 'disabled', type: 'mdxJsxAttribute', value: 'false' },
    ]);
  });

  it('drops props whose value is `undefined` or `null` (Slate-side junk)', () => {
    // These typically arise from buggy destructure aliases or stale
    // assignments inside Slate plugins. Emitting them as `<tag attr>`
    // would be re-parsed as `attr = true`, mutating the node's shape
    // on every serialize → parse cycle.
    expect(
      propsToAttributes({
        keep: 'yes',
        _ghost: undefined,
        nullish: null,
      })
    ).toEqual([{ name: 'keep', type: 'mdxJsxAttribute', value: 'yes' }]);
  });
});
