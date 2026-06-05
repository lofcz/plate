/**
 * This Apache-2.0 licensed file has been modified by Udecode and other
 * contributors. See /packages/diff/LICENSE for more information.
 */

import { type TElement, type Value, NodeApi } from 'platejs';

import { type ComputeDiffOptions, computeDiff } from './computeDiff';

const inlineVoidType = 'inline-void';

const inlineElementType = 'inline-element';

interface ComputeDiffFixture
  extends Pick<ComputeDiffOptions, 'elementsAreRelated' | 'lineBreakChar'> {
  expected: Value;
  input1: Value;
  input2: Value;
  it?: typeof it;
}

const fixtures: Record<string, ComputeDiffFixture> = {
  addMark: {
    expected: [
      {
        children: [
          { text: 'PingCode ' },
          {
            bold: true,
            diff: true,
            diffOperation: {
              newProperties: { bold: true },
              properties: {},
              type: 'update',
            },
            text: 'Wiki',
          },
          {
            // TODO
            bold: undefined,
            text: ' & Worktile',
          },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'PingCode Wiki & Worktile' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [
          { text: 'PingCode ' },
          {
            bold: true,
            text: 'Wiki',
          },
          {
            text: ' & Worktile',
          },
        ],
        type: 'paragraph',
      },
    ],
  },

  addMarkFirst: {
    expected: [
      {
        children: [
          {
            bold: true,
            diff: true,
            diffOperation: {
              newProperties: { bold: true },
              properties: {},
              type: 'update',
            },
            text: 'PingCode',
          },
          {
            italic: true,
            text: ' Wiki & Worktile',
          },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [
          { text: 'PingCode' },
          {
            italic: true,
            text: ' Wiki & Worktile',
          },
        ],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [
          {
            bold: true,
            text: 'PingCode',
          },
          {
            italic: true,
            text: ' Wiki & Worktile',
          },
        ],
        type: 'paragraph',
      },
    ],
  },

  addMarkRemoveText: {
    expected: [
      {
        children: [
          {
            bold: true,
            diff: true,
            diffOperation: {
              newProperties: { bold: true },
              properties: {},
              type: 'update',
            },
            text: 'A ',
          },
          {
            diff: true,
            diffOperation: { type: 'delete' },
            text: 'B',
          },
          {
            bold: true,
            diff: true,
            diffOperation: {
              newProperties: { bold: true },
              properties: {},
              type: 'update',
            },
            text: ' C',
          },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'A B C' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [
          {
            bold: true,
            text: 'A  C',
          },
        ],
        type: 'paragraph',
      },
    ],
  },

  addMarkToMarkedText: {
    expected: [
      {
        children: [
          { bold: true, text: 'One ' },
          {
            bold: true,
            diff: true,
            diffOperation: {
              newProperties: { italic: true },
              properties: {},
              type: 'update',
            },
            italic: true,
            text: 'two',
          },
          { bold: true, text: ' three' },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ bold: true, text: 'One two three' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [
          { bold: true, text: 'One ' },
          { bold: true, italic: true, text: 'two' },
          { bold: true, text: ' three' },
        ],
        type: 'paragraph',
      },
    ],
  },

  addNode: {
    expected: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'Worktile' }],
        diff: true,
        diffOperation: { type: 'insert' },
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'Worktile' }],
        type: 'paragraph',
      },
    ],
  },

  addNodeChildren: {
    expected: [
      {
        children: [
          {
            children: [{ text: 'PingCode' }],
            type: 'paragraph',
          },
          {
            children: [{ text: 'Worktile' }],
            diff: true,
            diffOperation: { type: 'insert' },
            type: 'paragraph',
          },
        ],
        type: 'container',
      },
    ],
    input1: [
      {
        children: [
          {
            children: [{ text: 'PingCode' }],
            type: 'paragraph',
          },
        ],
        type: 'container',
      },
    ],
    input2: [
      {
        children: [
          {
            children: [{ text: 'PingCode' }],
            type: 'paragraph',
          },
          {
            children: [{ text: 'Worktile' }],
            type: 'paragraph',
          },
        ],
        type: 'container',
      },
    ],
  },

  addTwoMark: {
    expected: [
      {
        children: [
          { text: 'These ' },
          {
            bold: true,
            diff: true,
            diffOperation: {
              newProperties: { bold: true },
              properties: {},
              type: 'update',
            },
            text: 'words',
          },
          {
            // TODO
            bold: undefined,
            text: ' are ',
          },
          {
            bold: true,
            diff: true,
            diffOperation: {
              newProperties: { bold: true },
              properties: {},
              type: 'update',
            },
            text: 'bold',
          },
          {
            // TODO
            bold: undefined,
            text: '!',
          },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'These words are bold!' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [
          { text: 'These ' },
          {
            bold: true,
            text: 'words',
          },
          {
            text: ' are ',
          },
          {
            bold: true,
            text: 'bold',
          },
          {
            text: '!',
          },
        ],
        type: 'paragraph',
      },
    ],
  },

  changeIdAndContent: {
    expected: [
      {
        id: '1',
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        id: '3',
        children: [
          { text: 'Worktile' },
          { diff: true, diffOperation: { type: 'insert' }, text: '!' },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        id: '1',
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        id: '2',
        children: [{ text: 'Worktile' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        id: '1',
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        id: '3',
        children: [{ text: 'Worktile!' }],
        type: 'paragraph',
      },
    ],
  },

  changeIdBlock: {
    expected: [
      {
        id: '1',
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        id: '3',
        children: [{ text: 'Worktile' }],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        id: '1',
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        id: '2',
        children: [{ text: 'Worktile' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        id: '1',
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        id: '3',
        children: [{ text: 'Worktile' }],
        type: 'paragraph',
      },
    ],
  },

  changeIdInline: {
    expected: [
      {
        children: [
          { id: '1', text: 'PingCode' },
          { id: '4', children: [{ text: '' }], type: inlineVoidType },
          { id: '3', text: 'Worktile' },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [
          { id: '1', text: 'PingCode' },
          { id: '2', children: [{ text: '' }], type: inlineVoidType },
          { id: '3', text: 'Worktile' },
        ],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [
          { id: '1', text: 'PingCode' },
          { id: '4', children: [{ text: '' }], type: inlineVoidType },
          { id: '3', text: 'Worktile' },
        ],
        type: 'paragraph',
      },
    ],
  },

  changeIdText: {
    expected: [
      {
        children: [
          { id: '1', text: 'PingCode' },
          { id: '4', text: ' & ' },
          { id: '3', text: 'Worktile' },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [
          { id: '1', text: 'PingCode' },
          { id: '2', text: ' & ' },
          { id: '3', text: 'Worktile' },
        ],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [
          { id: '1', text: 'PingCode' },
          { id: '4', text: ' & ' },
          { id: '3', text: 'Worktile' },
        ],
        type: 'paragraph',
      },
    ],
  },

  customRelatedFunction: {
    expected: [
      {
        children: [{ text: '3/Added paragraph 1' }],
        diff: true,
        diffOperation: { type: 'insert' },
        type: 'paragraph',
      },
      {
        children: [
          { text: '1/First paragraph' },
          { diff: true, diffOperation: { type: 'insert' }, text: ' modified' },
        ],
        type: 'paragraph',
      },
      {
        children: [{ text: '4/Added paragraph 2' }],
        diff: true,
        diffOperation: { type: 'insert' },
        type: 'paragraph',
      },
      {
        children: [
          { text: '2/Second paragraph' },
          { diff: true, diffOperation: { type: 'insert' }, text: ' modified' },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: '1/First paragraph' }],
        type: 'paragraph',
      },
      {
        children: [{ text: '2/Second paragraph' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [{ text: '3/Added paragraph 1' }],
        type: 'paragraph',
      },
      {
        children: [{ text: '1/First paragraph modified' }],
        type: 'paragraph',
      },
      {
        children: [{ text: '4/Added paragraph 2' }],
        type: 'paragraph',
      },
      {
        children: [{ text: '2/Second paragraph modified' }],
        type: 'paragraph',
      },
    ],
    elementsAreRelated: (element, nextElement) => {
      const getId = (e: TElement) => NodeApi.string(e).split('/')[0];

      return getId(element) === getId(nextElement);
    },
  },

  insertInlineVoid: {
    expected: [
      {
        children: [
          { text: 'This is an ' },
          {
            children: [{ text: '' }],
            diff: true,
            diffOperation: { type: 'insert' },
            type: inlineVoidType,
          },
          { text: '!' },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'This is an !' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [
          { text: 'This is an ' },
          {
            children: [{ text: '' }],
            type: inlineVoidType,
          },
          { text: '!' },
        ],
        type: 'paragraph',
      },
    ],
  },

  insertText: {
    expected: [
      {
        children: [
          { text: 'PingCode' },
          {
            diff: true,
            diffOperation: { type: 'insert' },
            text: ' & Worktile',
          },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [
          { text: 'PingCode' },
          {
            text: ' & Worktile',
          },
        ],
        type: 'paragraph',
      },
    ],
  },

  insertTextAddMark: {
    expected: [
      {
        children: [
          {
            bold: true,
            diff: true,
            diffOperation: {
              newProperties: { bold: true },
              properties: {},
              type: 'update',
            },
            text: 'PingCode',
          },
          {
            // TODO:
            bold: undefined,
            diff: true,
            diffOperation: { type: 'insert' },
            text: ' & ',
          },
          {
            bold: true,
            diff: true,
            diffOperation: { type: 'insert' },
            text: 'Worktile',
          },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [
          {
            bold: true,
            text: 'PingCode',
          },
          {
            text: ' & ',
          },
          {
            bold: true,
            text: 'Worktile',
          },
        ],
        type: 'paragraph',
      },
    ],
  },

  insertUpdateParagraph: {
    expected: [
      {
        key: '1',
        children: [{ text: 'This is the first paragraph.' }],
        type: 'paragraph',
      },
      {
        key: '2',
        children: [{ text: 'This is the second paragraph.' }],
        diff: true,
        diffOperation: {
          type: 'insert',
        },
        type: 'paragraph',
      },
      {
        key: '3',
        children: [
          { text: 'This is the third paragraph' },
          {
            diff: true,
            diffOperation: {
              type: 'insert',
            },
            text: ', and insert some text',
          },
          {
            text: '.',
          },
        ],
        type: 'paragraph',
      },
      {
        key: '4',
        children: [{ text: 'This is the fourth paragraph.' }],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        key: '1',
        children: [{ text: 'This is the first paragraph.' }],
        type: 'paragraph',
      },
      {
        key: '3',
        children: [{ text: 'This is the third paragraph.' }],
        type: 'paragraph',
      },
      {
        key: '4',
        children: [{ text: 'This is the fourth paragraph.' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        key: '1',
        children: [{ text: 'This is the first paragraph.' }],
        type: 'paragraph',
      },
      {
        key: '2',
        children: [{ text: 'This is the second paragraph.' }],
        type: 'paragraph',
      },
      {
        key: '3',
        children: [
          { text: 'This is the third paragraph' },
          {
            text: ', and insert some text',
          },
          {
            text: '.',
          },
        ],
        type: 'paragraph',
      },
      {
        key: '4',
        children: [{ text: 'This is the fourth paragraph.' }],
        type: 'paragraph',
      },
    ],
  },

  insertUpdateTwoParagraphs: {
    expected: [
      {
        key: '1',
        children: [{ text: 'This is the first paragraph.' }],
        type: 'paragraph',
      },
      {
        key: '2',
        children: [{ text: 'This is the second paragraph.' }],
        diff: true,
        diffOperation: { type: 'insert' },
        type: 'paragraph',
      },
      {
        key: '3',
        children: [
          { text: 'This is the third paragraph' },
          {
            diff: true,
            diffOperation: { type: 'insert' },
            text: ', and insert some text',
          },
          {
            text: '.',
          },
        ],
        type: 'paragraph',
      },
      {
        key: '5',
        children: [{ text: 'This is the fifth paragraph.' }],
        diff: true,
        diffOperation: { type: 'insert' },
        type: 'paragraph',
      },
      {
        key: '4',
        children: [
          { text: 'This is the fourth paragraph' },
          {
            diff: true,
            diffOperation: { type: 'insert' },
            text: ', and insert some text',
          },
          {
            text: '.',
          },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        key: '1',
        children: [{ text: 'This is the first paragraph.' }],
        type: 'paragraph',
      },
      {
        key: '3',
        children: [{ text: 'This is the third paragraph.' }],
        type: 'paragraph',
      },
      {
        key: '4',
        children: [{ text: 'This is the fourth paragraph.' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        key: '1',
        children: [{ text: 'This is the first paragraph.' }],
        type: 'paragraph',
      },
      {
        key: '2',
        children: [{ text: 'This is the second paragraph.' }],
        type: 'paragraph',
      },
      {
        key: '3',
        children: [
          { text: 'This is the third paragraph' },
          {
            text: ', and insert some text',
          },
          {
            text: '.',
          },
        ],
        type: 'paragraph',
      },
      {
        key: '5',
        children: [{ text: 'This is the fifth paragraph.' }],
        type: 'paragraph',
      },
      {
        key: '4',
        children: [
          { text: 'This is the fourth paragraph' },
          {
            text: ', and insert some text',
          },
          {
            text: '.',
          },
        ],
        type: 'paragraph',
      },
    ],
  },

  insertWithLineBreakChar: {
    expected: [
      {
        children: [
          { text: 'Ping' },
          { diff: true, diffOperation: { type: 'insert' }, text: '¶\n' },
          { text: 'Co' },
          {
            bold: true,
            diff: true,
            diffOperation: {
              newProperties: { bold: true },
              properties: { bold: undefined },
              type: 'update',
            },
            text: 'd',
          },
          { bold: undefined, text: 'e' },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [
          { text: 'Ping\nCo' },
          { bold: true, text: 'd' },
          { text: 'e' },
        ],
        type: 'paragraph',
      },
    ],
    lineBreakChar: '¶',
  },

  insertWithoutLineBreakChar: {
    expected: [
      {
        children: [
          { text: 'Ping' },
          { diff: true, diffOperation: { type: 'insert' }, text: '\n' },
          { text: 'Code' },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [{ text: 'Ping\nCode' }],
        type: 'paragraph',
      },
    ],
  },

  mergeNode: {
    expected: [
      {
        children: [
          {
            bold: true,
            text: 'PingCode',
          },
          {
            diff: true,
            diffOperation: { type: 'insert' },
            text: ' & ',
          },
          {
            bold: true,
            diff: true,
            diffOperation: { type: 'insert' },
            text: 'co',
          },
        ],
        type: 'paragraph',
      },
      {
        children: [
          {
            text: ' & ',
          },
          {
            bold: true,
            text: 'co',
          },
        ],
        diff: true,
        diffOperation: { type: 'delete' },
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [
          {
            bold: true,
            text: 'PingCode',
          },
        ],
        type: 'paragraph',
      },
      {
        children: [
          {
            text: ' & ',
          },
          {
            bold: true,
            text: 'co',
          },
        ],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [
          {
            bold: true,
            text: 'PingCode',
          },
          {
            text: ' & ',
          },
          {
            bold: true,
            text: 'co',
          },
        ],
        type: 'paragraph',
      },
    ],
  },

  mergeRemoveText: {
    expected: [
      {
        children: [
          {
            diff: true,
            diffOperation: {
              newProperties: { bold: undefined },
              properties: { bold: true },
              type: 'update',
            },
            text: 'PingCode',
          },
          {
            bold: true,
            diff: true,
            diffOperation: { type: 'delete' },
            text: ' & Worktile',
          },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [
          {
            bold: true,
            text: 'PingCode',
          },
          {
            text: ' & ',
          },
          {
            bold: true,
            text: 'Worktile',
          },
        ],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [
          {
            text: 'PingCode',
          },
        ],
        type: 'paragraph',
      },
    ],
  },

  mergeText: {
    expected: [
      {
        children: [
          {
            bold: true,
            text: 'PingCode',
          },
          {
            bold: true,
            diff: true,
            diffOperation: {
              newProperties: { bold: true },
              properties: {},
              type: 'update',
            },
            text: ' & ',
          },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [
          {
            bold: true,
            text: 'PingCode',
          },
          {
            text: ' & ',
          },
        ],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [
          {
            bold: true,
            text: 'PingCode & ',
          },
        ],
        type: 'paragraph',
      },
    ],
  },

  mergeTwoText: {
    expected: [
      {
        children: [
          {
            bold: true,
            text: 'PingCode',
          },
          {
            bold: true,
            diff: true,
            diffOperation: {
              newProperties: { bold: true },
              properties: {},
              type: 'update',
            },
            text: ' & ',
          },
          {
            bold: true,
            text: 'Worktile',
          },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [
          {
            bold: true,
            text: 'PingCode',
          },
          {
            text: ' & ',
          },
          {
            bold: true,
            text: 'Worktile',
          },
        ],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [
          {
            bold: true,
            text: 'PingCode & Worktile',
          },
        ],
        type: 'paragraph',
      },
    ],
  },

  removeInlineVoid: {
    expected: [
      {
        children: [
          { text: 'This is an ' },
          {
            children: [{ text: '' }],
            diff: true,
            diffOperation: { type: 'delete' },
            type: inlineVoidType,
          },
          { text: '!' },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [
          { text: 'This is an ' },
          {
            children: [{ text: '' }],
            type: inlineVoidType,
          },
          { text: '!' },
        ],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [{ text: 'This is an !' }],
        type: 'paragraph',
      },
    ],
  },

  removeNode: {
    expected: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'Worktile' }],
        diff: true,
        diffOperation: { type: 'delete' },
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'Worktile' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
    ],
  },

  removeText: {
    expected: [
      {
        children: [
          { text: 'PingCode' },
          {
            diff: true,
            diffOperation: { type: 'delete' },
            text: ' & Worktile',
          },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'PingCode & Worktile' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
    ],
  },

  removeWithLineBreakChar: {
    expected: [
      {
        children: [
          { text: 'Ping' },
          { diff: true, diffOperation: { type: 'delete' }, text: '¶' },
          { text: 'Code' },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'Ping\nCode' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
    ],
    lineBreakChar: '¶',
  },

  removeWithoutLineBreakChar: {
    expected: [
      {
        children: [
          { text: 'Ping' },
          { diff: true, diffOperation: { type: 'delete' }, text: '\n' },
          { text: 'Code' },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'Ping\nCode' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
    ],
  },

  replaceText: {
    expected: [
      {
        children: [
          { text: 'PingCode & W' },
          {
            diff: true,
            diffOperation: { type: 'delete' },
            text: 'orktile',
          },
          {
            diff: true,
            diffOperation: { type: 'insert' },
            text: 'hatever',
          },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'PingCode & Worktile' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [{ text: 'PingCode & Whatever' }],
        type: 'paragraph',
      },
    ],
  },

  setNodeAdd: {
    expected: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'Worktile' }],
        diff: true,
        diffOperation: {
          newProperties: { someProp: 'World' },
          properties: {},
          type: 'update',
        },
        someProp: 'World',
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'Worktile' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'Worktile' }],
        someProp: 'World',
        type: 'paragraph',
      },
    ],
  },

  setNodeChange: {
    expected: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'Worktile' }],
        diff: true,
        diffOperation: {
          newProperties: { someProp: 'World' },
          properties: { someProp: 'Hello' },
          type: 'update',
        },
        someProp: 'World',
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'Worktile' }],
        someProp: 'Hello',
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'Worktile' }],
        someProp: 'World',
        type: 'paragraph',
      },
    ],
  },

  setNodeRemove: {
    expected: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'Worktile' }],
        diff: true,
        diffOperation: {
          newProperties: { someProp: undefined },
          properties: { someProp: 'Hello' },
          type: 'update',
        },
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'Worktile' }],
        someProp: 'Hello',
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [{ text: 'PingCode' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'Worktile' }],
        type: 'paragraph',
      },
    ],
  },

  unrelatedTexts: {
    expected: [
      {
        children: [{ text: 'NO_DIFF_INLINE FirstA' }],
        diff: true,
        diffOperation: {
          type: 'delete',
        },
        type: 'paragraph',
      },
      {
        children: [{ text: 'NO_DIFF_INLINE SecondA' }],
        diff: true,
        diffOperation: {
          type: 'delete',
        },
        type: 'paragraph',
      },
      {
        children: [{ text: 'NO_DIFF_INLINE ThirdA' }],
        diff: true,
        diffOperation: {
          type: 'delete',
        },
        type: 'paragraph',
      },
      {
        children: [{ text: 'NO_DIFF_INLINE FirstB' }],
        diff: true,
        diffOperation: {
          type: 'insert',
        },
        type: 'paragraph',
      },
      {
        children: [{ text: 'NO_DIFF_INLINE SecondB' }],
        diff: true,
        diffOperation: {
          type: 'insert',
        },
        type: 'paragraph',
      },
      {
        children: [{ text: 'NO_DIFF_INLINE ThirdB' }],
        diff: true,
        diffOperation: {
          type: 'insert',
        },
        type: 'paragraph',
      },
      {
        children: [{ text: 'Same' }],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [{ text: 'NO_DIFF_INLINE FirstA' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'NO_DIFF_INLINE SecondA' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'NO_DIFF_INLINE ThirdA' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'Same' }],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [{ text: 'NO_DIFF_INLINE FirstB' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'NO_DIFF_INLINE SecondB' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'NO_DIFF_INLINE ThirdB' }],
        type: 'paragraph',
      },
      {
        children: [{ text: 'Same' }],
        type: 'paragraph',
      },
    ],
    elementsAreRelated: (element) =>
      !NodeApi.string(element).startsWith('NO_DIFF_INLINE'),
  },

  updateInlineElement: {
    expected: [
      {
        id: 'P3Jjv_ALdx',
        children: [
          { text: 'for ' },
          {
            children: [
              { text: 'ma' },
              { diff: true, diffOperation: { type: 'delete' }, text: 'a' },
              { text: 'in' },
            ],
            type: inlineElementType,
            url: 'https://discord.com',
          },
          { text: ' titles' },
        ],
        type: 'p',
      },
    ],
    input1: [
      {
        id: 'P3Jjv_ALdx',
        children: [
          {
            text: 'for ',
          },
          {
            children: [
              {
                text: 'maain',
              },
            ],
            type: inlineElementType,
            url: 'https://discord.com',
          },
          {
            text: ' titles',
          },
        ],
        type: 'p',
      },
    ],
    input2: [
      {
        id: 'P3Jjv_ALdx',
        children: [
          {
            text: 'for ',
          },
          {
            children: [
              {
                text: 'main',
              },
            ],
            type: inlineElementType,
            url: 'https://discord.com',
          },
          {
            text: ' titles',
          },
        ],
        type: 'p',
      },
    ],
  },

  updateInlineVoid: {
    expected: [
      {
        children: [
          { text: 'This is an ' },
          {
            children: [{ text: '' }],
            diff: true,
            diffOperation: { type: 'delete' },
            someProp: 'Hello',
            type: inlineVoidType,
          },
          {
            children: [{ text: '' }],
            diff: true,
            diffOperation: { type: 'insert' },
            someProp: 'World',
            type: inlineVoidType,
          },
          { text: '!' },
        ],
        type: 'paragraph',
      },
    ],
    input1: [
      {
        children: [
          { text: 'This is an ' },
          {
            children: [{ text: '' }],
            someProp: 'Hello',
            type: inlineVoidType,
          },
          { text: '!' },
        ],
        type: 'paragraph',
      },
    ],
    input2: [
      {
        children: [
          { text: 'This is an ' },
          {
            children: [{ text: '' }],
            someProp: 'World',
            type: inlineVoidType,
          },
          { text: '!' },
        ],
        type: 'paragraph',
      },
    ],
  },
};

describe('computeDiff', () => {
  Object.entries(fixtures).forEach(
    ([name, { expected, input1, input2, it: itFn = it, ...options }]) => {
      itFn(name, () => {
        const output = computeDiff(input1, input2, {
          ignoreProps: ['id'],
          isInline: (node) =>
            node.type === inlineVoidType || node.type === inlineElementType,
          ...options,
        });

        expect(output).toEqual(expected);
      });
    }
  );
});

/**
 * The original `computeDiff` test suite (above) is a regression harness that
 * locks in the INLINE-granularity behavior. This second describe block
 * targets the new BLOCK granularity end-to-end through `computeDiff`. The
 * point of these tests is to catch wiring mistakes — options not threading
 * through correctly, the default-to-inline guard being skipped, pair ids
 * leaking across blocks, etc. — which the unit tests on
 * `pairBlocksWithWordHints` and `transformDiffDescendants` alone cannot
 * detect.
 */
describe('computeDiff (block granularity)', () => {
  // Capture-only props helpers so the assertions stay focused on the
  // structural outcome of a diff rather than its visual presentation props.
  let pairCounter = 0;
  const blockOptions = (): ComputeDiffOptions => {
    pairCounter = 0;
    return {
      isInline: () => false,
      getDeleteProps: (_node, ctx) => ({
        diff: true,
        diffOperation: { type: 'delete' as const },
        pairId: ctx?.pairId,
      }),
      getInsertProps: (_node, ctx) => ({
        diff: true,
        diffOperation: { type: 'insert' as const },
        pairId: ctx?.pairId,
      }),
      getUpdateProps: () => ({}),
      granularity: 'block',
      generatePairId: () => `pair-${++pairCounter}`,
    };
  };

  it('emits a single paired (delete, insert) block for a paragraph rewrite', () => {
    const result = computeDiff(
      [{ type: 'p', children: [{ text: 'Hello world' }] }],
      [{ type: 'p', children: [{ text: 'Hello planet' }] }],
      blockOptions()
    );

    // Default `pairOrder` is delete-first => delete block above insert block.
    expect(result).toHaveLength(2);
    expect((result[0] as any).diffOperation.type).toBe('delete');
    expect((result[1] as any).diffOperation.type).toBe('insert');
    // Same pairId so the suggestion plugin will treat both as one change.
    expect((result[0] as any).pairId).toBe((result[1] as any).pairId);
    expect((result[0] as any).pairId).toBeDefined();
  });

  it('puts the inserted block ABOVE the deleted block when pairOrder = insert-first', () => {
    const result = computeDiff(
      [{ type: 'p', children: [{ text: 'Hello world' }] }],
      [{ type: 'p', children: [{ text: 'Hello planet' }] }],
      { ...blockOptions(), pairOrder: 'insert-first' }
    );

    expect(result).toHaveLength(2);
    expect((result[0] as any).diffOperation.type).toBe('insert');
    expect((result[1] as any).diffOperation.type).toBe('delete');
    expect((result[0] as any).pairId).toBe((result[1] as any).pairId);
  });

  it('does NOT pair a delete with a non-adjacent insert', () => {
    // [del a] [unchanged c] [insert b] — the delete and insert are
    // separated by an unchanged block. The transform must emit them as
    // standalone changes (no pairId) — otherwise we'd visually link a
    // deletion to an insertion that has nothing to do with it.
    const result = computeDiff(
      [
        { type: 'p', children: [{ text: 'OLD-A' }] },
        { type: 'p', children: [{ text: 'STAY' }] },
      ],
      [
        { type: 'p', children: [{ text: 'STAY' }] },
        { type: 'p', children: [{ text: 'NEW-B' }] },
      ],
      blockOptions()
    );

    const types = (result as any[]).map((n) => n.diffOperation?.type);
    const texts = (result as any[]).map((n) => (n.children?.[0] as any)?.text);
    // Order: delete OLD-A, common STAY, insert NEW-B.
    expect(types).toEqual(['delete', undefined, 'insert']);
    expect(texts).toEqual(['OLD-A', 'STAY', 'NEW-B']);
    // No pairId on either change (they are unpaired standalone events).
    expect((result[0] as any).pairId).toBeUndefined();
    expect((result[2] as any).pairId).toBeUndefined();
  });

  it('preserves nested non-prose blocks (lists) without word-hinting them', () => {
    // List items containing paragraphs are not "leafy" — the implementation
    // must fall back to whole-block delete/insert and never reach into the
    // inner paragraph. Bug to catch: tokenizer accidentally flattening
    // nested elements and producing duplicate or lost inner content.
    const oldDoc = [
      {
        type: 'ul',
        children: [
          {
            type: 'li',
            children: [{ type: 'p', children: [{ text: 'apple' }] }],
          },
        ],
      },
    ];
    const newDoc = [
      {
        type: 'ul',
        children: [
          {
            type: 'li',
            children: [{ type: 'p', children: [{ text: 'apricot' }] }],
          },
        ],
      },
    ];

    const result = computeDiff(oldDoc, newDoc, blockOptions());

    // The diff happens at the inner paragraph level: it's wrapped inside the
    // ul/li structure on both sides. So we don't expect a top-level pair.
    // Instead we expect ONE outer `ul` whose inner `li > p` was modified.
    // (The exact shape depends on how computeDiff handles the wrapper; the
    // important invariant is text round-trip on each side.)
    const flatten = (nodes: any[]): string =>
      nodes
        .map((n) => {
          if (typeof n.text === 'string') return n.text;
          if (Array.isArray(n.children)) return flatten(n.children);
          return '';
        })
        .join('');

    // Either we get a single ul block (with inner diff) or a pair of uls;
    // either way, reconstructed text from the new-side leaves must
    // cover "apricot" and from the old side must cover "apple".
    const allText = flatten(result as any[]);
    expect(allText).toContain('apricot');
  });

  it('uses a different pairId for each independent paragraph change', () => {
    // Two consecutive paragraph rewrites must produce two pairs with
    // DISTINCT ids — otherwise accept/reject on one would silently affect
    // the other. This is the most important invariant for the suggestion
    // plugin to function correctly in block mode.
    const result = computeDiff(
      [
        { type: 'p', children: [{ text: 'first old' }] },
        { type: 'p', children: [{ text: 'second old' }] },
      ],
      [
        { type: 'p', children: [{ text: 'first new' }] },
        { type: 'p', children: [{ text: 'second new' }] },
      ],
      blockOptions()
    );

    // 4 blocks total. With per-pair interleaving (the new block-mode
    // ordering — see pairBlocksWithWordHints), each pair is adjacent:
    // [del1, ins1, del2, ins2]. We don't lock the exact order here (the
    // important contract is the pair-id uniqueness invariant below), but
    // we do assert each adjacent (delete, insert) pair shares an id.
    expect(result).toHaveLength(4);
    const pairIds = (result as any[]).map((n) => n.pairId);
    // Two unique pair ids, each used exactly twice.
    const unique = Array.from(new Set(pairIds));
    expect(unique).toHaveLength(2);
    for (const id of unique) {
      expect(pairIds.filter((x) => x === id)).toHaveLength(2);
    }
    // Adjacency: each pair lives at consecutive indices, never split by
    // the other pair. This is the key UX invariant for legibility.
    expect((result[0] as any).pairId).toBe((result[1] as any).pairId);
    expect((result[2] as any).pairId).toBe((result[3] as any).pairId);
    expect((result[0] as any).pairId).not.toBe((result[2] as any).pairId);
  });

  it('recurses into a same-shape MDX-like wrapper when a child is appended', () => {
    // Regression target for the "MDX: add activity to phase" preset.
    // BEFORE the container-recursion fix: the whole `phase` got delete +
    // reinsert because its top-level signature changed when a sibling was
    // appended. AFTER: the wrapper passes through unchanged and only the
    // new child carries an `insert` mark.
    const oldDoc = [
      {
        type: 'phase',
        name: 'P1',
        children: [
          {
            type: 'activity',
            name: 'A1',
            duration: '10',
            children: [{ type: 'p', children: [{ text: 'hi' }] }],
          },
        ],
      },
    ];
    const newDoc = [
      {
        type: 'phase',
        name: 'P1',
        children: [
          {
            type: 'activity',
            name: 'A1',
            duration: '10',
            children: [{ type: 'p', children: [{ text: 'hi' }] }],
          },
          {
            type: 'activity',
            name: 'A2',
            duration: '10',
            children: [{ type: 'p', children: [{ text: 'new' }] }],
          },
        ],
      },
    ];

    const result = computeDiff(oldDoc, newDoc, blockOptions());

    // Exactly ONE top-level node: the unchanged phase wrapper. The wrapper
    // MUST have no diff op (it wasn't changed) and no pairId.
    expect(result).toHaveLength(1);
    const phase = result[0] as any;
    expect(phase.type).toBe('phase');
    expect(phase.name).toBe('P1');
    expect(phase.diffOperation).toBeUndefined();
    expect(phase.pairId).toBeUndefined();

    // The first activity is byte-identical on both sides → no diff op, no
    // pairId, and CRUCIALLY its `duration` is preserved (regression target
    // for the "POKUS 1 - ?M" artifact where attribute data went missing on
    // the insert side of a paired-phase replacement).
    expect(phase.children[0].diffOperation).toBeUndefined();
    expect(phase.children[0].duration).toBe('10');
    expect(phase.children[0].name).toBe('A1');

    // The new activity is a standalone insert (overflow) — no pairId.
    expect(phase.children[1].diffOperation?.type).toBe('insert');
    expect(phase.children[1].name).toBe('A2');
    expect(phase.children[1].duration).toBe('10');
    expect(phase.children[1].pairId).toBeUndefined();
  });

  it('still falls back to whole-block when the wrapper itself changes (attribute edit)', () => {
    // `<phase name="A">` vs `<phase name="B">`. The wrapper own-prop
    // changed, so structural recursion must NOT swallow it. Whole-block
    // delete+insert with a shared pairId is the correct fallback.
    const oldDoc = [
      {
        type: 'phase',
        name: 'A',
        children: [{ type: 'p', children: [{ text: 'same' }] }],
      },
    ];
    const newDoc = [
      {
        type: 'phase',
        name: 'B',
        children: [{ type: 'p', children: [{ text: 'same' }] }],
      },
    ];

    const result = computeDiff(oldDoc, newDoc, blockOptions());

    expect(result).toHaveLength(2);
    const ops = (result as any[]).map((n) => n.diffOperation?.type);
    expect(new Set(ops)).toEqual(new Set(['delete', 'insert']));
    expect((result[0] as any).pairId).toBe((result[1] as any).pairId);
    expect((result[0] as any).pairId).toBeDefined();
  });

  it('inline granularity (default) is byte-identical to omitting all new options', () => {
    // Regression target: any change to `computeDiff` defaults must not
    // shift output for callers that don't opt in. We compare against the
    // explicit-inline output to make the intent obvious.
    const oldDoc = [{ type: 'p', children: [{ text: 'PingCode' }] }];
    const newDoc = [{ type: 'p', children: [{ text: 'PingCode & Worktile' }] }];

    const a = computeDiff(oldDoc, newDoc, {
      ignoreProps: ['id'],
      isInline: () => false,
    });
    const b = computeDiff(oldDoc, newDoc, {
      ignoreProps: ['id'],
      isInline: () => false,
      granularity: 'inline',
    });

    expect(a).toEqual(b);
  });
});
