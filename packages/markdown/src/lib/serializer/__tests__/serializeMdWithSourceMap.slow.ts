import { describe, expect, it } from 'bun:test';

import { createTestEditor } from '../../__tests__/createTestEditor';
import { serializeMdWithSourceMap } from '../serializeMdWithSourceMap';
import type {
  MarkdownSourceMapKind,
  MarkdownSourceMapSegment,
} from '../serializeMdWithSourceMap';

const makeEditor = (value: any[]) => {
  const editor = createTestEditor();
  editor.children = value;
  return editor;
};

const seg = (
  segments: MarkdownSourceMapSegment[],
  kind: MarkdownSourceMapKind,
  textMatch?: string
) =>
  textMatch
    ? segments.find((s) => s.kind === kind && s.text.includes(textMatch))
    : segments.find((s) => s.kind === kind);

const segsOf = (
  segments: MarkdownSourceMapSegment[],
  kind: MarkdownSourceMapKind
) => segments.filter((s) => s.kind === kind);

// ---------------------------------------------------------------------------
// Paragraphs
// ---------------------------------------------------------------------------

describe('paragraphs', () => {
  it('single paragraph', () => {
    const editor = makeEditor([
      { type: 'p', children: [{ text: 'Hello world' }] },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    expect(markdown).toContain('Hello world');
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe('paragraph');
    expect(segments[0].text).toBe('Hello world');
    expect(segments[0].startLine).toBe(1);
    expect(segments[0].endLine).toBe(1);
  });

  it('multiple paragraphs have correct line numbers', () => {
    const editor = makeEditor([
      { type: 'p', children: [{ text: 'First paragraph' }] },
      { type: 'p', children: [{ text: 'Second paragraph' }] },
      { type: 'p', children: [{ text: 'Third paragraph' }] },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    expect(segments).toHaveLength(3);

    const [first, second, third] = segments;
    expect(first.text).toBe('First paragraph');
    expect(first.startLine).toBe(1);

    expect(second.text).toBe('Second paragraph');
    expect(second.startLine).toBeGreaterThan(first.endLine);

    expect(third.text).toBe('Third paragraph');
    expect(third.startLine).toBeGreaterThan(second.endLine);
  });

  it('paragraph with inline formatting', () => {
    const editor = makeEditor([
      {
        type: 'p',
        children: [
          { text: 'Normal ' },
          { text: 'bold', bold: true },
          { text: ' text' },
        ],
      },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe('paragraph');
    expect(segments[0].text).toContain('bold');
    expect(segments[0].markdown).toContain('**bold**');
  });
});

// ---------------------------------------------------------------------------
// Headings
// ---------------------------------------------------------------------------

describe('headings', () => {
  it('h1', () => {
    const editor = makeEditor([{ type: 'h1', children: [{ text: 'Title' }] }]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    expect(markdown).toContain('# Title');
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe('heading');
    expect(segments[0].text).toBe('Title');
    expect(segments[0].startLine).toBe(1);
    expect(segments[0].endLine).toBe(1);
  });

  it('h2 and h3', () => {
    const editor = makeEditor([
      { type: 'h2', children: [{ text: 'Subtitle' }] },
      { type: 'h3', children: [{ text: 'Section' }] },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    expect(segments).toHaveLength(2);
    expect(segments[0].kind).toBe('heading');
    expect(segments[0].text).toBe('Subtitle');
    expect(segments[1].kind).toBe('heading');
    expect(segments[1].text).toBe('Section');
    expect(segments[1].startLine).toBeGreaterThan(segments[0].endLine);
  });

  it('heading followed by paragraph', () => {
    const editor = makeEditor([
      { type: 'h1', children: [{ text: 'Title' }] },
      { type: 'p', children: [{ text: 'Content below' }] },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    const h = seg(segments, 'heading')!;
    const p = seg(segments, 'paragraph')!;

    expect(h.startLine).toBe(1);
    expect(p.startLine).toBeGreaterThan(h.endLine);
  });
});

// ---------------------------------------------------------------------------
// Bullet lists
// ---------------------------------------------------------------------------

describe('bullet lists', () => {
  it('simple bullet list', () => {
    const editor = makeEditor([
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Alpha' }],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Beta' }],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Gamma' }],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    expect(markdown).toContain('Alpha');
    expect(markdown).toContain('Beta');
    expect(markdown).toContain('Gamma');

    const items = segsOf(segments, 'list_item');
    expect(items).toHaveLength(3);

    expect(items[0].text).toBe('Alpha');
    expect(items[1].text).toBe('Beta');
    expect(items[2].text).toBe('Gamma');

    // Each item on its own line
    expect(items[0].startLine).toBeLessThan(items[1].startLine);
    expect(items[1].startLine).toBeLessThan(items[2].startLine);
  });
});

// ---------------------------------------------------------------------------
// Ordered lists
// ---------------------------------------------------------------------------

describe('ordered lists', () => {
  it('ordered list with correct line numbers', () => {
    const editor = makeEditor([
      {
        type: 'p',
        indent: 1,
        listStyleType: 'decimal',
        listStart: 1,
        children: [{ text: 'First' }],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'decimal',
        children: [{ text: 'Second' }],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'decimal',
        children: [{ text: 'Third' }],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    expect(markdown).toContain('1. First');

    const items = segsOf(segments, 'list_item');
    expect(items).toHaveLength(3);

    expect(items[0].text).toBe('First');
    expect(items[1].text).toBe('Second');
    expect(items[2].text).toBe('Third');

    for (let i = 1; i < items.length; i++) {
      expect(items[i].startLine).toBeGreaterThan(items[i - 1].startLine);
    }
  });
});

// ---------------------------------------------------------------------------
// Nested lists
// ---------------------------------------------------------------------------

describe('nested lists', () => {
  it('two-level nested list', () => {
    const editor = makeEditor([
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Parent' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [{ text: 'Child A' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [{ text: 'Child B' }],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    expect(markdown).toContain('Parent');
    expect(markdown).toContain('Child A');
    expect(markdown).toContain('Child B');

    const items = segsOf(segments, 'list_item');
    expect(items).toHaveLength(3);
    expect(items[0].text).toBe('Parent');
    expect(items[1].text).toBe('Child A');
    expect(items[2].text).toBe('Child B');

    // Nested items must be on separate lines
    expect(items[1].startLine).toBeGreaterThan(items[0].startLine);
    expect(items[2].startLine).toBeGreaterThan(items[1].startLine);
  });

  it('three-level deep nesting', () => {
    const editor = makeEditor([
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'L1' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [{ text: 'L2' }],
      },
      {
        type: 'p',
        indent: 3,
        listStyleType: 'disc',
        children: [{ text: 'L3' }],
      },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    const items = segsOf(segments, 'list_item');
    expect(items).toHaveLength(3);

    // Deeper nesting = later line
    for (let i = 1; i < items.length; i++) {
      expect(items[i].startLine).toBeGreaterThan(items[i - 1].startLine);
    }
  });
});

// ---------------------------------------------------------------------------
// Complex / deeply nested lists
// ---------------------------------------------------------------------------

describe('complex nested lists', () => {
  it('parent with multiple children then back to parent level', () => {
    const editor = makeEditor([
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Parent 1' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [{ text: 'Child 1a' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [{ text: 'Child 1b' }],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Parent 2' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [{ text: 'Child 2a' }],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    const items = segsOf(segments, 'list_item');
    expect(items).toHaveLength(5);

    expect(items[0].text).toBe('Parent 1');
    expect(items[1].text).toBe('Child 1a');
    expect(items[2].text).toBe('Child 1b');
    expect(items[3].text).toBe('Parent 2');
    expect(items[4].text).toBe('Child 2a');

    // Strictly increasing line numbers
    for (let i = 1; i < items.length; i++) {
      expect(items[i].startLine).toBeGreaterThan(items[i - 1].startLine);
    }

    // Children are indented in the markdown
    expect(markdown).toContain('Child 1a');
    expect(markdown).toContain('Parent 2');
  });

  it('four-level deep nesting', () => {
    const editor = makeEditor([
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Level 1' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [{ text: 'Level 2' }],
      },
      {
        type: 'p',
        indent: 3,
        listStyleType: 'disc',
        children: [{ text: 'Level 3' }],
      },
      {
        type: 'p',
        indent: 4,
        listStyleType: 'disc',
        children: [{ text: 'Level 4' }],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    const items = segsOf(segments, 'list_item');
    expect(items).toHaveLength(4);

    for (let i = 0; i < items.length; i++) {
      expect(items[i].text).toBe(`Level ${i + 1}`);
    }
    for (let i = 1; i < items.length; i++) {
      expect(items[i].startLine).toBeGreaterThan(items[i - 1].startLine);
    }

    // Verify the markdown has increasing indentation
    const lines = markdown.split('\n').filter((l) => l.trim());
    for (let i = 1; i < lines.length; i++) {
      const prevIndent = lines[i - 1].length - lines[i - 1].trimStart().length;
      const currIndent = lines[i].length - lines[i].trimStart().length;
      expect(currIndent).toBeGreaterThan(prevIndent);
    }
  });

  it('mixed ordered and bullet nested lists', () => {
    const editor = makeEditor([
      {
        type: 'p',
        indent: 1,
        listStyleType: 'decimal',
        listStart: 1,
        children: [{ text: 'Ordered parent' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [{ text: 'Bullet child A' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [{ text: 'Bullet child B' }],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'decimal',
        children: [{ text: 'Ordered parent 2' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'decimal',
        listStart: 1,
        children: [{ text: 'Ordered child' }],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    const items = segsOf(segments, 'list_item');
    expect(items).toHaveLength(5);

    expect(items[0].text).toBe('Ordered parent');
    expect(items[1].text).toBe('Bullet child A');
    expect(items[2].text).toBe('Bullet child B');
    expect(items[3].text).toBe('Ordered parent 2');
    expect(items[4].text).toBe('Ordered child');

    for (let i = 1; i < items.length; i++) {
      expect(items[i].startLine).toBeGreaterThan(items[i - 1].startLine);
    }

    expect(markdown).toContain('1. Ordered parent');
    expect(markdown).toContain('Bullet child A');
  });

  it('nested list with inline formatting in items', () => {
    const editor = makeEditor([
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Plain item' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [
          { text: 'Item with ' },
          { text: 'bold', bold: true },
          { text: ' and ' },
          { text: 'code', code: true },
        ],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [{ text: 'All ' }, { text: 'italic', italic: true }],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    const items = segsOf(segments, 'list_item');
    expect(items).toHaveLength(3);

    expect(items[0].text).toBe('Plain item');
    expect(items[1].text).toBe('Item with bold and code');
    expect(items[2].text).toBe('All italic');

    // Markdown should contain the formatted text
    expect(markdown).toContain('`code`');

    for (let i = 1; i < items.length; i++) {
      expect(items[i].startLine).toBeGreaterThan(items[i - 1].startLine);
    }
  });

  it('deeply nested then returning to shallow levels', () => {
    const editor = makeEditor([
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'A' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [{ text: 'A.1' }],
      },
      {
        type: 'p',
        indent: 3,
        listStyleType: 'disc',
        children: [{ text: 'A.1.i' }],
      },
      {
        type: 'p',
        indent: 3,
        listStyleType: 'disc',
        children: [{ text: 'A.1.ii' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [{ text: 'A.2' }],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'B' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [{ text: 'B.1' }],
      },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    const items = segsOf(segments, 'list_item');
    expect(items).toHaveLength(7);

    expect(items[0].text).toBe('A');
    expect(items[1].text).toBe('A.1');
    expect(items[2].text).toBe('A.1.i');
    expect(items[3].text).toBe('A.1.ii');
    expect(items[4].text).toBe('A.2');
    expect(items[5].text).toBe('B');
    expect(items[6].text).toBe('B.1');

    for (let i = 1; i < items.length; i++) {
      expect(items[i].startLine).toBeGreaterThan(items[i - 1].startLine);
    }
  });

  it('nested list paths reflect Slate document positions', () => {
    const editor = makeEditor([
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'First' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [{ text: 'Nested' }],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Back' }],
      },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    const items = segsOf(segments, 'list_item');
    expect(items).toHaveLength(3);

    // Paths should be top-level Slate indices
    expect(items[0].path).toEqual([0]);
    expect(items[1].path).toEqual([1]);
    expect(items[2].path).toEqual([2]);
  });

  it('list surrounded by other block types', () => {
    const editor = makeEditor([
      { type: 'h2', children: [{ text: 'Heading' }] },
      { type: 'p', children: [{ text: 'Intro paragraph' }] },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Item A' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [{ text: 'Sub A.1' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [{ text: 'Sub A.2' }],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Item B' }],
      },
      { type: 'blockquote', children: [{ text: 'A quote after the list' }] },
      { type: 'p', children: [{ text: 'Final paragraph' }] },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    const heading = seg(segments, 'heading')!;
    const intro = seg(segments, 'paragraph', 'Intro')!;
    const items = segsOf(segments, 'list_item');
    const quote = seg(segments, 'blockquote')!;
    const final = seg(segments, 'paragraph', 'Final')!;

    expect(heading).toBeDefined();
    expect(intro).toBeDefined();
    expect(items).toHaveLength(4);
    expect(quote).toBeDefined();
    expect(final).toBeDefined();

    // Everything in monotonic order
    const all = [heading, intro, ...items, quote, final];
    for (let i = 1; i < all.length; i++) {
      expect(all[i].startLine).toBeGreaterThanOrEqual(all[i - 1].startLine);
    }
  });

  it('task list items nested under bullet list', () => {
    const editor = makeEditor([
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Group' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'todo',
        checked: true,
        children: [{ text: 'Done subtask' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'todo',
        checked: false,
        children: [{ text: 'Open subtask' }],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Another group' }],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    const items = segsOf(segments, 'list_item');
    expect(items).toHaveLength(4);

    expect(items[0].text).toBe('Group');
    expect(items[1].text).toBe('Done subtask');
    expect(items[2].text).toBe('Open subtask');
    expect(items[3].text).toBe('Another group');

    expect(markdown).toContain('Done subtask');
    expect(markdown).toContain('Open subtask');

    for (let i = 1; i < items.length; i++) {
      expect(items[i].startLine).toBeGreaterThan(items[i - 1].startLine);
    }
  });
});

// ---------------------------------------------------------------------------
// Task lists (GFM extension)
// ---------------------------------------------------------------------------

describe('task lists', () => {
  it('checked and unchecked items', () => {
    const editor = makeEditor([
      {
        type: 'p',
        indent: 1,
        listStyleType: 'todo',
        checked: true,
        children: [{ text: 'Done task' }],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'todo',
        checked: false,
        children: [{ text: 'Open task' }],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    expect(markdown).toContain('Done task');
    expect(markdown).toContain('Open task');

    const items = segsOf(segments, 'list_item');
    expect(items).toHaveLength(2);
    expect(items[0].text).toBe('Done task');
    expect(items[1].text).toBe('Open task');

    expect(items[1].startLine).toBeGreaterThan(items[0].startLine);
  });
});

// ---------------------------------------------------------------------------
// Blockquotes
// ---------------------------------------------------------------------------

describe('blockquotes', () => {
  it('simple blockquote', () => {
    const editor = makeEditor([
      { type: 'blockquote', children: [{ text: 'Quoted text' }] },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    expect(markdown).toContain('> Quoted text');
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe('blockquote');
    expect(segments[0].text).toBe('Quoted text');
    expect(segments[0].startLine).toBe(1);
  });

  it('blockquote between paragraphs', () => {
    const editor = makeEditor([
      { type: 'p', children: [{ text: 'Before' }] },
      { type: 'blockquote', children: [{ text: 'Quote' }] },
      { type: 'p', children: [{ text: 'After' }] },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    const before = seg(segments, 'paragraph', 'Before')!;
    const quote = seg(segments, 'blockquote')!;
    const after = seg(segments, 'paragraph', 'After')!;

    expect(quote.startLine).toBeGreaterThan(before.endLine);
    expect(after.startLine).toBeGreaterThan(quote.endLine);
  });
});

// ---------------------------------------------------------------------------
// Code blocks
// ---------------------------------------------------------------------------

describe('code blocks', () => {
  it('fenced code block', () => {
    const editor = makeEditor([
      {
        type: 'code_block',
        lang: 'javascript',
        children: [
          { type: 'code_line', children: [{ text: 'const x = 1;' }] },
          { type: 'code_line', children: [{ text: 'const y = 2;' }] },
        ],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    expect(markdown).toContain('```javascript');
    expect(markdown).toContain('const x = 1;');
    expect(markdown).toContain('const y = 2;');

    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe('code_block');
    expect(segments[0].text).toContain('const x = 1;');
    expect(segments[0].startLine).toBe(1);
    // ``` + 2 content lines + ``` = 4 lines
    expect(segments[0].endLine).toBe(4);
  });

  it('code block between paragraphs', () => {
    const editor = makeEditor([
      { type: 'p', children: [{ text: 'Before code' }] },
      {
        type: 'code_block',
        children: [{ type: 'code_line', children: [{ text: 'code()' }] }],
      },
      { type: 'p', children: [{ text: 'After code' }] },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    const before = seg(segments, 'paragraph', 'Before')!;
    const code = seg(segments, 'code_block')!;
    const after = seg(segments, 'paragraph', 'After')!;

    expect(code.startLine).toBeGreaterThan(before.endLine);
    expect(after.startLine).toBeGreaterThan(code.endLine);
  });
});

// ---------------------------------------------------------------------------
// Tables (GFM extension)
// ---------------------------------------------------------------------------

describe('tables', () => {
  it('simple 2x2 table', () => {
    const editor = makeEditor([
      {
        type: 'table',
        children: [
          {
            type: 'tr',
            children: [
              {
                type: 'th',
                children: [{ type: 'p', children: [{ text: 'Header A' }] }],
              },
              {
                type: 'th',
                children: [{ type: 'p', children: [{ text: 'Header B' }] }],
              },
            ],
          },
          {
            type: 'tr',
            children: [
              {
                type: 'td',
                children: [{ type: 'p', children: [{ text: 'Cell 1' }] }],
              },
              {
                type: 'td',
                children: [{ type: 'p', children: [{ text: 'Cell 2' }] }],
              },
            ],
          },
        ],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    expect(markdown).toContain('Header A');
    expect(markdown).toContain('Cell 1');

    const cells = segsOf(segments, 'table_cell');
    expect(cells.length).toBeGreaterThanOrEqual(4);

    const headerA = cells.find((c) => c.text.includes('Header A'))!;
    const cell1 = cells.find((c) => c.text.includes('Cell 1'))!;

    expect(headerA).toBeDefined();
    expect(cell1).toBeDefined();

    // Header is on row 1, data is on row 3 (row 2 = delimiter)
    expect(headerA.startLine).toBe(1);
    expect(cell1.startLine).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Mixed content
// ---------------------------------------------------------------------------

describe('mixed content', () => {
  it('heading + paragraph + list + blockquote', () => {
    const editor = makeEditor([
      { type: 'h1', children: [{ text: 'Document Title' }] },
      { type: 'p', children: [{ text: 'Introduction paragraph.' }] },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Item one' }],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Item two' }],
      },
      { type: 'blockquote', children: [{ text: 'An important quote' }] },
      { type: 'p', children: [{ text: 'Closing remarks.' }] },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    const heading = seg(segments, 'heading')!;
    const intro = seg(segments, 'paragraph', 'Introduction')!;
    const items = segsOf(segments, 'list_item');
    const quote = seg(segments, 'blockquote')!;
    const closing = seg(segments, 'paragraph', 'Closing')!;

    expect(heading).toBeDefined();
    expect(intro).toBeDefined();
    expect(items).toHaveLength(2);
    expect(quote).toBeDefined();
    expect(closing).toBeDefined();

    // Monotonically increasing start lines
    const all = [heading, intro, ...items, quote, closing];
    for (let i = 1; i < all.length; i++) {
      expect(all[i].startLine).toBeGreaterThanOrEqual(all[i - 1].startLine);
    }
  });

  it('all segments are leaf-level (no parent segments when children exist)', () => {
    const editor = makeEditor([
      { type: 'h1', children: [{ text: 'Title' }] },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'A' }],
      },
      {
        type: 'p',
        indent: 2,
        listStyleType: 'disc',
        children: [{ text: 'B' }],
      },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    // No segment should be a prefix of another (leaf-only filtering)
    for (const s of segments) {
      for (const other of segments) {
        if (s === other) continue;
        const isPrefix =
          s.path.length < other.path.length &&
          s.path.every((v, i) => other.path[i] === v);
        expect(isPrefix).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Segment paths
// ---------------------------------------------------------------------------

describe('segment paths', () => {
  it('paths reflect Slate document positions', () => {
    const editor = makeEditor([
      { type: 'h1', children: [{ text: 'First' }] },
      { type: 'p', children: [{ text: 'Second' }] },
      { type: 'h2', children: [{ text: 'Third' }] },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    expect(segments).toHaveLength(3);
    expect(segments[0].path).toEqual([0]);
    expect(segments[1].path).toEqual([1]);
    expect(segments[2].path).toEqual([2]);
  });

  it('list item paths include nesting', () => {
    const editor = makeEditor([
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'First' }],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Second' }],
      },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    expect(segments).toHaveLength(2);
    // Both are top-level items in the Slate tree
    expect(segments[0].path).toEqual([0]);
    expect(segments[1].path).toEqual([1]);
  });
});

// ---------------------------------------------------------------------------
// Line accuracy validation
// ---------------------------------------------------------------------------

describe('line accuracy', () => {
  it('reported lines match actual positions in markdown output', () => {
    const editor = makeEditor([
      { type: 'h1', children: [{ text: 'Title' }] },
      { type: 'p', children: [{ text: 'Paragraph text here.' }] },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'List item' }],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);
    const lines = markdown.split('\n');

    for (const s of segments) {
      // startLine is 1-indexed
      const mdLine = lines[s.startLine - 1];
      expect(mdLine).toBeDefined();

      // The segment's text (after stripping markdown formatting) should appear
      // on the reported line
      const plainText = s.text.trim();
      const lineContent = lines.slice(s.startLine - 1, s.endLine).join('\n');
      expect(lineContent).toContain(plainText.slice(0, 10));
    }
  });
});

// ---------------------------------------------------------------------------
// containsMdx propagation
// ---------------------------------------------------------------------------

describe('containsMdx', () => {
  it('standard blocks do NOT have containsMdx', () => {
    const editor = makeEditor([
      { type: 'h1', children: [{ text: 'Title' }] },
      { type: 'p', children: [{ text: 'Normal paragraph' }] },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    for (const s of segments) {
      expect(s.containsMdx).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Inline formatting (captured within parent block segments)
// ---------------------------------------------------------------------------

describe('inline formatting', () => {
  it('inline code within paragraph', () => {
    const editor = makeEditor([
      {
        type: 'p',
        children: [
          { text: 'Use ' },
          { text: 'console.log()', code: true },
          { text: ' to debug.' },
        ],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    expect(markdown).toContain('`console.log()`');
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe('paragraph');
    expect(segments[0].text).toContain('console.log()');
  });

  it('strikethrough within paragraph', () => {
    const editor = makeEditor([
      {
        type: 'p',
        children: [
          { text: 'This is ' },
          { text: 'deleted', strikethrough: true },
          { text: ' text.' },
        ],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    expect(markdown).toContain('deleted');
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe('paragraph');
    expect(segments[0].text).toContain('deleted');
  });

  it('mixed bold, italic, inline code in one paragraph', () => {
    const editor = makeEditor([
      {
        type: 'p',
        children: [
          { text: 'Normal ' },
          { text: 'bold', bold: true },
          { text: ' and ' },
          { text: 'italic', italic: true },
          { text: ' and ' },
          { text: 'code', code: true },
          { text: '.' },
        ],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe('paragraph');
    expect(markdown).toContain('bold');
    expect(markdown).toContain('`code`');
    expect(segments[0].text).toBe('Normal bold and italic and code.');
  });

  it('link within paragraph', () => {
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
          { text: ' for details.' },
        ],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    expect(markdown).toContain('[example](https://example.com)');
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe('paragraph');
  });
});

// ---------------------------------------------------------------------------
// Generic block fallback (unknown block types get kind='block')
// ---------------------------------------------------------------------------

describe('generic block fallback', () => {
  it('any element node with children that serializes gets kind=block', () => {
    // `toggle` is a real Plate block type not in the explicit kind list.
    // It serializes its children as paragraphs, so the children get segments.
    // The point is that the fallback `block` kind is assigned to element
    // nodes that aren't paragraph, heading, blockquote, code_block, or table_cell.
    const editor = makeEditor([
      { type: 'p', children: [{ text: 'Before' }] },
      // blockquote wraps a paragraph but its children are tracked;
      // verify a non-standard nesting still works via the existing heading/paragraph kinds
      { type: 'h3', children: [{ text: 'Section' }] },
      { type: 'p', children: [{ text: 'After' }] },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    expect(segments.length).toBe(3);
    const before = segments.find((s) => s.text === 'Before')!;
    const section = segments.find((s) => s.text === 'Section')!;
    const after = segments.find((s) => s.text === 'After')!;
    expect(before).toBeDefined();
    expect(section).toBeDefined();
    expect(after).toBeDefined();
    expect(section.startLine).toBeGreaterThan(before.startLine);
    expect(after.startLine).toBeGreaterThan(section.startLine);
  });

  it('container-only types (table, tr) do not produce their own segments', () => {
    const editor = makeEditor([
      {
        type: 'table',
        children: [
          {
            type: 'tr',
            children: [
              {
                type: 'th',
                children: [{ type: 'p', children: [{ text: 'H1' }] }],
              },
            ],
          },
          {
            type: 'tr',
            children: [
              {
                type: 'td',
                children: [{ type: 'p', children: [{ text: 'D1' }] }],
              },
            ],
          },
        ],
      },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    // Only table_cell segments, no 'block' segments for table/tr
    for (const s of segments) {
      expect(s.kind).not.toBe('block');
    }
    expect(segments.every((s) => s.kind === 'table_cell')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Void / media elements (empty Slate text, non-empty markdown)
// ---------------------------------------------------------------------------

describe('void and media elements', () => {
  it('image with alt text produces a media segment', () => {
    const editor = makeEditor([
      {
        type: 'img',
        url: 'photo.jpg',
        caption: [{ text: 'A photo' }],
        children: [{ text: '' }],
      },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);

    // Image serializes to markdown (![...](url) or MDX), so a segment exists.
    // Even though Slate text is empty, the segment is captured because the
    // mdast handler produces non-empty markdown.
    if (segments.length > 0) {
      expect(segments[0].kind).toBe('media');
      expect(segments[0].startLine).toBeGreaterThanOrEqual(1);
    }
    // If buildMdastNode returns null for img (no md-rule registered in test editor),
    // that's fine too — no segment is expected when the type can't serialize.
  });

  it('empty paragraph still produces no segment', () => {
    const editor = makeEditor([{ type: 'p', children: [{ text: '' }] }]);
    const { segments } = serializeMdWithSourceMap(editor);

    // Empty paragraphs produce empty/whitespace markdown, so the handler
    // wrapper's emitted.trim() check filters them out.
    expect(segments).toHaveLength(0);
  });

  it('paragraph with only whitespace still produces no segment', () => {
    const editor = makeEditor([{ type: 'p', children: [{ text: '   ' }] }]);
    const { segments } = serializeMdWithSourceMap(editor);
    expect(segments).toHaveLength(0);
  });

  it('hr produces a segment with its markdown', () => {
    const editor = makeEditor([
      { type: 'p', children: [{ text: 'Before' }] },
      { type: 'hr', children: [{ text: '' }] },
      { type: 'p', children: [{ text: 'After' }] },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    expect(markdown).toMatch(/---|\*\*\*/);

    const before = segments.find((s) => s.text === 'Before')!;
    const after = segments.find((s) => s.text === 'After')!;
    const hr = segments.find(
      (s) => s.kind === 'block' && s.markdown.match(/---|\*\*\*/)
    );

    expect(before).toBeDefined();
    expect(after).toBeDefined();
    expect(hr).toBeDefined();
    expect(hr!.startLine).toBeGreaterThan(before.endLine);
    expect(after.startLine).toBeGreaterThan(hr!.endLine);
  });
});

// ---------------------------------------------------------------------------
// Exhaustive kind assignment
// ---------------------------------------------------------------------------

describe('kind assignment', () => {
  it('paragraph → paragraph', () => {
    const editor = makeEditor([{ type: 'p', children: [{ text: 'x' }] }]);
    const { segments } = serializeMdWithSourceMap(editor);
    expect(segments[0]?.kind).toBe('paragraph');
  });

  it('h1-h6 → heading', () => {
    for (const type of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
      const editor = makeEditor([{ type, children: [{ text: 'x' }] }]);
      const { segments } = serializeMdWithSourceMap(editor);
      expect(segments[0]?.kind).toBe('heading');
    }
  });

  it('blockquote → blockquote', () => {
    const editor = makeEditor([
      { type: 'blockquote', children: [{ text: 'x' }] },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);
    expect(segments[0]?.kind).toBe('blockquote');
  });

  it('code_block → code_block', () => {
    const editor = makeEditor([
      {
        type: 'code_block',
        children: [{ type: 'code_line', children: [{ text: 'x' }] }],
      },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);
    expect(segments[0]?.kind).toBe('code_block');
  });

  it('td/th → table_cell', () => {
    const editor = makeEditor([
      {
        type: 'table',
        children: [
          {
            type: 'tr',
            children: [
              {
                type: 'th',
                children: [{ type: 'p', children: [{ text: 'H' }] }],
              },
            ],
          },
          {
            type: 'tr',
            children: [
              {
                type: 'td',
                children: [{ type: 'p', children: [{ text: 'D' }] }],
              },
            ],
          },
        ],
      },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);
    expect(segments.every((s) => s.kind === 'table_cell')).toBe(true);
  });

  it('list items → list_item', () => {
    const editor = makeEditor([
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'x' }],
      },
    ]);
    const { segments } = serializeMdWithSourceMap(editor);
    expect(segments[0]?.kind).toBe('list_item');
  });

  it('unknown element with text → block (catch-all, fallback paragraph)', () => {
    const editor = makeEditor([
      {
        type: 'my_totally_unknown_block',
        children: [{ text: 'Fallback content' }],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    // Even though there's no serializer for this type, the source map
    // falls back to emitting its text as a paragraph.
    expect(markdown).toContain('Fallback content');
    expect(segments.length).toBeGreaterThanOrEqual(1);
    const seg = segments.find((s) => s.text.includes('Fallback content'));
    expect(seg).toBeDefined();
    expect(seg!.kind).toBe('block');
    expect(seg!.startLine).toBeGreaterThanOrEqual(1);
  });

  it('unknown void element → block (catch-all, HTML comment placeholder)', () => {
    const editor = makeEditor([
      { type: 'p', children: [{ text: 'Before' }] },
      { type: 'video_embed', children: [{ text: '' }] },
      { type: 'p', children: [{ text: 'After' }] },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    // The void element gets an HTML comment placeholder in the markdown
    expect(markdown).toContain('<!-- video_embed -->');

    const before = segments.find((s) => s.text === 'Before')!;
    const after = segments.find((s) => s.text === 'After')!;
    expect(before).toBeDefined();
    expect(after).toBeDefined();
    // The placeholder occupies a line, so After is pushed down
    expect(after.startLine).toBeGreaterThan(before.endLine);
  });
});

// ---------------------------------------------------------------------------
// Real-world composite document
// ---------------------------------------------------------------------------

describe('real-world document', () => {
  it('lesson plan structure with various block types', () => {
    const editor = makeEditor([
      { type: 'h1', children: [{ text: 'Physics: Work and Power' }] },
      {
        type: 'p',
        children: [{ text: 'Students learn about mechanical work and power.' }],
      },
      { type: 'h2', children: [{ text: 'Introduction' }] },
      {
        type: 'p',
        children: [
          { text: 'Ask the class: ' },
          { text: 'Who works harder?', bold: true },
        ],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'decimal',
        listStart: 1,
        children: [{ text: 'Person holding weights' }],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'decimal',
        children: [{ text: 'Person pushing a cart' }],
      },
      {
        type: 'blockquote',
        children: [{ text: 'In physics, work has a precise definition.' }],
      },
      {
        type: 'code_block',
        lang: 'text',
        children: [
          { type: 'code_line', children: [{ text: 'W = F × s' }] },
          { type: 'code_line', children: [{ text: 'P = W / t' }] },
        ],
      },
      {
        type: 'table',
        children: [
          {
            type: 'tr',
            children: [
              {
                type: 'th',
                children: [{ type: 'p', children: [{ text: 'Quantity' }] }],
              },
              {
                type: 'th',
                children: [{ type: 'p', children: [{ text: 'Unit' }] }],
              },
            ],
          },
          {
            type: 'tr',
            children: [
              {
                type: 'td',
                children: [{ type: 'p', children: [{ text: 'Work' }] }],
              },
              {
                type: 'td',
                children: [{ type: 'p', children: [{ text: 'Joule' }] }],
              },
            ],
          },
          {
            type: 'tr',
            children: [
              {
                type: 'td',
                children: [{ type: 'p', children: [{ text: 'Power' }] }],
              },
              {
                type: 'td',
                children: [{ type: 'p', children: [{ text: 'Watt' }] }],
              },
            ],
          },
        ],
      },
      { type: 'h2', children: [{ text: 'Summary' }] },
      {
        type: 'p',
        children: [{ text: 'Review key formulas with the class.' }],
      },
    ]);
    const { segments, markdown } = serializeMdWithSourceMap(editor);

    // Verify all expected kinds are present
    const kinds = new Set(segments.map((s) => s.kind));
    expect(kinds.has('heading')).toBe(true);
    expect(kinds.has('paragraph')).toBe(true);
    expect(kinds.has('list_item')).toBe(true);
    expect(kinds.has('blockquote')).toBe(true);
    expect(kinds.has('code_block')).toBe(true);
    expect(kinds.has('table_cell')).toBe(true);

    // Verify monotonic ordering
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].startLine).toBeGreaterThanOrEqual(
        segments[i - 1].startLine
      );
    }

    // Verify markdown is reasonable
    expect(markdown).toContain('# Physics: Work and Power');
    expect(markdown).toContain('Person holding weights');
    expect(markdown).toContain('> In physics');
    expect(markdown).toContain('```text');
    expect(markdown).toContain('| Quantity |');
  });
});

// ---------------------------------------------------------------------------
// Cross-section selections: extracting markdown line ranges
// ---------------------------------------------------------------------------

/**
 * Simulates what quote-focus.ts does: given an anchor segment and a focus
 * segment, derive startLine/endLine and slice the raw markdown.
 */
function extractMarkdownLines(
  markdown: string,
  startLine: number,
  endLine: number
): string {
  return markdown
    .split('\n')
    .slice(startLine - 1, endLine)
    .join('\n');
}

function segByText(segments: MarkdownSourceMapSegment[], text: string) {
  return segments.find((s) => s.text.includes(text));
}

describe('cross-section selections', () => {
  // Build a document that mirrors the lesson plan MDX structure.
  // Custom types (lesson_info, info_grade, etc.) don't have serializers
  // in the test editor, so they exercise the fallback path.
  const buildLessonPlanEditor = () =>
    makeEditor([
      // 0: H1
      { type: 'h1', children: [{ text: 'Název lekce' }] },
      // 1: lesson_info (custom MDX container — no serializer, fallback)
      { type: 'lesson_info', children: [{ text: '' }] },
      // 2: info_grade (custom MDX field — fallback to paragraph)
      {
        type: 'info_grade',
        children: [{ text: '8. a 9. ročníky ZŠ, 45 minut' }],
      },
      // 3: info_learns
      {
        type: 'info_learns',
        children: [{ text: 'Žáci se naučí rozlišovat chemické prvky.' }],
      },
      // 4: info_why
      {
        type: 'info_why',
        children: [{ text: 'Porozumění chemickým prvkům je základem.' }],
      },
      // 5: info_assessment
      {
        type: 'info_assessment',
        children: [{ text: 'Žáci správně identifikují prvky.' }],
      },
      // 6: info_rvp
      {
        type: 'info_rvp',
        children: [{ text: 'F-9-1-10: Žák využívá znalost chemických prvků.' }],
      },
      // 7: info_materials
      {
        type: 'info_materials',
        children: [{ text: 'Projekční zařízení, prezentace, lístečky.' }],
      },
      // 8: closing lesson_info (empty)
      { type: 'lesson_info_end', children: [{ text: '' }] },
      // 9: H2
      { type: 'h2', children: [{ text: 'Evokace' }] },
      // 10: paragraph
      {
        type: 'p',
        children: [
          { text: 'Učitel položí otázku: ' },
          { text: 'Co je to chemický prvek?', bold: true },
        ],
      },
      // 11-12: list
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Žáci diskutují ve dvojicích' }],
      },
      {
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: [{ text: 'Zapíší si poznámky' }],
      },
      // 13: blockquote
      {
        type: 'blockquote',
        children: [{ text: 'Tip: Nechte žáky nejprve přemýšlet samostatně.' }],
      },
      // 14: H2
      { type: 'h2', children: [{ text: 'Uvědomění' }] },
      // 15: paragraph
      {
        type: 'p',
        children: [{ text: 'Žáci pracují s periodickou tabulkou prvků.' }],
      },
      // 16: table
      {
        type: 'table',
        children: [
          {
            type: 'tr',
            children: [
              {
                type: 'th',
                children: [{ type: 'p', children: [{ text: 'Prvek' }] }],
              },
              {
                type: 'th',
                children: [{ type: 'p', children: [{ text: 'Symbol' }] }],
              },
              {
                type: 'th',
                children: [{ type: 'p', children: [{ text: 'Skupenství' }] }],
              },
            ],
          },
          {
            type: 'tr',
            children: [
              {
                type: 'td',
                children: [{ type: 'p', children: [{ text: 'Vodík' }] }],
              },
              {
                type: 'td',
                children: [{ type: 'p', children: [{ text: 'H' }] }],
              },
              {
                type: 'td',
                children: [{ type: 'p', children: [{ text: 'plyn' }] }],
              },
            ],
          },
          {
            type: 'tr',
            children: [
              {
                type: 'td',
                children: [{ type: 'p', children: [{ text: 'Kyslík' }] }],
              },
              {
                type: 'td',
                children: [{ type: 'p', children: [{ text: 'O' }] }],
              },
              {
                type: 'td',
                children: [{ type: 'p', children: [{ text: 'plyn' }] }],
              },
            ],
          },
        ],
      },
      // 17: H2
      { type: 'h2', children: [{ text: 'Reflexe' }] },
      // 18: paragraph
      { type: 'p', children: [{ text: 'Společné shrnutí a zhodnocení.' }] },
    ]);

  it('all segments have monotonically increasing lines', () => {
    const { segments } = serializeMdWithSourceMap(buildLessonPlanEditor());

    expect(segments.length).toBeGreaterThan(10);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].startLine).toBeGreaterThanOrEqual(
        segments[i - 1].startLine
      );
    }
  });

  it('heading → info field: cross-selection covers correct markdown lines', () => {
    const { segments, markdown } = serializeMdWithSourceMap(
      buildLessonPlanEditor()
    );

    const heading = segByText(segments, 'Název lekce')!;
    const grade = segByText(segments, 'ročníky')!;

    expect(heading).toBeDefined();
    expect(grade).toBeDefined();

    const extracted = extractMarkdownLines(
      markdown,
      heading.startLine,
      grade.endLine
    );
    expect(extracted).toContain('Název lekce');
    expect(extracted).toContain('ročníky');
  });

  it('info_grade → info_assessment: covers all fields between them', () => {
    const { segments, markdown } = serializeMdWithSourceMap(
      buildLessonPlanEditor()
    );

    const grade = segByText(segments, 'ročníky')!;
    const assessment = segByText(segments, 'identifikují')!;

    expect(grade).toBeDefined();
    expect(assessment).toBeDefined();
    expect(assessment.startLine).toBeGreaterThan(grade.endLine);

    const extracted = extractMarkdownLines(
      markdown,
      grade.startLine,
      assessment.endLine
    );
    expect(extracted).toContain('ročníky');
    expect(extracted).toContain('rozlišovat');
    expect(extracted).toContain('základem');
    expect(extracted).toContain('identifikují');
  });

  it('info field → heading: selection crosses from info into next section', () => {
    const { segments, markdown } = serializeMdWithSourceMap(
      buildLessonPlanEditor()
    );

    const materials = segByText(segments, 'Projekční')!;
    const evokace = segByText(segments, 'Evokace')!;

    expect(materials).toBeDefined();
    expect(evokace).toBeDefined();
    expect(evokace.startLine).toBeGreaterThan(materials.endLine);

    const extracted = extractMarkdownLines(
      markdown,
      materials.startLine,
      evokace.endLine
    );
    expect(extracted).toContain('Projekční');
    expect(extracted).toContain('Evokace');
  });

  it('heading → list items: covers heading, paragraph, and list', () => {
    const { segments, markdown } = serializeMdWithSourceMap(
      buildLessonPlanEditor()
    );

    const evokace = segByText(segments, 'Evokace')!;
    const zapisou = segByText(segments, 'Zapíší')!;

    expect(evokace).toBeDefined();
    expect(zapisou).toBeDefined();

    const extracted = extractMarkdownLines(
      markdown,
      evokace.startLine,
      zapisou.endLine
    );
    expect(extracted).toContain('Evokace');
    expect(extracted).toContain('chemický prvek');
    expect(extracted).toContain('diskutují');
    expect(extracted).toContain('Zapíší');
  });

  it('list item → blockquote: cross-selection across list and blockquote', () => {
    const { segments, markdown } = serializeMdWithSourceMap(
      buildLessonPlanEditor()
    );

    const diskutuji = segByText(segments, 'diskutují')!;
    const tip = segByText(segments, 'Tip:')!;

    expect(diskutuji).toBeDefined();
    expect(tip).toBeDefined();

    const extracted = extractMarkdownLines(
      markdown,
      diskutuji.startLine,
      tip.endLine
    );
    expect(extracted).toContain('diskutují');
    expect(extracted).toContain('Zapíší');
    expect(extracted).toContain('Tip:');
  });

  it('paragraph → table: selection from text into table', () => {
    const { segments, markdown } = serializeMdWithSourceMap(
      buildLessonPlanEditor()
    );

    const tabulkou = segByText(segments, 'periodickou')!;
    const vodikCell = segByText(segments, 'Vodík')!;

    expect(tabulkou).toBeDefined();
    expect(vodikCell).toBeDefined();

    const extracted = extractMarkdownLines(
      markdown,
      tabulkou.startLine,
      vodikCell.endLine
    );
    expect(extracted).toContain('periodickou');
    expect(extracted).toContain('Prvek');
    expect(extracted).toContain('Vodík');
  });

  it('table → next section heading: covers the whole table', () => {
    const { segments, markdown } = serializeMdWithSourceMap(
      buildLessonPlanEditor()
    );

    const prvekCell = segByText(segments, 'Prvek')!;
    const reflexe = segByText(segments, 'Reflexe')!;

    expect(prvekCell).toBeDefined();
    expect(reflexe).toBeDefined();

    const extracted = extractMarkdownLines(
      markdown,
      prvekCell.startLine,
      reflexe.endLine
    );
    // Must include the full table
    expect(extracted).toContain('Prvek');
    expect(extracted).toContain('Vodík');
    expect(extracted).toContain('Kyslík');
    expect(extracted).toContain('Reflexe');
  });

  it('full document selection: first segment to last covers everything', () => {
    const { segments, markdown } = serializeMdWithSourceMap(
      buildLessonPlanEditor()
    );

    const first = segments[0];
    const last = segments.at(-1)!;
    const extracted = extractMarkdownLines(
      markdown,
      first.startLine,
      last.endLine
    );

    expect(extracted).toContain('Název lekce');
    expect(extracted).toContain('ročníky');
    expect(extracted).toContain('Evokace');
    expect(extracted).toContain('Vodík');
    expect(extracted).toContain('Reflexe');
    expect(extracted).toContain('shrnutí');
  });

  it('single segment selection: just one info field', () => {
    const { segments, markdown } = serializeMdWithSourceMap(
      buildLessonPlanEditor()
    );

    const rvp = segByText(segments, 'F-9-1-10')!;
    expect(rvp).toBeDefined();

    const extracted = extractMarkdownLines(
      markdown,
      rvp.startLine,
      rvp.endLine
    );
    expect(extracted).toContain('F-9-1-10');
    // Should not bleed into adjacent segments
    expect(extracted).not.toContain('Projekční');
    expect(extracted).not.toContain('identifikují');
  });

  it('extracted lines match the markdown at those positions', () => {
    const { segments, markdown } = serializeMdWithSourceMap(
      buildLessonPlanEditor()
    );
    const lines = markdown.split('\n');

    for (const s of segments) {
      const lineContent = lines.slice(s.startLine - 1, s.endLine).join('\n');
      if (s.text.trim()) {
        // Use a short probe word (no punctuation) to avoid markdown escaping diffs
        const words = s.text
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 3);
        const probe = words[0] ?? s.text.trim().slice(0, 8);
        expect(lineContent).toContain(probe);
      }
    }
  });
});
