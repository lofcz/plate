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

import {
  DiffSideProvider,
  KatexBlock,
  KatexInline,
  type DiffSide,
} from './katex-render';

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

// ---------------------------------------------------------------------------
// Diff palette
//
// Three concerns interlock and must stay consistent:
//   1. text-decoration thickness for prose (browsers default to a font-
//      relative value — we pin it to 1px so it matches the line we draw
//      across math via gradient).
//   2. text color tint — text inside a delete block leans red, inside an
//      insert block leans green. Slight enough to remain readable on the
//      pale tinted background, distinct enough to read at a glance.
//   3. The same red/green hue is used for the math overlay line (set in
//      katex-render.css) so visually the strike continues seamlessly
//      between prose and equations.
// ---------------------------------------------------------------------------

const DELETE_TEXT = '#b91c1c'; // red-700: text + math overlay line
const INSERT_TEXT = '#047857'; // emerald-700
const UPDATE_TEXT = '#b45309'; // amber-700

const STRIKE_PROPS: React.CSSProperties = {
  textDecorationLine: 'line-through',
  textDecorationThickness: 1,
  textDecorationSkipInk: 'none',
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
    // marginTop/marginBottom (not the `margin` shorthand) because callers
    // compose this with their own marginLeft for nested-list indentation;
    // the shorthand would silently reset that to 0.
    marginTop: 2,
    marginBottom: 2,
    borderLeftWidth: 4,
    borderLeftStyle: 'solid',
    borderLeftColor: pairColor(pairId),
  };
  if (type === 'insert')
    return {
      ...base,
      background: '#ecfdf5',
      borderLeftColor: '#10b981',
      color: INSERT_TEXT,
    };
  if (type === 'delete')
    return {
      ...base,
      background: '#fef2f2',
      borderLeftColor: '#ef4444',
      color: DELETE_TEXT,
      ...STRIKE_PROPS,
      textDecorationColor: DELETE_TEXT,
    };
  return {
    ...base,
    background: '#fffbeb',
    borderLeftColor: '#f59e0b',
    color: UPDATE_TEXT,
  };
};

