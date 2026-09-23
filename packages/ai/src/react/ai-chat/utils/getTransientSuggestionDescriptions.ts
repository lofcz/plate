import type { PlateEditor } from 'platejs/react';

import {
  type TResolvedSuggestion,
  getSuggestionKey,
} from '@platejs/suggestion';
import { SuggestionPlugin } from '@platejs/suggestion/react';

/**
 * One description per transient suggestion id. A suggestion spans many
 * leaves; resolving each leaf separately repeats whole-document passes.
 */
export const getTransientSuggestionDescriptions = (
  editor: PlateEditor
): TResolvedSuggestion[] => {
  const api = editor.getApi(SuggestionPlugin).suggestion;
  const descriptions = new Map<string, TResolvedSuggestion>();

  for (const [node] of api.nodes({ transient: true }) as [any, any][]) {
    const data = api.suggestionData(node);

    if (!data || descriptions.has(data.id)) continue;

    descriptions.set(data.id, {
      createdAt: new Date(data.createdAt),
      keyId: getSuggestionKey(data.id),
      suggestionId: data.id,
      type: data.type,
      userId: data.userId,
    });
  }

  return [...descriptions.values()];
};
