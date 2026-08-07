/** @jsx jsxt */

import { jsxt } from '@platejs/test-utils';

import { createTestEditor } from './__tests__/createTestEditor';
import { deserializeMd } from './deserializer';
import { serializeMd } from './serializer';

jsxt;

const editor = createTestEditor();

describe('roundTrip', () => {
  it('round trip basic marks', () => {
    const input = (
      <fragment>
        <htoc>
          <htext />
        </htoc>
        <hp>
          Make text <htext bold>bold</htext>, <htext italic>italic</htext>,{' '}
          <htext underline>underlined</htext>, or apply a{' '}
          <htext bold highlight italic underline>
            combination
          </htext>{' '}
          of these styles for a visually striking effect.
          <htext strikethrough>del</htext>
        </hp>
      </fragment>
    );

    const md = serializeMd(editor, { value: input });
    const slate = deserializeMd(editor, md);
    expect(slate).toEqual(input);
  });

  it('serialize callout correctly', () => {
    const input = (
      <fragment>
        <hcallout>
          <hp>
            <htext>Callout</htext>
          </hp>
        </hcallout>
      </fragment>
    );

    const md = serializeMd(editor, { value: input });
    expect(md).toMatchSnapshot();
  });

  it('serialize callout with icon attribute', () => {
    const input = (
      <fragment>
        <hcallout icon="⚠️">
          <hp>
            <htext>Callout</htext>
          </hp>
        </hcallout>
      </fragment>
    );

    const md = serializeMd(editor, { value: input });
    const slate = deserializeMd(editor, md);
    expect(slate).toEqual(input);
  });

  it('round-trips GFM-style callout type as variant', () => {
    const input = (
      <fragment>
        <hcallout variant="tip">
          <hp>
            <htext>Helpful advice</htext>
          </hp>
        </hcallout>
      </fragment>
    );

    const md = serializeMd(editor, { value: input });
    expect(md).toContain('<callout type="tip">');
    expect(md).not.toContain('variant=');

    const slate = deserializeMd(editor, md);
    expect(slate).toEqual(input);
  });

  it('deserializes GFM callout type without clobbering element type', () => {
    const slate = deserializeMd(
      editor,
      '<callout type="WARNING">\n\nWatch out\n\n</callout>\n'
    );

    expect(slate).toEqual([
      {
        children: [{ children: [{ text: 'Watch out' }], type: 'p' }],
        type: 'callout',
        variant: 'warning',
      },
    ]);
  });

  it('deserializes legacy variant attribute', () => {
    const slate = deserializeMd(
      editor,
      '<callout variant="note">\n\nNote body\n\n</callout>\n'
    );

    expect(slate).toEqual([
      {
        children: [{ children: [{ text: 'Note body' }], type: 'p' }],
        type: 'callout',
        variant: 'note',
      },
    ]);
  });
});
