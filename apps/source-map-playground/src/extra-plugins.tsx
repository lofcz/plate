import React from 'react';
import type { DiffStrategy } from '@platejs/diff';
import { KatexBlock, KatexInline } from './katex-render';
import {
  parseAttributes,
  propsToAttributes,
  type MdRules,
} from '@platejs/markdown';
import { getPluginType } from 'platejs';
import { createPlatePlugin } from 'platejs/react';

// ---------------------------------------------------------------------------
// Extra plugins for the playground: media (img/video/audio) + math
// (block equation, inline_equation). The diff engine doesn't care what
// plugins are registered — these are here purely so the EDITOR has node
// definitions and visible renderers for the preset markdown we throw at it.
//
// Diff behaviour is declared via `mediaMathDiffStrategy`, exposed at the
// bottom of this file and composed into the playground's `getDiffStrategy`
// alongside `lessonPlanDiffStrategy`.
// ---------------------------------------------------------------------------

const IMG_KEY = 'img' as const;
const VIDEO_KEY = 'video' as const;
const AUDIO_KEY = 'audio' as const;
const EQUATION_KEY = 'equation' as const;
const INLINE_EQUATION_KEY = 'inline_equation' as const;

// ---------------------------------------------------------------------------
// Rendering — intentionally minimal. No fancy lightboxes, no audio
// scrubbing UI; the playground exists to validate diff plumbing, not the
// media stack itself. Every renderer shows the resource URL inline so a
// URL change reads as a real visible diff.
// ---------------------------------------------------------------------------

