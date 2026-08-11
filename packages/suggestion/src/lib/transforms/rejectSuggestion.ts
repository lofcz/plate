import {
  type SlateEditor,
  type TSuggestionElement,
  type TSuggestionText,
  type TText,
  ElementApi,
  KEYS,
  PathApi,
  TextApi,
} from 'platejs';

import type { TResolvedSuggestion } from '../types';

import { BaseSuggestionPlugin } from '../BaseSuggestionPlugin';
import {
  getInlineSuggestionData,
  getSuggestionKey,
  getTransientSuggestionKey,
} from '../utils';

export const rejectSuggestion = (
  editor: SlateEditor,
  description: TResolvedSuggestion
) => {
  editor.tf.withoutNormalizing(() => {
    const inlineInsertElementEntries = [
      ...editor.api.nodes({
        at: [],
        match: (n) => {
          if (!ElementApi.isElement(n) || !editor.api.isInline(n)) return false;

          const suggestionData = getInlineSuggestionData(n);

          return (
            suggestionData?.type === 'insert' &&
            suggestionData.id === description.suggestionId
          );
        },
      }),
    ];
    const mergeNodes = [
      ...editor.api.nodes({
        at: [],
        match: (n) => {
          if (!ElementApi.isElement(n)) return false;

          if (
            editor.getApi(BaseSuggestionPlugin).suggestion.isBlockSuggestion(n)
          ) {
            const suggestionElement = n as TSuggestionElement;
            return (
              suggestionElement.suggestion.type === 'insert' &&
              suggestionElement.suggestion.isLineBreak &&
              suggestionElement.suggestion.id === description.suggestionId
            );
          }

          return false;
        },
      }),
    ];

    mergeNodes.reverse().forEach(([, path]) => {
      editor.tf.mergeNodes({ at: PathApi.next(path) });
    });

    editor.tf.unsetNodes(
      [description.keyId, KEYS.suggestion, getTransientSuggestionKey()],
      {
        at: [],
        mode: 'all',
        match: (n) => {
          if (
            TextApi.isText(n) ||
            (ElementApi.isElement(n) && editor.api.isInline(n))
          ) {
            const node = n as TSuggestionText;
            const suggestionData = getInlineSuggestionData(node);

            if (suggestionData)
              return (
                suggestionData.type === 'remove' &&
                suggestionData.id === description.suggestionId
              );

            return false;
          }
          if (
            ElementApi.isElement(n) &&
            editor.getApi(BaseSuggestionPlugin).suggestion.isBlockSuggestion(n)
          ) {
            const suggestionElement = n as TSuggestionElement;
            const isLineBreak = suggestionElement.suggestion.isLineBreak;

            if (isLineBreak)
              return (
                suggestionElement.suggestion.id === description.suggestionId
              );

            return (
              suggestionElement.suggestion.type === 'remove' &&
              suggestionElement.suggestion.id === description.suggestionId
            );
          }

          return false;
        },
      }
    );

    editor.tf.removeNodes({
      at: [],
      mode: 'all',
      match: (n) => {
        if (TextApi.isText(n)) {
          const node = n as TSuggestionText;

          const suggestionData = getInlineSuggestionData(node);

          if (suggestionData)
            return (
              suggestionData.type === 'insert' &&
              suggestionData.id === description.suggestionId
            );

          return false;
        }

        if (
          ElementApi.isElement(n) &&
          editor.getApi(BaseSuggestionPlugin).suggestion.isBlockSuggestion(n)
        ) {
          const suggestionElement = n as TSuggestionElement;
          return (
            suggestionElement.suggestion.type === 'insert' &&
            suggestionElement.suggestion.id === description.suggestionId &&
            !suggestionElement.suggestion.isLineBreak
          );
        }

        return false;
      },
    });

    inlineInsertElementEntries.reverse().forEach(([, path]) => {
      editor.tf.removeNodes({ at: path });
    });

    const updateNodes = [
      ...editor.api.nodes<TText>({
        at: [],
        match: (n) => {
          if (ElementApi.isElement(n)) return false;
          if (TextApi.isText(n)) {
            const datalist = editor
              .getApi(BaseSuggestionPlugin)
              .suggestion.dataList(n as TSuggestionText);

            if (datalist.length > 0)
              return datalist.some(
                (data) =>
                  data.type === 'update' && data.id === description.suggestionId
              );

            return false;
          }
        },
      }),
    ];

    updateNodes.forEach(([node, path]) => {
      const datalist = editor
        .getApi(BaseSuggestionPlugin)
        .suggestion.dataList(node as TSuggestionText);
      const targetData = datalist.find(
        (data) => data.type === 'update' && data.id === description.suggestionId
      );

      if (!targetData) return;
      if ('newProperties' in targetData) {
        const unsetProps = Object.keys(targetData.newProperties).filter(
          (key) => targetData.newProperties[key]
        );

        editor.tf.unsetNodes([...unsetProps], {
          at: path,
        });
      }
      if ('properties' in targetData) {
        const addProps = Object.keys(targetData.properties).filter(
          (key) => !targetData.properties[key]
        );

        editor.tf.setNodes(
          Object.fromEntries(addProps.map((key) => [key, true])),
          {
            at: path,
          }
        );
      }

      // remove targetData
      editor.tf.unsetNodes([getSuggestionKey(targetData.id)], {
        at: path,
      });
    });

    // Block-element UPDATE suggestions (e.g. an MDX `<activity>` whose
    // `name`/`duration` changed): the element carries the NEW prop values
    // inline. Rejecting restores the OLD values (`properties`) and clears
    // the suggestion flag. The block-suggestion match above only handles
    // insert/remove (it returns false for `type === 'update'`), so the
    // update case is handled explicitly here.
    const updateBlockNodes = [
      ...editor.api.nodes({
        at: [],
        match: (n) => {
          if (!ElementApi.isElement(n)) return false;
          if (editor.api.isInline(n)) return false;
          if (
            !editor.getApi(BaseSuggestionPlugin).suggestion.isBlockSuggestion(n)
          )
            return false;
          const data = (n as TSuggestionElement).suggestion;
          return data.type === 'update' && data.id === description.suggestionId;
        },
      }),
    ];
    updateBlockNodes.forEach(([node, path]) => {
      const data = (node as TSuggestionElement).suggestion as unknown as {
        newProperties?: Record<string, unknown>;
        properties?: Record<string, unknown>;
      };

      // Restore the OLD values. Props that were newly added (absent in the
      // old `properties`) must be unset; props that existed get their old
      // value back.
      const unsetProps: string[] = [];
      const restoreProps: Record<string, unknown> = {};
      if (data.newProperties) {
        for (const key of Object.keys(data.newProperties)) {
          if (data.properties && key in data.properties) {
            restoreProps[key] = data.properties[key];
          } else {
            unsetProps.push(key);
          }
        }
      }
      if (Object.keys(restoreProps).length > 0) {
        editor.tf.setNodes(restoreProps, { at: path });
      }
      if (unsetProps.length > 0) {
        editor.tf.unsetNodes(unsetProps, { at: path });
      }
      editor.tf.unsetNodes([KEYS.suggestion, getTransientSuggestionKey()], {
        at: path,
      });
    });
  });
};
