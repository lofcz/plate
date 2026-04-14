import { describe, expect, it } from 'bun:test';

import {
  BaseTableCellPlugin,
  BaseTablePlugin,
  BaseTableRowPlugin,
} from '@platejs/table';
import {
  BaseBoldPlugin,
  BaseCodePlugin,
  BaseHighlightPlugin,
  BaseItalicPlugin,
  BaseKbdPlugin,
  BaseStrikethroughPlugin,
  BaseSubscriptPlugin,
  BaseSuperscriptPlugin,
  BaseUnderlinePlugin,
  BaseBlockquotePlugin,
  BaseH1Plugin,
  BaseH2Plugin,
  BaseH3Plugin,
  BaseHorizontalRulePlugin,
} from '@platejs/basic-nodes';
import {
  BaseCodeBlockPlugin,
  BaseCodeLinePlugin,
  BaseCodeSyntaxPlugin,
} from '@platejs/code-block';
import { BaseListPlugin } from '@platejs/list';
import { BaseLinkPlugin } from '@platejs/link';
import {
  BaseParagraphPlugin,
  KEYS,
  createSlateEditor,
  createSlatePlugin,
} from 'platejs';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { MarkdownPlugin } from '../../MarkdownPlugin';
import { remarkMdx, remarkMention } from '../../plugins';
import { createTestEditor } from '../../__tests__/createTestEditor';
import { convertNodesSerialize } from '../convertNodesSerialize';
import { propsToAttributes } from '../../rules/utils/parseAttributes';
import { deserializeMd } from '../../deserializer';
import {
  resolveSelectionByPath,
  type SelectionRange,
} from '../resolveSelectionLines';

const ActivityPlugin = createSlatePlugin({
  key: 'lesson_activity',
  node: { isElement: true },
});

const activityMdRules = {
  lesson_activity: {
    serialize: (node: any, options: any) => ({
      attributes: propsToAttributes({
        name: node.name,
        duration: node.duration,
      }),
      children: convertNodesSerialize(node.children, options) as any,
      name: 'activity',
      type: 'mdxJsxFlowElement',
    }),
  },
};

const makeEditor = (value: any[]) => {
  const editor = createTestEditor([
    BaseTablePlugin,
    BaseTableRowPlugin,
    BaseTableCellPlugin,
  ]);
  editor.children = value;
  return editor;
};

const makeEditorWithActivity = (value: any[]) => {
  const editor = createSlateEditor({
    plugins: [
      BaseParagraphPlugin,
      BaseH1Plugin,
      BaseH2Plugin,
      BaseH3Plugin,
      BaseBlockquotePlugin,
      BaseHorizontalRulePlugin,
      BaseCodeBlockPlugin,
      BaseCodeLinePlugin,
      BaseCodeSyntaxPlugin,
      BaseBoldPlugin,
      BaseItalicPlugin,
      BaseUnderlinePlugin,
      BaseCodePlugin,
      BaseStrikethroughPlugin,
      BaseSubscriptPlugin,
      BaseSuperscriptPlugin,
      BaseHighlightPlugin,
      BaseKbdPlugin,
      BaseListPlugin,
      BaseLinkPlugin,
      BaseTablePlugin,
      BaseTableRowPlugin,
      BaseTableCellPlugin,
      ActivityPlugin,
      MarkdownPlugin.configure({
        options: {
          plainMarks: [KEYS.suggestion, KEYS.comment],
          remarkPlugins: [remarkMath, remarkGfm, remarkMdx, remarkMention],
          rules: activityMdRules,
        },
      }),
    ],
  } as any);
  editor.children = value;
  return editor;
};

const fromMd = (md: string) => {
  const editor = createTestEditor([
    BaseTablePlugin,
    BaseTableRowPlugin,
    BaseTableCellPlugin,
  ]);
  editor.children = deserializeMd(editor, md) as any;
  return editor;
};

const sel = (
  anchorPath: number[],
  anchorOffset: number,
  focusPath: number[],
  focusOffset: number
): SelectionRange => ({
  anchor: { path: anchorPath, offset: anchorOffset },
  focus: { path: focusPath, offset: focusOffset },
});

