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

// Custom MDX rule that prepends a synthetic mdast paragraph in front of the
// Slate-derived children. Used only to surface zipper-drift bugs in
// attachDescendantSources: mdast has N+1 children, Slate has N.
const driftMdRules = {
  drift_block: {
    serialize: (node: any, options: any) => ({
      attributes: [],
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'INJECTED_HEADER' }],
        },
        ...(convertNodesSerialize(node.children, options) as any),
      ],
      name: 'drift',
      type: 'mdxJsxFlowElement',
    }),
  },
};

const DriftBlockPlugin = createSlatePlugin({
  key: 'drift_block',
  node: { isElement: true },
});

const makeEditor = (value: any[]) => {
  const editor = createTestEditor([
    BaseTablePlugin,
    BaseTableRowPlugin,
    BaseTableCellPlugin,
  ]);
  editor.children = value;
  return editor;
};

const makeEditorWithDrift = (value: any[]) => {
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
      DriftBlockPlugin,
      MarkdownPlugin.configure({
        options: {
          plainMarks: [KEYS.suggestion, KEYS.comment],
          remarkPlugins: [remarkMath, remarkGfm, remarkMdx, remarkMention],
          rules: driftMdRules,
        },
      }),
    ],
  } as any);
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

    // Regression: when an MDX container has multiple list groups whose
    // listStyleType alternates (decimal → disc → decimal → disc), mdast emits
    // SEPARATE `list` nodes. Earlier code consumed every consecutive
    // list-styled Slate paragraph into the FIRST mdast list's run, leaving
    // every subsequent mdast list starved. As a result those Slate
    // paragraphs got no source-map segment and selecting them silently
    // resolved to startLine=endLine=1 with an empty extracted markdown.
    it('resolves disc list items after a leading decimal list (alternating styles)', () => {
      const editor = makeEditorWithActivity([
        {
          type: 'lesson_activity',
          name: 'Vybarvování',
          duration: '15',
          children: [
            { type: 'p', children: [{ text: 'Intro paragraph' }] },
            {
              type: 'p',
              listStyleType: 'decimal',
              indent: 1,
              children: [{ text: 'First ordered' }],
            } as any,
            {
              type: 'p',
              listStyleType: 'disc',
              indent: 1,
              children: [{ text: 'First bullet' }],
            } as any,
            {
              type: 'p',
              listStyleType: 'disc',
              indent: 1,
              children: [{ text: 'Second bullet' }],
            } as any,
            {
              type: 'p',
              listStyleType: 'disc',
              indent: 1,
              children: [{ text: 'Third bullet' }],
            } as any,
            {
              type: 'p',
              listStyleType: 'decimal',
              listStart: 2,
              indent: 1,
              children: [{ text: 'Second ordered' }],
            } as any,
            {
              type: 'p',
              listStyleType: 'disc',
              indent: 1,
              children: [{ text: 'Tail bullet' }],
            } as any,
            { type: 'p', children: [{ text: 'Closing paragraph' }] },
          ],
        },
      ]);

      // Select the three middle disc items: paths [0,2,0] .. [0,4,0]
      const result = resolveSelectionByPath(
        editor,
        sel([0, 2, 0], 0, [0, 4, 0], 13)
      );

      // Must never silently resolve to line 1 with empty markdown
      expect(result.startLine).toBeGreaterThan(1);
      expect(result.extractedMarkdown).not.toBe('');

      expect(result.extractedMarkdown).toContain('First bullet');
      expect(result.extractedMarkdown).toContain('Second bullet');
      expect(result.extractedMarkdown).toContain('Third bullet');

      // The selection must NOT spill into siblings outside the disc run
      expect(result.extractedMarkdown).not.toContain('First ordered');
      expect(result.extractedMarkdown).not.toContain('Second ordered');
      expect(result.extractedMarkdown).not.toContain('Tail bullet');
      expect(result.extractedMarkdown).not.toContain('Intro paragraph');
      expect(result.extractedMarkdown).not.toContain('Closing paragraph');
    });

    // Regression: the buggy code attached a `sourceMap` only to the very
    // first Slate list paragraph. Every other list paragraph in the MDX
    // container ended up without a leaf segment, so `segments` was missing
    // their paths entirely. Verify each list paragraph has a dedicated
    // segment.
    it('every list paragraph in an MDX container gets a dedicated segment', () => {
      const editor = makeEditorWithActivity([
        {
          type: 'lesson_activity',
          name: 'Vybarvování',
          duration: '15',
          children: [
            { type: 'p', children: [{ text: 'Intro' }] },
            {
              type: 'p',
              listStyleType: 'decimal',
              indent: 1,
              children: [{ text: 'Ordered A' }],
            } as any,
            {
              type: 'p',
              listStyleType: 'disc',
              indent: 1,
              children: [{ text: 'Bullet A' }],
            } as any,
            {
              type: 'p',
              listStyleType: 'disc',
              indent: 1,
              children: [{ text: 'Bullet B' }],
            } as any,
            {
              type: 'p',
              listStyleType: 'decimal',
              listStart: 2,
              indent: 1,
              children: [{ text: 'Ordered B' }],
            } as any,
            { type: 'p', children: [{ text: 'Closing' }] },
          ],
        },
      ]);

      const result = resolveSelectionByPath(
        editor,
        sel([0, 0, 0], 0, [0, 0, 0], 5)
      );

      const childPathKeys = new Set(
        result.segments
          .filter((s) => s.path[0] === 0 && s.path.length === 2)
          .map((s) => s.path.join('.'))
      );

      // All 6 children of the activity must produce a leaf segment
      expect(childPathKeys.has('0.0')).toBe(true); // Intro
      expect(childPathKeys.has('0.1')).toBe(true); // Ordered A
      expect(childPathKeys.has('0.2')).toBe(true); // Bullet A
      expect(childPathKeys.has('0.3')).toBe(true); // Bullet B
      expect(childPathKeys.has('0.4')).toBe(true); // Ordered B
      expect(childPathKeys.has('0.5')).toBe(true); // Closing
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

    // #2: When a selection path cannot be resolved, the function must signal
    // failure explicitly via `resolved: false` so callers can refuse to create
    // quote references. Returning `{ startLine: 1, endLine: 1, extractedMarkdown: '' }`
    // alone is indistinguishable from a successful resolution at line 1 of a
    // 1-line document and was the root cause of the "(1)" chip bug.
    it('exposes resolved=false for unresolvable paths (issue #2)', () => {
      const editor = makeEditor([
        { type: 'p', children: [{ text: 'Only one' }] },
      ]);
      const result = resolveSelectionByPath(
        editor,
        sel([99, 0], 0, [99, 0], 5)
      );

      expect(result.resolved).toBe(false);
    });

    // #3: attachDescendantSources currently zips slateElements ↔ mdastElements
    // by position. A custom MDX serializer that injects extra mdast children
    // (synthetic headers, summary lines, etc.) shifts the zipper and assigns
    // each Slate child the source-map of a DIFFERENT mdast node. Selecting
    // child Slate[i] then resolves to lines belonging to child Slate[i-k].
    // #4: `slateNodeKind` has a catch-all that returns `'block'` for any
    // element with `children`. That catches inline elements (links, mentions,
    // dates) inside MDX containers — they should not get their own
    // block-level segment because they occupy zero lines on their own and
    // confuse the line-range math.
    it('does not emit a block segment for an inline link inside a paragraph (issue #4)', () => {
      const editor = makeEditor([
        {
          type: 'p',
          children: [
            { text: 'Visit ' },
            {
              type: 'a',
              url: 'https://example.com',
              children: [{ text: 'example' }],
            },
            { text: ' today' },
          ],
        } as any,
      ]);

      const {
        serializeMdWithSourceMap,
      } = require('../serializeMdWithSourceMap');
      const { allSegments } = serializeMdWithSourceMap(editor);

      // The link inside a paragraph must not become its own segment. Only
      // the paragraph segment should exist.
      const linkSegments = allSegments.filter(
        (s: any) => s.path.length === 2 && s.path[0] === 0
      );
      expect(linkSegments).toEqual([]);
    });

    // #5: `walkList` advances its slateIdx counter once per non-`list`
    // child of a listItem. That assumes mdast emits exactly one paragraph
    // per Slate list paragraph (which is true today). If a future
    // serializer ever produces multi-paragraph listItems, positional
    // matching would drift. Tagging list paragraphs with
    // `__sourceMapSlatePath` makes the matcher robust against that.
    it('list paragraphs match Slate items via __sourceMapSlatePath (issue #5)', () => {
      const editor = makeEditor([
        {
          type: 'p',
          listStyleType: 'disc',
          indent: 1,
          children: [{ text: 'Alpha' }],
        } as any,
        {
          type: 'p',
          listStyleType: 'disc',
          indent: 1,
          children: [{ text: 'Beta' }],
        } as any,
        {
          type: 'p',
          listStyleType: 'disc',
          indent: 1,
          children: [{ text: 'Gamma' }],
        } as any,
      ]);

      const {
        serializeMdWithSourceMap,
      } = require('../serializeMdWithSourceMap');
      const { segments } = serializeMdWithSourceMap(editor);

      // Every list paragraph must have its own segment with the matching
      // Slate path. If walkList drifts, paths and lines would misalign.
      const pathsWithLines = segments
        .filter((s: any) => s.path.length === 1)
        .map((s: any) => ({
          path: s.path.join('.'),
          text: s.text,
        }));

      expect(pathsWithLines).toEqual([
        { path: '0', text: 'Alpha' },
        { path: '1', text: 'Beta' },
        { path: '2', text: 'Gamma' },
      ]);
    });

    it('does not emit a block segment for an inline link inside an MDX container (issue #4)', () => {
      const editor = makeEditorWithActivity([
        {
          type: 'lesson_activity',
          name: 'Test',
          duration: '5',
          children: [
            {
              type: 'p',
              children: [
                { text: 'Visit ' },
                {
                  type: 'a',
                  url: 'https://example.com',
                  children: [{ text: 'example' }],
                } as any,
                { text: ' today' },
              ],
            },
          ],
        },
      ]);

      const {
        serializeMdWithSourceMap,
      } = require('../serializeMdWithSourceMap');
      const { allSegments } = serializeMdWithSourceMap(editor);

      // The link is at slate path [0,0,1] — must not be a segment.
      const linkSegments = allSegments.filter(
        (s: any) =>
          s.path.length === 3 &&
          s.path[0] === 0 &&
          s.path[1] === 0 &&
          s.path[2] === 1
      );
      expect(linkSegments).toEqual([]);
    });

    it('handles mdast children injected by custom MDX serializer (issue #3)', () => {
      const editor = makeEditorWithDrift([
        {
          type: 'drift_block',
          children: [
            { type: 'p', children: [{ text: 'Alpha' }] },
            { type: 'p', children: [{ text: 'Beta' }] },
            { type: 'p', children: [{ text: 'Gamma' }] },
          ],
        },
      ]);

      // Each Slate child must resolve to a range whose extracted markdown
      // contains the slate node's own text, not a neighbour's text.
      const a = resolveSelectionByPath(editor, sel([0, 0, 0], 0, [0, 0, 0], 5));
      const b = resolveSelectionByPath(editor, sel([0, 1, 0], 0, [0, 1, 0], 4));
      const c = resolveSelectionByPath(editor, sel([0, 2, 0], 0, [0, 2, 0], 5));

      expect(a.extractedMarkdown).toContain('Alpha');
      expect(a.extractedMarkdown).not.toContain('INJECTED_HEADER');

      expect(b.extractedMarkdown).toContain('Beta');
      expect(b.extractedMarkdown).not.toContain('Alpha');

      expect(c.extractedMarkdown).toContain('Gamma');
      expect(c.extractedMarkdown).not.toContain('Beta');
    });

    it('exposes resolved=true when at least one endpoint matches (issue #2)', () => {
      const editor = makeEditor([
        { type: 'p', children: [{ text: 'First' }] },
        { type: 'p', children: [{ text: 'Second' }] },
      ]);
      const result = resolveSelectionByPath(editor, sel([0, 0], 0, [0, 0], 5));

      expect(result.resolved).toBe(true);
      expect(result.startLine).toBe(1);
    });
  });

  // #1: Empty paragraphs (`{ type: 'p', children: [{ text: '' }] }`) serialize
  // to a blank line in markdown. If the wrapped handler skips them when
  // `emitted.trim()` is empty, selecting the empty paragraph alone leaves no
  // ancestor segment and the function defaults to startLine=endLine=1.
  describe('empty paragraph standalone selection (issue #1)', () => {
    it('resolves to its own line when selected alone', () => {
      const editor = makeEditor([
        { type: 'p', children: [{ text: 'First paragraph' }] },
        { type: 'p', children: [{ text: '' }] },
        { type: 'p', children: [{ text: 'Third paragraph' }] },
      ]);

      // Select only the empty paragraph at path [1, 0]
      const result = resolveSelectionByPath(editor, sel([1, 0], 0, [1, 0], 0));

      // Must NOT silently default to line 1 (where "First paragraph" lives)
      expect(result.startLine).toBeGreaterThan(1);
      expect(result.startLine).toBeLessThan(5);
      expect(result.endLine).toBe(result.startLine);
    });

    it('resolves consecutive empty paragraphs to their own range', () => {
      const editor = makeEditor([
        { type: 'p', children: [{ text: 'Top' }] },
        { type: 'p', children: [{ text: '' }] },
        { type: 'p', children: [{ text: '' }] },
        { type: 'p', children: [{ text: 'Bottom' }] },
      ]);

      // Select the middle two empties [1, 0] -> [2, 0]
      const result = resolveSelectionByPath(editor, sel([1, 0], 0, [2, 0], 0));

      // The range must not collapse to line 1 nor span the whole document
      expect(result.startLine).toBeGreaterThan(1);
      expect(result.endLine).toBeLessThan(7);
      expect(result.extractedMarkdown).not.toContain('Top');
      expect(result.extractedMarkdown).not.toContain('Bottom');
    });
  });

  // #6: `comparePoints` pads missing path components with 0 then falls
  // through to offset comparison. When one endpoint is element-level (path
  // points at the container, offset is a child index) and the other is
  // leaf-level (path goes deeper, offset is a character index), padding
  // can flip the order silently because incompatible offsets get compared.
  describe('comparePoints with mixed-length paths (issue #6)', () => {
    it('selection where anchor is element-level after focus is leaf-level resolves correctly', () => {
      const editor = makeEditor([
        { type: 'p', children: [{ text: 'Alpha' }] },
        { type: 'p', children: [{ text: 'Beta' }] },
        { type: 'p', children: [{ text: 'Gamma' }] },
      ]);

      // Anchor at element-level path [2] offset 1 (= boundary AFTER child 1
      // of root → i.e. between Alpha and Beta in the wider tree sense, but
      // here offset 1 inside a 3-child root means "before Beta").
      // Focus at leaf-level path [0, 0] offset 5 (= end of "Alpha").
      // Anchor is logically AFTER focus. The function must normalize and
      // return Alpha..Beta-ish range, not collapse to a single line.
      const result = resolveSelectionByPath(editor, sel([2], 1, [0, 0], 5));

      // The selection spans from Alpha (line 1) to at least Beta. Whichever
      // way we normalize, the extracted markdown must include both.
      expect(result.extractedMarkdown).toContain('Alpha');
      expect(result.extractedMarkdown).toContain('Beta');
      expect(result.startLine).toBeLessThan(result.endLine);
    });

    it('two element-level paths inside the same container resolve correctly', () => {
      const editor = makeEditor([
        {
          type: 'custom_block',
          children: [
            { type: 'p', children: [{ text: 'First' }] },
            { type: 'p', children: [{ text: 'Second' }] },
            { type: 'p', children: [{ text: 'Third' }] },
          ],
        } as any,
      ]);

      // anchor [0] offset 2 = "after child 2" (= after Third)
      // focus  [0] offset 0 = "before child 0" (= before First)
      // anchor > focus; must normalize and span entire block
      const result = resolveSelectionByPath(editor, sel([0], 2, [0], 0));

      expect(result.extractedMarkdown).toContain('First');
      expect(result.extractedMarkdown).toContain('Third');
    });

    // Crisp regression: a=[0] offset 2 (element-level, "before child 2")
    // and b=[0, 1] offset 5 (leaf-level, "inside child 1"). Conceptually
    // a > b. The padding-with-zero comparator gives a.path = [0, 0] and
    // compares against b.path = [0, 1] at index 1, returning -1 → claims
    // a < b. The bug is silent because resolveSelectionByPath's later
    // `if (startLine > endLine) swap` normalizes the visible range, but
    // the wrong endpoint is used for sub-line narrowing and container
    // expansion. Codify the conceptual ordering directly.
    it('orders element-level after-child-N correctly against leaf-level inside-child-M (M<N)', () => {
      const a = { path: [0], offset: 2 };
      const b = { path: [0, 1], offset: 5 };

      const { comparePoints } = require('../resolveSelectionLines');

      // a is "before child 2", b is "inside child 1" → a > b
      expect(Math.sign(comparePoints(a, b))).toBe(1);
      expect(Math.sign(comparePoints(b, a))).toBe(-1);
    });
  });

  // #7: `findEndSegment` returns the LAST segment matched by iteration
  // order in its descendant-fallback loop. That's only correct because
  // `allSegments` happens to be sorted by path today. Calling
  // `findEndSegment` directly with a shuffled segment array (or any
  // future caller that doesn't sort first) silently returns the wrong
  // segment as the range end.
  describe('findEndSegment descendant pick (issue #7)', () => {
    it('returns the segment with the largest endLine regardless of input order', () => {
      const { findEndSegment } = require('../resolveSelectionLines');

      const segs = [
        // Three descendants of [0], deliberately not in path order.
        { path: [0, 2], kind: 'paragraph', startLine: 5, endLine: 5 } as any,
        { path: [0, 0], kind: 'paragraph', startLine: 1, endLine: 1 } as any,
        { path: [0, 1], kind: 'paragraph', startLine: 3, endLine: 3 } as any,
      ];

      const result = findEndSegment(segs, [0]);

      // End of selection at the container [0] must extend to the latest
      // descendant (line 5), not to whatever happens to be iterated last.
      expect(result?.endLine).toBe(5);
    });
  });

  // #8: `pushSegment` derives `endLine` by counting newlines in the
  // emitted markdown. A trailing newline (very common for block elements)
  // inflates the count by one and pushes `endLine` past the actual
  // content, making `extractLines` include a phantom blank line.
  describe('pushSegment trailing newline (issue #8)', () => {
    it('endLine matches the last line of actual content (no trailing-newline handlers today)', () => {
      const editor = makeEditor([
        { type: 'p', children: [{ text: 'Alpha' }] },
        { type: 'p', children: [{ text: 'Beta' }] },
      ]);

      const {
        serializeMdWithSourceMap,
      } = require('../serializeMdWithSourceMap');
      const { segments, markdown } = serializeMdWithSourceMap(editor);

      const lines = markdown.split('\n');

      for (const seg of segments) {
        const lastLine = lines[seg.endLine - 1] ?? '';
        const segMarkdown: string = (seg as any).markdown ?? '';
        const trimmed = segMarkdown.replace(/\s+$/g, '');
        if (!trimmed) continue;
        const tail = trimmed.split('\n').pop() ?? '';
        expect(lastLine).toBe(tail);
      }
    });

    it('endLine ignores trailing newlines in handler output', () => {
      // Force a paragraph handler that returns its content WITH a trailing
      // newline — exactly the failure mode the defensive strip in
      // pushSegment guards against. Injected via a remark plugin so it
      // flows through the extension-handler collection (the only path
      // that the wrapped-handler logic actually reads from).
      // Attach a toMarkdown extension by augmenting the unified processor
      // data on the plugin's `attach` call. Explicit `this: any` is needed
      // for `strict: true` typechecking — unified passes the processor as
      // `this`, but the plugin's `attach` signature isn't typed at the
      // function-expression site.
      const trailingNewlinePlugin: any = function (this: any) {
        const data = this.data();
        data.toMarkdownExtensions ??= [];
        const list = data.toMarkdownExtensions;
        list.push({
          handlers: {
            paragraph: (node: any) => {
              const text = (node.children ?? [])
                .map((c: any) => c.value ?? '')
                .join('');
              return `${text}\n`;
            },
          },
        });
      };

      const editor = createSlateEditor({
        plugins: [
          BaseParagraphPlugin,
          MarkdownPlugin.configure({
            options: {
              plainMarks: [KEYS.suggestion, KEYS.comment],
              remarkPlugins: [
                remarkMath,
                remarkGfm,
                remarkMdx,
                remarkMention,
                trailingNewlinePlugin,
              ],
            },
          }),
        ],
      } as any);
      editor.children = [
        { type: 'p', children: [{ text: 'Alpha' }] },
        { type: 'p', children: [{ text: 'Beta' }] },
      ];

      const {
        serializeMdWithSourceMap,
      } = require('../serializeMdWithSourceMap');
      const { segments } = serializeMdWithSourceMap(editor);

      // Despite the handler emitting "Alpha\n" and "Beta\n", each segment
      // must report a single-line span (startLine === endLine) — anything
      // else means the trailing newline was counted.
      const paragraphSegs = segments.filter((s: any) => s.kind === 'paragraph');
      expect(paragraphSegs.length).toBeGreaterThan(0);
      for (const seg of paragraphSegs) {
        expect(seg.endLine - seg.startLine).toBe(0);
      }
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
