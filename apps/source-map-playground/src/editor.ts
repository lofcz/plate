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
import { TablePlugin } from '@platejs/table/react';
import { ParagraphPlugin } from 'platejs/react';
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
  TablePlugin,
  ...lessonPlanPlugins,
  markdownPlugin,
];
