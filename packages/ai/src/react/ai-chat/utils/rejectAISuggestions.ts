import type { PlateEditor } from 'platejs/react';

import {
  getTransientSuggestionKey,
  rejectSuggestion,
} from '@platejs/suggestion';

import { getTransientSuggestionDescriptions } from './getTransientSuggestionDescriptions';

export const rejectAISuggestions = (editor: PlateEditor) => {
  editor.tf.withoutNormalizing(() => {
    for (const description of getTransientSuggestionDescriptions(editor))
      rejectSuggestion(editor, description);

    editor.tf.unsetNodes([getTransientSuggestionKey()], {
      at: [],
      mode: 'all',
      voids: true,
      match: (n) => !!n[getTransientSuggestionKey()],
    });
  });
};
