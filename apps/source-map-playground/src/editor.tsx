import React from 'react';
import {
  BoldPlugin,
  CodePlugin,
  HighlightPlugin,
  ItalicPlugin,
  KbdPlugin,
  StrikethroughPlugin,
  SubscriptPlugin,
  SuperscriptPlugin,
  UnderlinePlugin,
  BlockquotePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  HorizontalRulePlugin,
} from '@platejs/basic-nodes/react';
import { CodeBlockPlugin } from '@platejs/code-block/react';
import { ListPlugin } from '@platejs/list/react';
import { LinkPlugin } from '@platejs/link/react';
import {
  TablePlugin,
  TableRowPlugin,
  TableCellPlugin,
  TableCellHeaderPlugin,
} from '@platejs/table/react';
import { ParagraphPlugin } from 'platejs/react';
import { PlateElement } from 'platejs/react';
import { MarkdownPlugin, remarkMdx } from '@platejs/markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { lessonPlanPlugins, lessonPlanRules } from './lesson-plan';

export type {
  MarkdownSourceMapSegment,
  ResolveSelectionByPathResult,
  SelectionRange,
  SerializeMdSourceMapResult,
} from '@platejs/markdown';
export {
  deserializeMd,
  resolveSelectionByPath,
  serializeMdWithSourceMap,
} from '@platejs/markdown';

// ---------------------------------------------------------------------------
// Minimal table components (no Tailwind, no DnD, no resize)
// ---------------------------------------------------------------------------

const tableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  margin: '8px 0',
  fontSize: 13,
};

const cellStyle: React.CSSProperties = {
  border: '1px solid #d1d5db',
  padding: '6px 10px',
  verticalAlign: 'top',
  minWidth: 48,
};

const headerCellStyle: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 600,
  background: '#f9fafb',
};

function SimpleTableElement({ children, ...props }: any) {
  return (
    <PlateElement {...props} style={{ overflow: 'auto' }}>
      <table style={tableStyle}>
        <tbody>{children}</tbody>
      </table>
    </PlateElement>
  );
}

function SimpleTableRowElement({ children, ...props }: any) {
  return (
    <PlateElement {...props} as="tr">
      {children}
    </PlateElement>
  );
}

function SimpleTableCellElement({ children, ...props }: any) {
  return (
    <PlateElement {...props} as="td" style={cellStyle}>
      {children}
    </PlateElement>
  );
}

function SimpleTableCellHeaderElement({ children, ...props }: any) {
  return (
    <PlateElement {...props} as="th" style={headerCellStyle}>
      {children}
    </PlateElement>
  );
}

// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

const remarkPlugins = [remarkMath, remarkGfm, remarkMdx];

const markdownPlugin = MarkdownPlugin.configure({
  options: {
    plainMarks: ['suggestion', 'comment'],
    remarkPlugins,
    rules: lessonPlanRules,
  },
});

export const EDITOR_PLUGINS = [
  ParagraphPlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  BlockquotePlugin,
  HorizontalRulePlugin,
  CodeBlockPlugin,
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  CodePlugin,
  StrikethroughPlugin,
  SubscriptPlugin,
  SuperscriptPlugin,
  HighlightPlugin,
  KbdPlugin,
  ListPlugin,
  LinkPlugin,
  TablePlugin.withComponent(SimpleTableElement),
  TableRowPlugin.withComponent(SimpleTableRowElement),
  TableCellPlugin.withComponent(SimpleTableCellElement),
  TableCellHeaderPlugin.withComponent(SimpleTableCellHeaderElement),
  ...lessonPlanPlugins,
  markdownPlugin,
];
