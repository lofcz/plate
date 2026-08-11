import type { Descendant, SlateEditor } from 'platejs';

import { ElementApi, KEYS, nanoid } from 'platejs';

import { BaseSuggestionPlugin } from '../BaseSuggestionPlugin';
import { getSuggestionKey, getTransientSuggestionKey } from '../utils/index';

export const getSuggestionProps = (
  editor: SlateEditor,
  node: Descendant,
  {
    id = nanoid(),
    createdAt = Date.now(),
    suggestionDeletion,
    suggestionUpdate,
    suggestionUpdateProperties,
    transient,
  }: {
    id?: string;
    createdAt?: number;
    suggestionDeletion?: boolean;
    suggestionUpdate?: any;
    suggestionUpdateProperties?: any;
    transient?: boolean;
  } = {}
) => {
  const type = suggestionDeletion
    ? 'remove'
    : suggestionUpdate
      ? 'update'
      : 'insert';

  const isElement = ElementApi.isElement(node);

  const suggestionData = {
    id,
    createdAt,
    type,
    userId: editor.getOptions(BaseSuggestionPlugin).currentUserId!,
  };

  if (isElement) {
    // Block-element update (e.g. an MDX container whose updatable props
    // changed): carry both sides of the diff so accept keeps the new values
    // and reject can restore the old ones. Mirrors the inline
    // `properties`/`newProperties` convention used by `addMarkSuggestion`.
    if (suggestionUpdate !== undefined) {
      return {
        [KEYS.suggestion]: {
          ...suggestionData,
          newProperties: suggestionUpdate,
          properties: suggestionUpdateProperties,
        },
      };
    }
    return {
      [KEYS.suggestion]: suggestionData,
    };
  }

  const res = {
    [getSuggestionKey(id)]: suggestionData,
    [KEYS.suggestion]: true,
  };

  if (transient) {
    res[getTransientSuggestionKey()] = true;
  }

  return res;
};
