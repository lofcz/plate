/**
 * Tiny KaTeX wrapper used by both the editor renderers (`extra-plugins.tsx`)
 * and the diff preview (`diff-preview.tsx`).
 *
 * Why pull katex in here instead of using `@platejs/math`? The math package
 * comes wired to the editor's selection/void plumbing and a full
 * setNodes-driven UI for editing equations. The playground only needs to
 * render equations from already-deserialised Slate trees — there's no
 * editing surface for math here. A thin wrapper keeps the bundle slim and
 * removes a coupling to `@platejs/math`'s API surface.
 *
 * The CSS file is loaded once at module scope; subsequent KaTeX renders
 * reuse the same stylesheet without re-injection.
 */
import katex from 'katex';
import React, { createContext, useContext } from 'react';
// Side-effect import: ships the font stack + glyph metrics. Vite picks
// it up and inlines the URL references via its CSS pipeline.
import 'katex/dist/katex.min.css';
// Diff-aware overrides — strike-through that crosses through the
// rendered math glyphs, not just the wrapper span. See file header.
import './katex-render.css';

// ---------------------------------------------------------------------------
// DiffContext
//
// When an ENTIRE paragraph (or heading, or any prose container) is marked
// `delete`, its inline-math descendants don't carry their own diffOp —
// the engine word-hinted around them, treating each equation as an opaque
// unchanged token. The visual contract is still "everything inside this
// red box should look struck-through", but CSS text-decoration applied
// to a `<p>` doesn't cross into the `.katex` inline-block descendants.
//
// We solve that by having every diff-marked wrapper in `diff-preview.tsx`
// push its diff side onto this context. Each KaTeX renderer reads the
// context as a fallback for its own `diff` prop — so math inside a
// deleted paragraph picks up the delete class even though the math
// itself isn't marked.
// ---------------------------------------------------------------------------

export type DiffSide = 'insert' | 'delete' | 'update';

const DiffSideContext = createContext<DiffSide | undefined>(undefined);

export const DiffSideProvider = DiffSideContext.Provider;

const HTML_FALLBACK_STYLE: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  color: '#b91c1c',
  fontSize: '0.9em',
};

const renderKatex = (tex: string, displayMode: boolean): string => {
  // `throwOnError: false` makes katex return a styled error span instead
  // of raising — perfect for the diff playground, where partial / draft
  // equations are common and crashing the preview would be hostile.
  return katex.renderToString(tex, {
    displayMode,
    throwOnError: false,
    output: 'html',
    // Use \htmlClass support so we can target the rendered DOM in tests
    // if we ever want to assert on it from jsdom.
    strict: 'ignore',
  });
};

// Diff-side flag → wrapper class name. Kept as a tiny lookup so callers
// only pass the semantic operation type and the CSS file owns the actual
// rule selector.
const diffClassFor = (diff: DiffSide | undefined): string | undefined => {
  if (diff === 'delete') return 'katex-diff-delete';
  if (diff === 'update') return 'katex-diff-update';
  // 'insert' has no strike-through; the green background tint applied
  // by the caller is enough.
  return;
};

// Effective diff side: an explicit prop wins; otherwise we inherit
// from the surrounding DiffSideContext. `undefined` means "no diff".
const useEffectiveDiff = (own: DiffSide | undefined): DiffSide | undefined => {
  const inherited = useContext(DiffSideContext);
  return own ?? inherited;
};

export function KatexBlock({
  tex,
  style,
  diff,
}: {
  tex: string;
  style?: React.CSSProperties;
  diff?: DiffSide;
}) {
  const effective = useEffectiveDiff(diff);
  if (!tex) {
    return <span style={HTML_FALLBACK_STYLE}>(empty equation)</span>;
  }
  const html = renderKatex(tex, /* displayMode */ true);
  return (
    <div
      className={diffClassFor(effective)}
      style={style}
      // KaTeX output is sanitised by the library itself; the source is
      // a string we control (no user-supplied HTML).
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function KatexInline({
  tex,
  style,
  diff,
}: {
  tex: string;
  style?: React.CSSProperties;
  diff?: DiffSide;
}) {
  const effective = useEffectiveDiff(diff);
  if (!tex) {
    return <span style={HTML_FALLBACK_STYLE}>?</span>;
  }
  const html = renderKatex(tex, /* displayMode */ false);
  return (
    <span
      className={diffClassFor(effective)}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
