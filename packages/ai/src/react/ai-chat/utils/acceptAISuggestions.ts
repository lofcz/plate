import type { PlateEditor } from 'platejs/react';

import {
  acceptSuggestion,
  getTransientSuggestionKey,
} from '@platejs/suggestion';

import { getTransientSuggestionDescriptions } from './getTransientSuggestionDescriptions';

export const acceptAISuggestions = (editor: PlateEditor) => {
  editor.tf.withoutNormalizing(() => {
    for (const description of getTransientSuggestionDescriptions(editor))
      acceptSuggestion(editor, description);

    editor.tf.unsetNodes([getTransientSuggestionKey()], {
      at: [],
      mode: 'all',
      voids: true,
      match: (n) => !!n[getTransientSuggestionKey()],
    });
  });
};