describe('resolveSelectionByPath', () => {
  describe('paragraphs', () => {
    it('single paragraph', () => {
      const editor = makeEditor([
        { type: 'p', children: [{ text: 'Hello world' }] },
      ]);
      const result = resolveSelectionByPath(editor, sel([0, 0], 0, [0, 0], 11));

      expect(result.startLine).toBe(1);
      expect(result.endLine).toBe(1);
      expect(result.extractedMarkdown).toContain('Hello world');
    });

    it('second of three paragraphs', () => {
      const editor = makeEditor([
        { type: 'p', children: [{ text: 'First paragraph' }] },
        { type: 'p', children: [{ text: 'Second paragraph' }] },
        { type: 'p', children: [{ text: 'Third paragraph' }] },
      ]);
      const result = resolveSelectionByPath(editor, sel([1, 0], 0, [1, 0], 16));

      expect(result.startLine).toBe(3);
      expect(result.endLine).toBe(3);
      expect(result.extractedMarkdown).toContain('Second');
      expect(result.extractedMarkdown).not.toContain('First');
      expect(result.extractedMarkdown).not.toContain('Third');
    });
  });

  describe('headings', () => {
    it('heading resolves to correct line', () => {
      const editor = makeEditor([
        { type: 'h1', children: [{ text: 'Main Title' }] },
        { type: 'p', children: [{ text: 'Body text' }] },
      ]);
      const result = resolveSelectionByPath(editor, sel([0, 0], 0, [0, 0], 10));

      expect(result.startLine).toBe(1);
      expect(result.endLine).toBe(1);
      expect(result.extractedMarkdown).toContain('Main Title');
    });
  });

  describe('cross-block selection', () => {
    it('spanning two paragraphs', () => {
      const editor = makeEditor([
        { type: 'p', children: [{ text: 'Alpha bravo' }] },
        { type: 'p', children: [{ text: 'Charlie delta' }] },
        { type: 'p', children: [{ text: 'Echo foxtrot' }] },
      ]);
      const result = resolveSelectionByPath(editor, sel([0, 0], 0, [1, 0], 13));

      expect(result.startLine).toBeLessThanOrEqual(1);
      expect(result.endLine).toBeGreaterThanOrEqual(3);
      expect(result.extractedMarkdown).toContain('Alpha');
      expect(result.extractedMarkdown).toContain('Charlie');
    });

    it('spanning three paragraphs', () => {
      const editor = makeEditor([
        { type: 'p', children: [{ text: 'One' }] },
        { type: 'p', children: [{ text: 'Two' }] },
        { type: 'p', children: [{ text: 'Three' }] },
        { type: 'p', children: [{ text: 'Four' }] },
      ]);
      const result = resolveSelectionByPath(editor, sel([0, 0], 1, [2, 0], 3));

      expect(result.extractedMarkdown).toContain('One');
      expect(result.extractedMarkdown).toContain('Two');
      expect(result.extractedMarkdown).toContain('Three');
      expect(result.extractedMarkdown).not.toContain('Four');
    });
  });

  describe('lists', () => {
    it('specific list item (Plate indent-style)', () => {
      const editor = makeEditor([
        {
          type: 'p',
          listStyleType: 'disc',
          indent: 1,
          children: [{ text: 'Alpha' }],
        },
        {
          type: 'p',
          listStyleType: 'disc',
          indent: 1,
          children: [{ text: 'Beta' }],
        },
        {
          type: 'p',
          listStyleType: 'disc',
          indent: 1,
          children: [{ text: 'Gamma' }],
        },
      ] as any);
      const result = resolveSelectionByPath(editor, sel([1, 0], 0, [1, 0], 4));

      expect(result.extractedMarkdown).toContain('Beta');
    });
  });

  describe('lists inside MDX container', () => {
    it('each list item gets its own segment with correct lines', () => {
      const editor = makeEditorWithActivity([
        {
          type: 'lesson_activity',
          name: 'Test',
          duration: '5',
          children: [
            { type: 'p', children: [{ text: 'Intro text' }] },
            {
              type: 'p',
              listStyleType: 'decimal',
              indent: 1,
              children: [{ text: 'First item' }],
            } as any,
            {
              type: 'p',
              listStyleType: 'decimal',
              indent: 1,
              children: [{ text: 'Second item' }],
            } as any,
            {
              type: 'p',
              listStyleType: 'decimal',
              indent: 1,
              children: [{ text: 'Third item' }],
            } as any,
          ],
        },
      ]);

      // Select second list item
      const result = resolveSelectionByPath(
        editor,
        sel([0, 2, 0], 0, [0, 2, 0], 11)
      );

      expect(result.extractedMarkdown).toContain('Second item');
      expect(result.extractedMarkdown).not.toContain('First item');
      expect(result.extractedMarkdown).not.toContain('Third item');
    });

    it('selecting across list items gives correct range', () => {
      const editor = makeEditorWithActivity([
        {
          type: 'lesson_activity',
          name: 'Test',
          duration: '5',
          children: [
            { type: 'p', children: [{ text: 'Intro text' }] },
            {
              type: 'p',
              listStyleType: 'decimal',
              indent: 1,
              children: [{ text: 'Alpha' }],
            } as any,
            {
              type: 'p',
              listStyleType: 'decimal',
              indent: 1,
              children: [{ text: 'Beta' }],
            } as any,
            {
              type: 'p',
              listStyleType: 'decimal',
              indent: 1,
              children: [{ text: 'Gamma' }],
            } as any,
          ],
        },
      ]);

      // Select from Alpha to Gamma
      const result = resolveSelectionByPath(
        editor,
        sel([0, 1, 0], 0, [0, 3, 0], 5)
      );

      expect(result.extractedMarkdown).toContain('Alpha');
      expect(result.extractedMarkdown).toContain('Beta');
      expect(result.extractedMarkdown).toContain('Gamma');
    });
  });

  describe('empty paragraphs into MDX', () => {
    it('selection starting from empty lines into MDX resolves to correct range', () => {
      const editor = makeEditorWithActivity([
        { type: 'h1', children: [{ text: 'Title' }] },
        { type: 'p', children: [{ text: '' }] },
        { type: 'p', children: [{ text: '' }] },
        { type: 'p', children: [{ text: 'Some text' }] },
        { type: 'p', children: [{ text: '' }] },
        {
          type: 'lesson_activity',
          name: 'Test',
          duration: '5',
          children: [{ type: 'p', children: [{ text: 'Activity content' }] }],
        },
      ]);

      // Verify serialized markdown structure
      const { markdown } =
        require('../serializeMdWithSourceMap').serializeMdWithSourceMap(editor);
      const lines = markdown.split('\n');
      const textLine =
        lines.findIndex((l: string) => l.includes('Some text')) + 1;

      // Select from first empty paragraph [1,0] into the activity content [5,0,0]
      const result = resolveSelectionByPath(
        editor,
        sel([1, 0], 0, [5, 0, 0], 16)
      );

      // startLine must be BEFORE "Some text", not jumping to the activity
      expect(result.startLine).toBeLessThan(textLine);
      expect(result.extractedMarkdown).toContain('Some text');
      expect(result.extractedMarkdown).toContain('Activity content');
    });

    it('selection from single empty line into next paragraph works', () => {
      const editor = makeEditor([
        { type: 'p', children: [{ text: 'First' }] },
        { type: 'p', children: [{ text: '' }] },
        { type: 'p', children: [{ text: 'Third' }] },
      ]);

      // Select from the empty paragraph [1,0] to end of Third [2,0]
      const result = resolveSelectionByPath(editor, sel([1, 0], 0, [2, 0], 5));

      // The empty line should be included; startLine should be at or before the empty line
      expect(result.startLine).toBeLessThanOrEqual(3);
      expect(result.extractedMarkdown).toContain('Third');
    });

    it('multiple empty paragraphs before content resolve accurately', () => {
      const editor = makeEditor([
        { type: 'p', children: [{ text: '' }] },
        { type: 'p', children: [{ text: '' }] },
        { type: 'p', children: [{ text: '' }] },
        { type: 'p', children: [{ text: 'Content' }] },
      ]);

      // Select from second empty [1,0] to Content [3,0]
      const result = resolveSelectionByPath(editor, sel([1, 0], 0, [3, 0], 7));

      expect(result.extractedMarkdown).toContain('Content');
      // startLine should be at the second empty paragraph's line, not Content's line
      expect(result.startLine).toBeLessThan(result.endLine);
    });
  });

  describe('blockquotes (from markdown)', () => {
    it('blockquote content', () => {
      const editor = fromMd('> This is a quote\n\nNormal text');
      const result = resolveSelectionByPath(
        editor,
        sel([0, 0, 0], 0, [0, 0, 0], 17)
      );

      expect(result.extractedMarkdown).toContain('quote');
    });
  });

  describe('code blocks', () => {
    it('code block returns fenced range', () => {
      const editor = makeEditor([
        { type: 'p', children: [{ text: 'Some text' }] },
        {
          type: 'code_block',
          lang: 'js',
          children: [
            { type: 'code_line', children: [{ text: 'const x = 1;' }] },
          ],
        },
        { type: 'p', children: [{ text: 'After code' }] },
      ]);
      const result = resolveSelectionByPath(
        editor,
        sel([1, 0, 0], 0, [1, 0, 0], 12)
      );

      expect(result.extractedMarkdown).toContain('const x = 1');
      expect(result.extractedMarkdown).not.toContain('After code');
    });
  });

  describe('tables (from markdown)', () => {
    it('table cell', () => {
      const editor = fromMd('| A | B |\n| --- | --- |\n| cell1 | cell2 |');

      // Data row cell
      const result = resolveSelectionByPath(
        editor,
        sel([0, 1, 0, 0, 0], 0, [0, 1, 0, 0, 0], 5)
      );

      expect(result.extractedMarkdown).toContain('cell1');
    });
  });

  describe('containsMdx detection', () => {
    it('detects MDX in extracted markdown', () => {
      const editor = fromMd(
        '# Title\n\n<activity name="Warm Up">\n\nDo stretches\n\n</activity>\n\nAfter'
      );

      // Select the paragraph inside activity
      const result = resolveSelectionByPath(
        editor,
        sel([1, 0, 0], 0, [1, 0, 0], 12)
      );

      expect(result.containsMdx).toBe(true);
    });
  });

  describe('element-level path (container selection)', () => {
    it('selection at element path finds descendant segment', () => {
      const editor = makeEditor([
        { type: 'p', children: [{ text: 'Before' }] },
        {
          type: 'custom_block',
          children: [{ type: 'p', children: [{ text: 'Inside block' }] }],
        },
        { type: 'p', children: [{ text: 'After' }] },
      ]);

      // Selection at element level [1] offset 0 to [2,0] offset 5
      const result = resolveSelectionByPath(editor, sel([1], 0, [2, 0], 5));

      expect(result.extractedMarkdown).toContain('Inside block');
    });
  });

  describe('sub-line narrowing', () => {
    it('narrows start within a multi-line paragraph', () => {
      const editor = makeEditor([
        { type: 'p', children: [{ text: 'Line A\nLine B\nLine C' }] },
      ]);
      // Select from offset 7 (start of "Line B") to offset 20 (end)
      const result = resolveSelectionByPath(editor, sel([0, 0], 7, [0, 0], 20));

      // Should narrow start to the line containing "Line B"
      expect(result.startLine).toBeGreaterThanOrEqual(2);
    });
  });

  describe('no matching segment', () => {
    it('returns empty for non-existent path', () => {
      const editor = makeEditor([
        { type: 'p', children: [{ text: 'Only one' }] },
      ]);
      const result = resolveSelectionByPath(
        editor,
        sel([99, 0], 0, [99, 0], 5)
      );

      expect(result.extractedMarkdown).toBe('');
    });
  });

  describe('segments output', () => {
    it('returns source map segments', () => {
      const editor = makeEditor([
        { type: 'h1', children: [{ text: 'Title' }] },
        { type: 'p', children: [{ text: 'Paragraph one' }] },
        { type: 'p', children: [{ text: 'Paragraph two' }] },
      ]);
      const result = resolveSelectionByPath(editor, sel([0, 0], 0, [0, 0], 5));

      expect(result.segments.length).toBeGreaterThanOrEqual(3);
      expect(result.markdown).toBeTruthy();
    });
  });
});
