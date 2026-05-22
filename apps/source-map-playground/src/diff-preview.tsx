/**
 * Custom React renderer for the Slate-tree output of `computeDiff`.
 *
 * Why not use a real Plate editor here? Mostly because we want total control
 * over how diff marks are visualised: red strikethrough on deletes, green
 * background on inserts, dotted underline on `update` props. A Plate editor
 * would need a custom leaf plugin per mark which is more code than this
 * direct renderer (~150 lines) and harder to tweak when iterating on the
 * visual design.
 *
 * Only the element types we actually exercise in `diff-values.ts` are
 * supported. Anything else falls back to a labelled `<div>` so we still see
 * the content (just unstyled) rather than crashing.
 */

import React from 'react';

type AnyNode = Record<string, unknown>;

const isText = (n: AnyNode): boolean => typeof (n as any).text === 'string';

const pairColor = (pairId: string | undefined): string => {
  if (!pairId) return '#999';
  // Map pairId to a stable hue so paired blocks are visually grouped without
  // hard-coding colours per pair.
  let hash = 0;
  for (let i = 0; i < pairId.length; i++) {
    hash = (hash * 31 + pairId.charCodeAt(i)) & 0xff_ff_ff_ff;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
};

const diffBlockStyle = (
  type: 'insert' | 'delete' | 'update' | undefined,
  pairId: string | undefined
): React.CSSProperties => {
  if (!type) return {};

  const base: React.CSSProperties = {
    position: 'relative',
    paddingLeft: 10,
    paddingRight: 6,
    paddingTop: 2,
    paddingBottom: 2,
    margin: '2px 0',
    borderLeftWidth: 4,
    borderLeftStyle: 'solid',
    borderLeftColor: pairColor(pairId),
  };
  if (type === 'insert')
    return { ...base, background: '#ecfdf5', borderLeftColor: '#10b981' };
  if (type === 'delete')
    return {
      ...base,
      background: '#fef2f2',
      borderLeftColor: '#ef4444',
      textDecoration: 'line-through',
      opacity: 0.85,
    };
  return { ...base, background: '#fffbeb', borderLeftColor: '#f59e0b' };
};

const diffLeafStyle = (
  type: 'insert' | 'delete' | 'update' | undefined
): React.CSSProperties => {
  if (!type) return {};
  if (type === 'insert')
    return {
      background: 'rgba(16, 185, 129, 0.22)',
      borderRadius: 2,
      padding: '0 1px',
    };
  if (type === 'delete')
    return {
      background: 'rgba(239, 68, 68, 0.18)',
      borderRadius: 2,
      padding: '0 1px',
      textDecoration: 'line-through',
    };
  return {
    borderBottom: '1px dotted #f59e0b',
    background: 'rgba(245, 158, 11, 0.12)',
  };
};

function renderLeaf(node: AnyNode, key: React.Key): React.ReactNode {
  const text = (node as any).text as string;
  if (text === '') {
    // Slate requires empty text nodes between voids — keep a zero-width span
    // so the layout still flows.
    return <span key={key} />;
  }

  let content: React.ReactNode = text;
  if ((node as any).code)
    content = (
      <code
        style={{
          background: '#f3f4f6',
          padding: '0 3px',
          borderRadius: 3,
          fontSize: '0.95em',
        }}
      >
        {content}
      </code>
    );
  if ((node as any).bold) content = <strong>{content}</strong>;
  if ((node as any).italic) content = <em>{content}</em>;
  if ((node as any).underline) content = <u>{content}</u>;
  if ((node as any).strikethrough) content = <s>{content}</s>;
  if ((node as any).kbd)
    content = (
      <kbd
        style={{
          background: '#f3f4f6',
          border: '1px solid #d1d5db',
          borderRadius: 3,
          padding: '0 4px',
          fontFamily: 'monospace',
          fontSize: '0.85em',
        }}
      >
        {content}
      </kbd>
    );
  if ((node as any).highlight)
    content = (
      <mark style={{ background: '#fde68a', padding: '0 1px' }}>{content}</mark>
    );

  const diffOp = (node as any).diffOperation as
    | { type: 'insert' | 'delete' | 'update'; newProperties?: unknown }
    | undefined;

  if (diffOp) {
    return (
      <span key={key} style={diffLeafStyle(diffOp.type)}>
        {content}
      </span>
    );
  }
  return <span key={key}>{content}</span>;
}

function renderChildren(children: any[]): React.ReactNode {
  return children.map((child, i) => {
    if (isText(child)) return renderLeaf(child, i);
    return <RenderElement key={i} node={child} />;
  });
}

function RenderElement({ node }: { node: AnyNode }) {
  const type = (node as any).type as string | undefined;
  const children = ((node as any).children as any[]) ?? [];
  const diffOp = (node as any).diffOperation as
    | { type: 'insert' | 'delete' | 'update' }
    | undefined;
  const pairId = (node as any).pairId as string | undefined;
  const blockStyle = diffBlockStyle(diffOp?.type, pairId);

  const inner = renderChildren(children);

  switch (type) {
    case 'p':
    case 'paragraph':
      return (
        <p style={{ margin: '4px 0', lineHeight: 1.45, ...blockStyle }}>
          {inner}
        </p>
      );
    case 'h1':
      return (
        <h1 style={{ fontSize: 22, margin: '12px 0 6px', ...blockStyle }}>
          {inner}
        </h1>
      );
    case 'h2':
      return (
        <h2 style={{ fontSize: 18, margin: '10px 0 6px', ...blockStyle }}>
          {inner}
        </h2>
      );
    case 'h3':
      return (
        <h3 style={{ fontSize: 16, margin: '8px 0 4px', ...blockStyle }}>
          {inner}
        </h3>
      );
    case 'blockquote':
      return (
        <blockquote
          style={{
            margin: '4px 0',
            padding: '4px 12px',
            borderLeft: '3px solid #d1d5db',
            color: '#4b5563',
            ...blockStyle,
          }}
        >
          {inner}
        </blockquote>
      );
    case 'ul':
      return (
        <ul style={{ paddingLeft: 24, margin: '4px 0', ...blockStyle }}>
          {inner}
        </ul>
      );
    case 'ol':
      return (
        <ol style={{ paddingLeft: 24, margin: '4px 0', ...blockStyle }}>
          {inner}
        </ol>
      );
    case 'li':
      return <li style={blockStyle}>{inner}</li>;
    case 'lic':
      // platejs list-content wrapper
      return <span style={blockStyle}>{inner}</span>;
    case 'code_block':
      return (
        <pre
          style={{
            background: '#0f172a',
            color: '#f1f5f9',
            padding: 10,
            borderRadius: 4,
            fontSize: 12,
            overflow: 'auto',
            margin: '6px 0',
            ...blockStyle,
          }}
        >
          <code>
            {children
              .map((c: any) =>
                (c.children ?? []).map((g: any) => g.text ?? '').join('')
              )
              .join('\n')}
          </code>
        </pre>
      );
    case 'code_line':
      return <span>{`${inner}\n`}</span>;
    case 'hr':
      return (
        <hr
          style={{ border: 0, borderTop: '1px solid #e5e7eb', ...blockStyle }}
        />
      );
    case 'a':
      return (
        <a href={(node as any).url} style={{ color: '#2563eb' }}>
          {inner}
        </a>
      );
    case 'table':
      return (
        <table
          style={{
            borderCollapse: 'collapse',
            margin: '6px 0',
            fontSize: 13,
            ...blockStyle,
          }}
        >
          <tbody>{inner}</tbody>
        </table>
      );
    case 'tr':
      return <tr>{inner}</tr>;
    case 'td':
      return (
        <td
          style={{
            border: '1px solid #d1d5db',
            padding: '4px 8px',
            verticalAlign: 'top',
          }}
        >
          {inner}
        </td>
      );
    case 'th':
      return (
        <th
          style={{
            border: '1px solid #d1d5db',
            padding: '4px 8px',
            background: '#f9fafb',
            fontWeight: 600,
          }}
        >
          {inner}
        </th>
      );
    // MDX blocks from the lesson plan plugin
    case 'lesson_info':
      return (
        <div
          style={{
            border: '1px dashed #10b981',
            borderRadius: 4,
            padding: 8,
            margin: '6px 0',
            background: '#ecfdf5',
            ...blockStyle,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#10b981',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            lesson_info
          </div>
          {inner}
        </div>
      );
    case 'lesson_phase':
      return (
        <div
          style={{
            border: '1px dashed #8b5cf6',
            borderRadius: 4,
            padding: 8,
            margin: '6px 0',
            background: '#f5f3ff',
            ...blockStyle,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#8b5cf6',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            phase: {(node as any).name ?? '?'}
          </div>
          {inner}
        </div>
      );
    case 'lesson_activity':
      return (
        <div
          style={{
            border: '1px dashed #f59e0b',
            borderRadius: 4,
            padding: 8,
            margin: '6px 0',
            background: '#fffbeb',
            ...blockStyle,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#f59e0b',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            activity: {(node as any).name ?? '?'} ·{' '}
            {(node as any).duration ?? '?'}m
          </div>
          {inner}
        </div>
      );
    default: {
      // Unknown element — render generically with the type label so we can
      // tell at a glance which plugin came through.
      const isInfoField = type?.startsWith('info_');
      return (
        <div
          style={{
            border: isInfoField ? '1px dotted #93c5fd' : '1px dotted #d1d5db',
            borderRadius: 3,
            padding: '3px 6px',
            margin: '2px 0',
            ...blockStyle,
          }}
        >
          {type ? (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#6b7280',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {type}
            </span>
          ) : null}{' '}
          {inner}
        </div>
      );
    }
  }
}

export function DiffPreview({ nodes }: { nodes: AnyNode[] }) {
  if (!nodes || nodes.length === 0) {
    return (
      <div style={{ color: '#9ca3af', fontStyle: 'italic', padding: 8 }}>
        (no diff — inputs match)
      </div>
    );
  }
  return (
    <div style={{ fontSize: 14, fontFamily: 'system-ui, sans-serif' }}>
      {nodes.map((n, i) => (
        <RenderElement key={i} node={n} />
      ))}
    </div>
  );
}
