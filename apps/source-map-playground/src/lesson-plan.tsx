import React from 'react';
import {
  convertChildrenDeserialize,
  convertNodesSerialize,
  parseAttributes,
  propsToAttributes,
  type MdRules,
} from '@platejs/markdown';
import { createSlatePlugin, getPluginType } from 'platejs';
import { createPlatePlugin } from 'platejs/react';

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const LESSON_INFO_KEY = 'lesson_info' as const;
const PHASE_KEY = 'lesson_phase' as const;
const ACTIVITY_KEY = 'lesson_activity' as const;

const INFO_GRADE_KEY = 'info_grade' as const;
const INFO_LEARNS_KEY = 'info_learns' as const;
const INFO_WHY_KEY = 'info_why' as const;
const INFO_ASSESSMENT_KEY = 'info_assessment' as const;
const INFO_RVP_KEY = 'info_rvp' as const;
const INFO_MATERIALS_KEY = 'info_materials' as const;

const INFO_FIELD_KEYS = [
  INFO_GRADE_KEY,
  INFO_LEARNS_KEY,
  INFO_WHY_KEY,
  INFO_ASSESSMENT_KEY,
  INFO_RVP_KEY,
  INFO_MATERIALS_KEY,
] as const;

type InfoFieldKey = (typeof INFO_FIELD_KEYS)[number];

// ---------------------------------------------------------------------------
// Simple rendering components
// ---------------------------------------------------------------------------

const mdxBlockStyle: React.CSSProperties = {
  borderLeft: '3px solid #93c5fd',
  margin: '4px 0',
  padding: '4px 8px',
  background: '#f0f7ff',
  fontSize: 13,
};

const mdxLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#3b82f6',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 2,
};

function MdxBlock({ label, color, children, attributes }: any) {
  return (
    <div {...attributes} style={{ ...mdxBlockStyle, borderLeftColor: color }}>
      <div data-mdx-remap style={{ ...mdxLabelStyle, color }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const PhaseElement = ({ attributes, children, element }: any) => (
  <MdxBlock
    attributes={attributes}
    label={`phase: ${element.name || '?'}`}
    color="#8b5cf6"
  >
    {children}
  </MdxBlock>
);

const ActivityElement = ({ attributes, children, element }: any) => (
  <MdxBlock
    attributes={attributes}
    label={`activity: ${element.name || '?'} (${element.duration ?? '?'}m)`}
    color="#f59e0b"
  >
    {children}
  </MdxBlock>
);

const LessonInfoElement = ({ attributes, children }: any) => (
  <MdxBlock attributes={attributes} label="lesson_info" color="#10b981">
    {children}
  </MdxBlock>
);

const InfoFieldElement = ({ attributes, children, element }: any) => (
  <div
    {...attributes}
    style={{
      padding: '2px 0 2px 12px',
      borderLeft: '2px solid #d1d5db',
      margin: '2px 0',
    }}
  >
    <span
      data-mdx-remap
      style={{ fontSize: 10, color: '#888', fontWeight: 600 }}
    >
      {element.type}
    </span>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Plugins (React, with components)
// ---------------------------------------------------------------------------

const BaseActivityPlugin = createSlatePlugin({
  key: ACTIVITY_KEY,
  node: { isElement: true },
});

const infoFieldPlugins = INFO_FIELD_KEYS.map((key) =>
  createPlatePlugin({
    key,
    node: { isElement: true },
  }).withComponent(InfoFieldElement)
);

export const lessonPlanPlugins = [
  createPlatePlugin({
    key: LESSON_INFO_KEY,
    node: { isElement: true, isContainer: true },
  }).withComponent(LessonInfoElement),
  ...infoFieldPlugins,
  createPlatePlugin({
    key: PHASE_KEY,
    node: { isElement: true, isContainer: true },
    plugins: [BaseActivityPlugin],
  }).withComponent(PhaseElement),
  createPlatePlugin({
    key: ACTIVITY_KEY,
    node: { isElement: true, isContainer: true },
  }).withComponent(ActivityElement),
];

// ---------------------------------------------------------------------------
// Markdown rules (serialize ↔ deserialize)
// ---------------------------------------------------------------------------

function infoFieldRule(key: InfoFieldKey): MdRules[string] {
  return {
    deserialize: (mdastNode: any, deco: any, options: any) => ({
      children: convertChildrenDeserialize(mdastNode.children, deco, options),
      type: getPluginType(options.editor!, key),
    }),
    serialize: (node: any, options: any) => ({
      attributes: [],
      children: convertNodesSerialize(node.children, options) as any,
      name: key,
      type: 'mdxJsxFlowElement',
    }),
  };
}

export const lessonPlanRules: MdRules = {
  [LESSON_INFO_KEY]: {
    deserialize: (mdastNode: any, deco: any, options: any) => ({
      children: convertChildrenDeserialize(mdastNode.children, deco, options),
      type: getPluginType(options.editor!, LESSON_INFO_KEY),
    }),
    serialize: (node: any, options: any) => ({
      attributes: [],
      children: convertNodesSerialize(node.children, options) as any,
      name: 'lesson_info',
      type: 'mdxJsxFlowElement',
    }),
  },
  ...Object.fromEntries(
    INFO_FIELD_KEYS.map((key) => [key, infoFieldRule(key)])
  ),
  phase: {
    deserialize: (mdastNode: any, deco: any, options: any) => ({
      children: convertChildrenDeserialize(
        mdastNode.children,
        deco,
        options
      ) as any,
      type: getPluginType(options.editor!, PHASE_KEY),
      ...parseAttributes(mdastNode.attributes),
    }),
  },
  [PHASE_KEY]: {
    serialize: (node: any, options: any) => {
      const { id, children, type, ...rest } = node;
      return {
        attributes: propsToAttributes({ name: rest.name }),
        children: convertNodesSerialize(children, options) as any,
        name: 'phase',
        type: 'mdxJsxFlowElement',
      };
    },
  },
  activity: {
    deserialize: (mdastNode: any, deco: any, options: any) => ({
      children: convertChildrenDeserialize(
        mdastNode.children,
        deco,
        options
      ) as any,
      type: getPluginType(options.editor!, ACTIVITY_KEY),
      ...parseAttributes(mdastNode.attributes),
    }),
  },
  [ACTIVITY_KEY]: {
    serialize: (node: any, options: any) => {
      const { id, children, type, resource, ...rest } = node;
      return {
        attributes: propsToAttributes({
          name: rest.name,
          duration: rest.duration,
          ...(resource ? { resource } : {}),
        }),
        children: convertNodesSerialize(children, options) as any,
        name: 'activity',
        type: 'mdxJsxFlowElement',
      };
    },
  },
};
