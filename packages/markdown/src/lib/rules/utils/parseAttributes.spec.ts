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

  it('drops MDX boolean attributes (null value) so they do not pollute the props object', () => {
    // remark-mdx parses `<tag attr>` as `{ name: 'attr', value: null }`.
    // Previously this was added as `props.attr = null`, which then went
    // out on the next serialize as `<tag attr="null">` and back in as
    // `props.attr = 'null'` — a self-amplifying round-trip leak. Skip
    // them at parse time.
    const attributes = [
      { name: 'boolFlag', value: null },
      { name: 'realValue', value: '42' },
    ];

    expect(parseAttributes(attributes as any)).toEqual({
      realValue: 42,
    });
  });
});

describe('propsToAttributes', () => {
  it('serializes strings directly and JSON-encodes other values', () => {
    expect(
      propsToAttributes({
        config: { theme: 'dark' },
        count: 3,
        enabled: true,
        label: 'plain-text',
      })
    ).toEqual([
      { name: 'config', type: 'mdxJsxAttribute', value: '{"theme":"dark"}' },
      { name: 'count', type: 'mdxJsxAttribute', value: '3' },
      { name: 'enabled', type: 'mdxJsxAttribute', value: 'true' },
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
});