const diffLeafStyle = (
  type: 'insert' | 'delete' | 'update' | undefined
): React.CSSProperties => {
  if (!type) return {};
  if (type === 'insert')
    return {
      background: 'rgba(16, 185, 129, 0.22)',
      color: INSERT_TEXT,
      borderRadius: 2,
      padding: '0 1px',
    };
  if (type === 'delete')
    return {
      background: 'rgba(239, 68, 68, 0.18)',
      color: DELETE_TEXT,
      borderRadius: 2,
      padding: '0 1px',
      ...STRIKE_PROPS,
      textDecorationColor: DELETE_TEXT,
    };
  return {
    background: 'rgba(245, 158, 11, 0.12)',
    color: UPDATE_TEXT,
    borderBottom: `1px dotted ${UPDATE_TEXT}`,
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

// ---------------------------------------------------------------------------
// Indent-based list markers (diff-aware)
//
// The @platejs/list plugin emits list "items" as paragraphs decorated with
// `listStyleType` ('disc' | 'decimal' | 'todo') and `indent` (1, 2, 3, ...)
// rather than as `ul>li` trees. Computing the right marker requires sibling
// context (decimal needs the position-in-run, todo needs `checked`) which
// `RenderElement` doesn't have on its own. We pre-walk the top-level node
// list once in `DiffPreview` and stamp a synthetic `_marker` onto each list
// item, which the paragraph branch then prepends to the rendered output.
//
// DIFF NUMBERING RULES
// --------------------
// A diff output interleaves three kinds of nodes inside the same list run:
//   1. Unchanged items (no diffOperation)             — exist on BOTH sides
//   2. Insert halves   (diffOperation.type='insert')  — exist on NEW side only
//   3. Delete halves   (diffOperation.type='delete')  — exist on OLD side only
// Naively counting 1,2,3,4,... across the rendered output is wrong: a
// delete+insert pair occupies the SAME logical slot in the user's mental
// model (the line that "changed"), so both halves should show the same
// number, not consecutive numbers.
//
// We solve this with two parallel counters per list run:
//   - `oldCounter` ticks for items that existed in the old doc:
//     unchanged + delete.
//   - `newCounter` ticks for items that exist in the new doc:
//     unchanged + insert.
// The displayed number is `newCounter` for unchanged / insert halves,
// `oldCounter` for delete halves. With insert-first ordering, the insert
// at position N in NEW ticks `newCounter` to N, then the matching delete
// at position N in OLD ticks `oldCounter` to N — both display N. Subsequent
// unchanged items tick both back into lockstep so the count picks back up
// cleanly. The delete-first ordering produces the same numbers in a
// symmetric way.
//
// COUNTER RESET RULES (preserved from the pre-diff version):
//   - Crossing a non-list block resets all counters.
//   - Switching listStyleType at the same indent resets that indent's
//     counter (a bullet item between two ordered items splits the count).
//   - Popping back from a deeper indent resets the deeper counter (so
//     1, 1.a, 1.b, 2, 2.a all start fresh).
//
// AUTHORED START NUMBERS
// ----------------------
// The markdown deserializer stamps `listStart` on every ordered list item
// — `4. test` parses to `{ listStart: 4 }`, the next item to `listStart: 5`,
// and so on. When `listStart` is present we trust it directly as the
// displayed number. That way "4. test / 5. sad / 6. dad" renders as
// 4, 5, 6 — not 1, 2, 3 — and the diff-side semantics still work because
// each diff half carries `listStart` from its OWN document (delete halves
// have OLD numbers, insert/unchanged halves have NEW numbers).
//
// The dual-counter logic below remains as a fallback for hand-authored
// fixtures (older tests) where `listStart` is omitted.
// ---------------------------------------------------------------------------

type ListMarker =
  | { kind: 'disc' }
  | { kind: 'decimal'; index: number }
  | { kind: 'todo'; checked: boolean };

const isListItem = (n: any): boolean =>
  n &&
  (n.type === 'p' || n.type === 'paragraph') &&
  typeof n.listStyleType === 'string';

// "ListSide" describes which document(s) a list item is present in,
// used purely to drive the dual-counter numbering below. NOT the same
// thing as `DiffSide` from katex-render (which is the insert/delete/
// update operation kind).
type ListSide = 'both' | 'new' | 'old';

const sideOf = (node: any): ListSide => {
  const t = node?.diffOperation?.type as string | undefined;
  if (t === 'insert') return 'new';
  if (t === 'delete') return 'old';
  return 'both';
};

const stampListMarkers = (nodes: any[]): void => {
  // One pair of counters per (indent, listStyleType) run. Stored together
  // so that incrementing one side never accidentally touches the other.
  type Counters = { old: number; new: number };
  const counters = new Map<string, Counters>();
  let lastIndent = 0;
  let lastStyle = '';

  const keyFor = (indent: number, style: string): string =>
    `${indent}::${style}`;

  const get = (k: string): Counters => {
    const existing = counters.get(k);
    if (existing) return existing;
    const fresh: Counters = { old: 0, new: 0 };
    counters.set(k, fresh);
    return fresh;
  };

  for (const node of nodes) {
    if (!isListItem(node)) {
      counters.clear();
      lastIndent = 0;
      lastStyle = '';
      continue;
    }

    const indent: number = node.indent ?? 1;
    const style: string = node.listStyleType;

    // Popping back from a deeper indent or switching style at the same
    // indent invalidates the deeper / sibling-style counters.
    if (indent < lastIndent) {
      for (const k of [...counters.keys()]) {
        const [d] = k.split('::');
        if (Number(d) > indent) counters.delete(k);
      }
    }
    if (indent === lastIndent && style !== lastStyle) {
      counters.delete(keyFor(indent, lastStyle));
    }

    const side = sideOf(node);

    if (style === 'decimal') {
      const c = get(keyFor(indent, style));
      // Tick whichever counter(s) the diff side participates in.
      if (side !== 'new') c.old += 1; // unchanged + delete tick old
      if (side !== 'old') c.new += 1; // unchanged + insert tick new
      // Prefer the authored `listStart` from the markdown — that's how
      // we render "4." for `4. test` instead of resetting to "1.". Falls
      // back to the dual-counter when listStart is absent (hand-built
      // test fixtures predate the markdown pipeline).
      const explicit =
        typeof node.listStart === 'number' ? (node.listStart as number) : null;
      const fallback = side === 'old' ? c.old : c.new;
      const index = explicit !== null ? explicit : fallback;
      node._marker = { kind: 'decimal', index } satisfies ListMarker;
    } else if (style === 'todo') {
      node._marker = {
        kind: 'todo',
        checked: Boolean(node.checked),
      } satisfies ListMarker;
    } else {
      // 'disc' or any unknown bullet style.
      node._marker = { kind: 'disc' } satisfies ListMarker;
    }

    lastIndent = indent;
    lastStyle = style;
  }
};

const renderListMarker = (marker: ListMarker): React.ReactNode => {
  if (marker.kind === 'decimal') return `${marker.index}.`;
  if (marker.kind === 'todo') return marker.checked ? '☑' : '☐';
  return '•';
};

function RenderElement({ node }: { node: AnyNode }) {
  const type = (node as any).type as string | undefined;
  const children = ((node as any).children as any[]) ?? [];
  const diffOp = (node as any).diffOperation as
    | { type: 'insert' | 'delete' | 'update' }
    | undefined;
  const pairId = (node as any).pairId as string | undefined;
  const blockStyle = diffBlockStyle(diffOp?.type, pairId);

  // Push the current diff side down so KaTeX descendants can pick it up
  // even when they don't carry their own diffOp (e.g. an unchanged
  // inline equation inside a deleted prose paragraph). `undefined`
  // contexts intentionally don't reset an outer context — a deleted
  // grandparent should still strike through a nested unchanged math
  // descendant, which matches the visual contract.
  const rawInner = renderChildren(children);
  const inner: React.ReactNode = diffOp ? (
    <DiffSideProvider value={diffOp.type as DiffSide}>
      {rawInner}
    </DiffSideProvider>
  ) : (
    rawInner
  );

  switch (type) {
    case 'p':
    case 'paragraph': {
      // Indent-based list item? `stampListMarkers` walked the top-level
      // sibling list before render and stuck a `_marker` on each item.
      const marker = (node as any)._marker as ListMarker | undefined;
      if (marker) {
        const indent: number = (node as any).indent ?? 1;
        const isTodo = marker.kind === 'todo';
        const checked = isTodo && (marker as any).checked === true;
        // Completed-todo styling (strikethrough + muted color) is the
        // "this task is done" look from a normal todo list. In a diff
        // context that visual cue collides with the diff convention
        // (strikethrough == deletion, color tint == diff side). An
        // INSERTED checked todo styled as "completed" reads as deleted;
        // an inserted checked todo styled in muted gray loses the
        // insert-green text tint. So we only apply the completed-task
        // look on unchanged items — the ☑ glyph still carries the
        // checked state for diff halves, and the block-level diff
        // styling (red bg + strikethrough for delete, green bg for
        // insert) wins for the diff side.
        const showCompletedStyle = isTodo && checked && !diffOp;
        // NB: don't use the `margin` shorthand here — it would reset
        // marginLeft to 0 and silently kill the nested-list indentation.
        // Bumped per-level step to 28px (≈ CommonMark renderers like
        // GitHub use ~2em) so nested items read as visibly nested rather
        // than barely offset from the parent.
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              marginTop: 2,
              marginBottom: 2,
              marginLeft: (indent - 1) * 28,
              lineHeight: 1.45,
              ...blockStyle,
            }}
          >
            <span
              style={{
                color: '#6b7280',
                fontFamily:
                  marker.kind === 'decimal'
                    ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
                    : undefined,
                minWidth: marker.kind === 'decimal' ? 22 : 12,
                textAlign: marker.kind === 'decimal' ? 'right' : 'center',
                userSelect: 'none',
                opacity: 0.8,
              }}
            >
              {renderListMarker(marker)}
            </span>
            <span
              style={{
                flex: 1,
                textDecoration: showCompletedStyle ? 'line-through' : undefined,
                color: showCompletedStyle ? '#6b7280' : undefined,
              }}
            >
              {inner}
            </span>
          </div>
        );
      }
      return (
        <p style={{ margin: '4px 0', lineHeight: 1.45, ...blockStyle }}>
          {inner}
        </p>
      );
    }
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
    case 'equation': {
      // Block math void. The LaTeX source lives on `texExpression`; the
      // single `{text:''}` child is just Slate's void contract. We hand
      // the source to KaTeX which produces real typeset math. The
      // `diff` prop on KatexBlock applies strike-through (delete) /
      // dotted underline (update) DIRECTLY to the `.katex` element,
      // since CSS text-decoration doesn't propagate into inline-block
      // descendants (which is what `.katex` is).
      const tex = (node as any).texExpression ?? '';
      return (
        <div
          style={{
            margin: '8px 0',
            padding: '8px 12px',
            borderRadius: 4,
            ...blockStyle,
          }}
        >
          <KatexBlock tex={tex} diff={diffOp?.type} />
        </div>
      );
    }
    case 'inline_equation': {
      // Inline void: KaTeX inline mode keeps the math on the same line
      // as surrounding prose. The wrapper span carries the background
      // tint; the `diff` prop on KatexInline reaches inside .katex to
      // strike-through the glyphs themselves. Note we DROP the wrapper
      // `textDecoration: line-through` we previously had for delete —
      // the CSS rule handles that now, and a double-strike (wrapper +
      // glyph) would draw two parallel lines.
      const tex = (node as any).texExpression ?? '';
      // KaTeX-rendered glyphs inherit the wrapper's `color`, so setting
      // it here tints the math itself — not just the background. This
      // is what gives the math its red/green tint matching the prose.
      const tint: React.CSSProperties = diffOp
        ? diffOp.type === 'insert'
          ? {
              background: 'rgba(16, 185, 129, 0.22)',
              color: INSERT_TEXT,
              borderRadius: 2,
              padding: '0 2px',
            }
          : diffOp.type === 'delete'
            ? {
                background: 'rgba(239, 68, 68, 0.18)',
                color: DELETE_TEXT,
                borderRadius: 2,
                padding: '0 2px',
              }
            : {
                background: 'rgba(245, 158, 11, 0.18)',
                color: UPDATE_TEXT,
                borderRadius: 2,
                padding: '0 2px',
              }
        : {};
      return (
        <span style={{ margin: '0 1px', ...tint }}>
          <KatexInline tex={tex} diff={diffOp?.type} />
          {/* Render the void child for Slate compatibility (invisible). */}
          <span style={{ display: 'none' }}>{inner}</span>
        </span>
      );
    }
    case 'img': {
      // remark wraps standalone images in a paragraph; `inner` here is
      // just the void's empty text node. We render the real <img> using
      // attributes from the wrapper.
      const url = (node as any).url as string | undefined;
      const alt = (node as any).alt ?? (node as any).caption?.[0]?.text ?? '';
      return (
        <div
          style={{
            margin: '4px 0',
            display: 'inline-block',
            verticalAlign: 'top',
            maxWidth: '100%',
            ...blockStyle,
          }}
        >
          {url ? (
            <img
              alt={alt}
              src={url}
              style={{
                display: 'block',
                maxWidth: 240,
                maxHeight: 160,
                borderRadius: 3,
                border: '1px solid #e5e7eb',
              }}
              // Silently swallow broken-image errors — the URLs in the
              // presets point to example.com and won't actually load.
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : null}
          <div
            style={{
              fontSize: 11,
              color: '#6b7280',
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              wordBreak: 'break-all',
              marginTop: 2,
            }}
          >
            {url ?? '(no url)'}
            {alt ? ` · "${alt}"` : ''}
          </div>
          {/* Render the void child for Slate compatibility (invisible). */}
          <span style={{ display: 'none' }}>{inner}</span>
        </div>
      );
    }
    case 'video':
    case 'audio': {
      // Media voids: render the actual HTML5 player AND the URL beneath
      // it. The URL text is what makes URL-change diffs visible — KaTeX-
      // style pretty rendering of the player itself doesn't expose URL
      // changes. Broken-URL handling (`onError`) hides the player but
      // keeps the URL line so even unloadable media (example.com) still
      // diffs cleanly.
      const url = (node as any).url ?? (node as any).src;
      const isVideo = type === 'video';
      const accentBg = isVideo ? '#eef2ff' : '#fdf4ff';
      const accentBorder = isVideo ? '#c7d2fe' : '#f0abfc';
      const accentText = isVideo ? '#4338ca' : '#a21caf';
      return (
        <div
          style={{
            margin: '6px 0',
            padding: '6px 10px',
            background: accentBg,
            border: `1px solid ${accentBorder}`,
            borderRadius: 4,
            fontSize: 12,
            ...blockStyle,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: accentText,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {isVideo ? '▶ video' : '♪ audio'}
            </span>
          </div>
          {url ? (
            isVideo ? (
              <video
                controls
                preload="metadata"
                src={url}
                style={{
                  display: 'block',
                  width: '100%',
                  maxWidth: 360,
                  maxHeight: 200,
                  borderRadius: 3,
                  background: '#000',
                }}
                // Hide the player frame on load error (example.com URLs
                // in presets won't actually load). The URL line below
                // stays visible so the diff is still readable.
                onError={(e) => {
                  (e.currentTarget as HTMLVideoElement).style.display = 'none';
                }}
              >
                <track kind="captions" />
              </video>
            ) : (
              <audio
                controls
                preload="metadata"
                src={url}
                style={{ display: 'block', width: '100%', maxWidth: 360 }}
                onError={(e) => {
                  (e.currentTarget as HTMLAudioElement).style.display = 'none';
                }}
              >
                <track kind="captions" />
              </audio>
            )
          ) : null}
          <div
            style={{
              marginTop: url ? 4 : 0,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              color: '#374151',
              wordBreak: 'break-all',
              fontSize: 11,
            }}
          >
            {url ?? '(no url)'}
          </div>
          {/* Void child kept for Slate compatibility (invisible). */}
          <span style={{ display: 'none' }}>{inner}</span>
        </div>
      );
    }
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

// Container element types whose immediate children participate in the
// indent-based list flow — so a list nested inside a `<phase>` or info
// field still gets bullets/numbers/checkboxes rendered. Adding a new MDX
// container plugin? Add its type here too.
const LIST_AWARE_CONTAINERS = new Set([
  'lesson_phase',
  'lesson_activity',
  'lesson_info',
  'info_grade',
  'info_learns',
  'info_why',
  'info_assessment',
  'info_rvp',
  'info_materials',
  'blockquote',
]);

const stampMarkersRecursively = (nodes: any[]): void => {
  stampListMarkers(nodes);
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    const t = node.type as string | undefined;
    if (t && LIST_AWARE_CONTAINERS.has(t) && Array.isArray(node.children)) {
      stampMarkersRecursively(node.children);
    }
  }
};

// Run-level grouping + run-scope word hinting now live in `@platejs/diff`
// itself, behind the `groupConsecutiveChanges` and `runScopeWordHints`
// options of `computeDiff` (see `groupRunsAndRehintWords`). This component
// therefore receives an already-regrouped, already-rehinted tree and only
// needs to stamp list markers for rendering. Keeping the transform engine-
// side means downstream consumers (suggestion plugin, AI accept/reject
// UI, anything else calling `computeDiff` from outside the playground)
// get the same behaviour for free.

export function DiffPreview({ nodes }: { nodes: AnyNode[] }) {
  if (!nodes || nodes.length === 0) {
    return (
      <div style={{ color: '#9ca3af', fontStyle: 'italic', padding: 8 }}>
        (no diff — inputs match)
      </div>
    );
  }
  // Side-effecting walk: stamps `_marker` on each list-item paragraph so
  // the renderer below can show real bullets/numbers/checkboxes. Done at
  // the entry point so we visit the tree exactly once per render. The
  // engine's regrouped output is in its final document order before we
  // get here, so the marker counters see the same sequence the user does.
  stampMarkersRecursively(nodes as any[]);
  return (
    <div style={{ fontSize: 14, fontFamily: 'system-ui, sans-serif' }}>
      {nodes.map((n, i) => (
        <RenderElement key={i} node={n} />
      ))}
    </div>
  );
}
