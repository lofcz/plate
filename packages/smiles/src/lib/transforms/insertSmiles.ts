import type { InsertNodesOptions, SlateEditor, TElement } from 'platejs';

import { SMILES_KEY } from '../smilesKey';

export type TSmilesElement = TElement & {
  smiles: string;
};

export const insertSmiles = (
  editor: SlateEditor,
  smiles = '',
  options?: InsertNodesOptions
) => {
  editor.tf.insertNodes<TSmilesElement>(
    {
      children: [{ text: '' }],
      smiles,
      type: editor.getType(SMILES_KEY),
    },
    options as any
  );
};
