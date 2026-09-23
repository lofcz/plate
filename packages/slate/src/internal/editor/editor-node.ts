import { node as nodeBase } from 'slate';
import {
  type DescendantOf,
  type EditorNodeOptions,
  type EditorNodesOptions,
  LocationApi,
  NodeApi,
  PathApi,
  type ValueOf,
} from '../../interfaces';
import type { Editor } from '../../interfaces/editor/editor-type';
import type { NodeEntry } from '../../interfaces/node-entry';
import type { AtOrDescendant } from '../../types';
import { getAt } from '../../utils';

export const node = <N extends DescendantOf<E>, E extends Editor = Editor>(
  editor: E,
  atOrOptions: AtOrDescendant | EditorNodesOptions<ValueOf<E>>,
  nodeOptions?: EditorNodeOptions
): NodeEntry<N> | undefined => {
  try {
    if (LocationApi.isAt(atOrOptions)) {
      const at = getAt(editor, atOrOptions)!;

      // Slate throws on a missing path with the whole document serialized into
      // the message; probing absent siblings is common enough to make that hot.
      if (PathApi.isPath(at) && !NodeApi.has(editor, at)) return;

      return nodeBase(editor as any, at, nodeOptions) as any;
    }

    const options = atOrOptions;

    const nodeEntries = editor.api.nodes<N>(options);

    return nodeEntries.next().value as any;
  } catch {
    return;
  }
};
