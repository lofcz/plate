import { bindFirst, createSlatePlugin } from 'platejs';

import { SMILES_KEY } from './smilesKey';
import { insertSmiles } from './transforms';

export const BaseSmilesPlugin = createSlatePlugin({
  key: SMILES_KEY,
  node: { isElement: true, isVoid: true },
}).extendEditorTransforms(({ editor }) => ({
  insert: {
    smiles: bindFirst(insertSmiles, editor),
  },
}));