const cardStyle: React.CSSProperties = {
  margin: '6px 0',
  padding: '6px 8px',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  background: '#f9fafb',
  fontSize: 12,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const ImageElement = ({ attributes, children, element }: any) => (
  <div {...attributes} style={cardStyle}>
    <div style={labelStyle}>image</div>
    <div contentEditable={false}>
      {element.url ? (
        <img
          alt={element.alt || element.caption?.[0]?.text || ''}
          src={element.url}
          style={{
            maxWidth: '100%',
            maxHeight: 200,
            display: 'block',
            margin: '4px 0',
            borderRadius: 3,
            border: '1px solid #e5e7eb',
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : null}
      <div style={{ color: '#6b7280', wordBreak: 'break-all', fontSize: 11 }}>
        {element.url || '(no url)'}
        {element.alt || element.caption?.[0]?.text
          ? ` · alt="${element.alt || element.caption?.[0]?.text}"`
          : ''}
      </div>
    </div>
    {children}
  </div>
);

const VideoElement = ({ attributes, children, element }: any) => (
  <div {...attributes} style={cardStyle}>
    <div style={labelStyle}>video</div>
    {/* Player and URL line both rendered non-editable so Slate's cursor
        stays inside the void's [{text:''}] child without intercepting
        clicks on the player controls. */}
    <div contentEditable={false}>
      {element.url ? (
        <video
          controls
          preload="metadata"
          src={element.url}
          style={{
            display: 'block',
            width: '100%',
            maxWidth: 360,
            maxHeight: 200,
            borderRadius: 3,
            background: '#000',
            margin: '4px 0',
          }}
          onError={(e) => {
            (e.currentTarget as HTMLVideoElement).style.display = 'none';
          }}
        >
          <track kind="captions" />
        </video>
      ) : null}
      <div style={{ color: '#6b7280', wordBreak: 'break-all', fontSize: 11 }}>
        {element.url || '(no url)'}
        {element.title ? ` · ${element.title}` : ''}
      </div>
    </div>
    {children}
  </div>
);

const AudioElement = ({ attributes, children, element }: any) => (
  <div {...attributes} style={cardStyle}>
    <div style={labelStyle}>audio</div>
    <div contentEditable={false}>
      {element.url ? (
        <audio
          controls
          preload="metadata"
          src={element.url}
          style={{
            display: 'block',
            width: '100%',
            maxWidth: 360,
            margin: '4px 0',
          }}
          onError={(e) => {
            (e.currentTarget as HTMLAudioElement).style.display = 'none';
          }}
        >
          <track kind="captions" />
        </audio>
      ) : null}
      <div style={{ color: '#6b7280', wordBreak: 'break-all', fontSize: 11 }}>
        {element.url || '(no url)'}
        {element.title ? ` · ${element.title}` : ''}
      </div>
    </div>
    {children}
  </div>
);

const EquationElement = ({ attributes, children, element }: any) => (
  <div
    {...attributes}
    style={{ ...cardStyle, background: '#fafaf9', borderColor: '#e7e5e4' }}
  >
    <div style={{ ...labelStyle, color: '#78716c', marginBottom: 4 }}>
      equation
    </div>
    <div contentEditable={false}>
      <KatexBlock tex={element.texExpression || ''} />
    </div>
    {children}
  </div>
);

const InlineEquationElement = ({ attributes, children, element }: any) => (
  <span
    {...attributes}
    style={{
      display: 'inline-block',
      padding: '0 2px',
      margin: '0 2px',
      borderRadius: 3,
      background: '#fef3c7',
    }}
  >
    {/* Slate inline voids: render the KaTeX output non-editable and keep
        the empty-text child for cursor bookkeeping. */}
    <span contentEditable={false}>
      <KatexInline tex={element.texExpression || ''} />
    </span>
    {children}
  </span>
);

// ---------------------------------------------------------------------------
// Plugin definitions
//
// All five are voids — they carry their payload (url, texExpression, ...)
// on the wrapper, with `[{ text: '' }]` children per Slate's contract.
// `inline_equation` is also an inline; the rest are blocks.
// ---------------------------------------------------------------------------

export const extraPlugins = [
  createPlatePlugin({
    key: IMG_KEY,
    node: { isElement: true, isVoid: true },
  }).withComponent(ImageElement),
  createPlatePlugin({
    key: VIDEO_KEY,
    node: { isElement: true, isVoid: true },
  }).withComponent(VideoElement),
  createPlatePlugin({
    key: AUDIO_KEY,
    node: { isElement: true, isVoid: true },
  }).withComponent(AudioElement),
  createPlatePlugin({
    key: EQUATION_KEY,
    node: { isElement: true, isVoid: true },
  }).withComponent(EquationElement),
  createPlatePlugin({
    key: INLINE_EQUATION_KEY,
    node: { isElement: true, isInline: true, isVoid: true },
  }).withComponent(InlineEquationElement),
];

// ---------------------------------------------------------------------------
// Markdown rules for MDX-flavoured media tags
//
// `<video src="..." />` and `<audio src="..." />` aren't real markdown, so
// remark-mdx parses them as `mdxJsxFlowElement` nodes. The default markdown
// plugin handles standard markdown image/math just fine; we only need to
// add rules for the JSX-element tags.
// ---------------------------------------------------------------------------

const mdxJsxMediaRule = (
  key: typeof VIDEO_KEY | typeof AUDIO_KEY,
  tagName: 'video' | 'audio'
): MdRules[string] => ({
  deserialize: (mdastNode: any, _deco: any, options: any) => {
    const attrs = parseAttributes(mdastNode.attributes);
    return {
      children: [{ text: '' }],
      type: getPluginType(options.editor!, key),
      ...attrs,
      // Normalise `src` → `url` so the diff engine and renderer see the
      // same prop name regardless of how the author wrote the MDX.
      ...(attrs.src && !attrs.url ? { url: attrs.src } : {}),
    };
  },
  serialize: (node: any) => {
    const { id, children, type, url, ...rest } = node;
    return {
      attributes: propsToAttributes({ src: url, ...rest }),
      children: [],
      name: tagName,
      type: 'mdxJsxFlowElement',
    };
  },
});

// VIDEO_KEY / AUDIO_KEY literally equal the mdx tag names — so the rule
// key serves double duty as both the mdast-node name (used by the
// deserializer) and the Slate element type (used by the serializer).
export const extraRules: MdRules = {
  [VIDEO_KEY]: mdxJsxMediaRule(VIDEO_KEY, 'video'),
  [AUDIO_KEY]: mdxJsxMediaRule(AUDIO_KEY, 'audio'),
};

// ---------------------------------------------------------------------------
// Diff strategies
//
// All five elements are voids → declaring them `atomic` keeps the engine
// from accidentally recursing into the empty-text child (which would emit
// a "no diff" pair with both halves clean — visually identical to the
// fallback but wastes a pairId). `atomic` makes the intent explicit.
//
// `img` is special-cased: when wrapped in a paragraph (as remark-mdx does
// for standalone images), the diff sees the paragraph at the top level
// and the strategy doesn't fire — the paragraph's child diff handles it
// naturally. The strategy here covers the case where someone manually
// places a top-level `img`.
// ---------------------------------------------------------------------------

const STRATEGIES: Record<string, DiffStrategy> = {
  [IMG_KEY]: { kind: 'atomic' },
  [VIDEO_KEY]: { kind: 'atomic' },
  [AUDIO_KEY]: { kind: 'atomic' },
  [EQUATION_KEY]: { kind: 'atomic' },
  [INLINE_EQUATION_KEY]: { kind: 'atomic' },
};

export const mediaMathDiffStrategy = (node: {
  type?: string;
}): DiffStrategy | undefined => (node.type ? STRATEGIES[node.type] : undefined);
