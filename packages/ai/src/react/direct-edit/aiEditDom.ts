import type { Path, SlateEditor, TRange } from 'platejs';

import { NodeApi, TextApi } from 'platejs';

import type { AIChange, AIChangeLedger } from './aiChanges';
import type { AIEditTextSpan } from './diffAIEdit';

const STYLE_ATTRIBUTE = 'data-plate-ai-edit-styles';

export const AI_HIGHLIGHT = {
  change: 'plate-ai-change',
  pending: 'plate-ai-pending',
  trail: ['plate-ai-trail-1', 'plate-ai-trail-2', 'plate-ai-trail-3'],
} as const;

const CSS_TEXT = `
[data-ai-change],[data-ai-change-removed]{--plate-ai-bar:0 0 transparent;--plate-ai-cut:0 0 transparent;box-shadow:var(--plate-ai-bar),var(--plate-ai-cut);transition:background-color .6s ease,box-shadow .6s ease}
[data-ai-change]{border-radius:4px}
[data-ai-change="new"]{background-color:rgb(139 92 246/.075);--plate-ai-bar:-7px 0 0 -4px rgb(139 92 246/.9)}
[data-ai-change="new"] [data-ai-change="new"]{background-color:transparent}
[data-ai-change="seen"]:hover,[data-ai-change][data-ai-change-active]{--plate-ai-bar:-7px 0 0 -4px rgb(139 92 246/.45)}
[data-ai-change-removed="before"]{--plate-ai-cut:0 -5px 0 -3px rgb(244 63 94/.7)}
[data-ai-change-removed="after"]{--plate-ai-cut:0 5px 0 -3px rgb(244 63 94/.7)}
::highlight(${AI_HIGHLIGHT.change}){background-color:rgb(139 92 246/.18)}
::highlight(${AI_HIGHLIGHT.pending}){color:transparent}
::highlight(${AI_HIGHLIGHT.trail[0]}){background-color:rgb(139 92 246/.34);color:#6d28d9}
::highlight(${AI_HIGHLIGHT.trail[1]}){background-color:rgb(139 92 246/.2)}
::highlight(${AI_HIGHLIGHT.trail[2]}){background-color:rgb(139 92 246/.09)}
[data-ai-edit-ghost]{position:fixed;pointer-events:none;z-index:40;margin:0;overflow:hidden;border-radius:6px;background:rgb(244 63 94/.05);transform-origin:top center}
[data-ai-edit-ghost] *{text-decoration-line:line-through!important;text-decoration-color:rgb(244 63 94/.55)!important;text-decoration-thickness:1.5px!important}
[data-ai-edit-caret]{position:fixed;z-index:51;pointer-events:none;width:2px;border-radius:2px;background:#8b5cf6;box-shadow:0 0 10px rgb(139 92 246/.7);display:none}
[data-ai-edit-caret]::before{content:"";position:absolute;right:2px;top:12%;height:76%;width:64px;border-radius:999px 0 0 999px;background:linear-gradient(to left,rgb(139 92 246/.32),rgb(56 189 248/.12) 55%,transparent);filter:blur(3px)}
[data-ai-edit-caret]>span{position:absolute;bottom:100%;left:0;margin-bottom:3px;white-space:nowrap;background:linear-gradient(110deg,#7c3aed,#6366f1);color:#fff;border-radius:6px 6px 6px 0;padding:3px 8px;font:600 11px/1.4 system-ui,sans-serif;box-shadow:0 3px 14px rgb(124 58 237/.25)}
[data-ai-change-chip]{position:fixed;z-index:60;display:flex;align-items:center;gap:2px;padding:3px;border-radius:9px;background:Canvas;color:CanvasText;box-shadow:0 6px 20px rgb(15 23 42/.14),0 0 0 1px rgb(15 23 42/.08);font:500 12px/1 system-ui,sans-serif;transform:translate(-100%,calc(-100% - 6px));animation:plate-ai-chip-in .14s ease-out}
[data-ai-change-chip] [data-chip-label]{padding:6px 8px;color:#7c3aed;font-weight:600;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-ai-change-chip] button{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:6px 9px;border-radius:6px}
[data-ai-change-chip] button:hover,[data-ai-change-chip] button:focus-visible{background:rgb(139 92 246/.1)}
[data-ai-change-chip] button[data-action="reject"]:hover,[data-ai-change-chip] button[data-action="reject"]:focus-visible{background:rgb(244 63 94/.1);color:#be123c}
[data-ai-change-chip][data-placement="below"]{transform:translate(-100%,6px);animation:none}
@keyframes plate-ai-chip-in{from{opacity:0;transform:translate(-100%,calc(-100% - 2px))}}
@media (prefers-reduced-motion:reduce){[data-ai-change],[data-ai-change-removed]{transition:none}[data-ai-change-chip]{animation:none}}
`;

export function ensureAIEditStyles(doc: Document) {
  if (doc.head.querySelector(`style[${STYLE_ATTRIBUTE}]`)) return;
  const style = doc.createElement('style');
  style.setAttribute(STYLE_ATTRIBUTE, '');
  style.textContent = CSS_TEXT;
  doc.head.append(style);
}

type HighlightRegistry = Map<string, Map<object, Range[]>>;
const registries = new WeakMap<Document, HighlightRegistry>();

/** Contribute `ranges` from `owner` to the named document-wide highlight. */
export function setHighlightRanges(
  doc: Document,
  name: string,
  owner: object,
  ranges: Range[]
) {
  const win = doc.defaultView as unknown as {
    CSS?: { highlights?: Map<string, unknown> };
    Highlight?: new (...ranges: Range[]) => unknown;
  } | null;
  const highlights = win?.CSS?.highlights;
  if (!win?.Highlight || !highlights) return;
  let registry = registries.get(doc);
  if (!registry) {
    registry = new Map();
    registries.set(doc, registry);
  }
  let owners = registry.get(name);
  if (!owners) {
    owners = new Map();
    registry.set(name, owners);
  }
  if (ranges.length) owners.set(owner, ranges);
  else owners.delete(owner);
  const all = [...owners.values()].flat();
  if (all.length) highlights.set(name, new win.Highlight(...all));
  else highlights.delete(name);
}

export function toDOMElement(
  editor: SlateEditor,
  path: Path
): HTMLElement | undefined {
  try {
    const node = NodeApi.get(editor, path);
    return (node && editor.api.toDOMNode(node)) || undefined;
  } catch {
    return;
  }
}

/** DOM ranges for string offsets inside the block at `path`. */
export function toDOMRanges(
  editor: SlateEditor,
  path: Path,
  spans: AIEditTextSpan[]
): Range[] {
  const node = NodeApi.get(editor, path);
  if (!node) return [];
  const texts: { length: number; path: Path; start: number }[] = [];
  let offset = 0;
  if (TextApi.isText(node))
    texts.push({ length: node.text.length, path, start: 0 });
  else
    for (const [text, relative] of NodeApi.texts(node)) {
      texts.push({
        length: text.text.length,
        path: [...path, ...relative],
        start: offset,
      });
      offset += text.text.length;
    }
  const point = (at: number, end: boolean) => {
    const leaf =
      texts.find((text) =>
        end ? at <= text.start + text.length : at < text.start + text.length
      ) ?? texts.at(-1);
    return (
      leaf && {
        path: leaf.path,
        offset: Math.min(at - leaf.start, leaf.length),
      }
    );
  };
  const ranges: Range[] = [];
  for (const [start, end] of spans) {
    const anchor = point(start, false);
    const focus = point(end, true);
    if (!anchor || !focus) continue;
    try {
      ranges.push(editor.api.toDOMRange({ anchor, focus } as TRange) as Range);
    } catch {
      /* Not rendered. */
    }
  }
  return ranges;
}

/** Every rendered text node of `element` as whole-node ranges. */
export function textRanges(element: HTMLElement): Range[] {
  const doc = element.ownerDocument;
  const ranges: Range[] = [];
  for (const span of element.querySelectorAll('[data-slate-string]')) {
    const walker = doc.createTreeWalker(span, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      const range = doc.createRange();
      range.selectNodeContents(text);
      ranges.push(range);
    }
  }
  return ranges;
}

const ATTRIBUTES = [
  'data-ai-change',
  'data-ai-change-kind',
  'data-ai-change-removed',
];

/**
 * Mirror the ledger onto the DOM: block attributes for status, removal
 * markers on neighbours, and word highlights for rewritten text. Returns the
 * change owning each decorated element, for hover handling.
 */
export function syncAIChangeDecorations(
  editor: SlateEditor,
  ledger: AIChangeLedger,
  previous: Set<HTMLElement>
): { decorated: Set<HTMLElement>; owners: Map<HTMLElement, AIChange> } {
  const wanted = new Map<HTMLElement, Record<string, string>>();
  const owners = new Map<HTMLElement, AIChange>();
  const ranges: Range[] = [];
  for (const change of ledger.changes) {
    if (change.pending) continue;
    for (const ref of change.refs) {
      const path = ref.current;
      const element = path && toDOMElement(editor, path);
      if (!path || !element) continue;
      wanted.set(element, {
        ...wanted.get(element),
        'data-ai-change': change.status,
        'data-ai-change-kind': change.kind,
      });
      owners.set(element, change);
      if (change.status === 'new' && change.text?.inserted.length)
        ranges.push(...toDOMRanges(editor, path, change.text.inserted));
    }
    const anchor = !change.refs.length && change.anchor;
    const anchorPath = anchor && anchor.ref.current;
    const element = anchorPath && toDOMElement(editor, anchorPath);
    if (anchor && element) {
      wanted.set(element, {
        ...wanted.get(element),
        'data-ai-change-removed': anchor.after ? 'after' : 'before',
      });
      if (!owners.has(element)) owners.set(element, change);
    }
  }
  for (const element of new Set([...previous, ...wanted.keys()])) {
    const attributes = wanted.get(element) ?? {};
    for (const name of ATTRIBUTES) {
      const value = attributes[name];
      if (value === undefined) element.removeAttribute(name);
      else if (element.getAttribute(name) !== value)
        element.setAttribute(name, value);
    }
  }
  try {
    const root = editor.api.toDOMNode(editor);
    if (root)
      setHighlightRanges(
        root.ownerDocument,
        AI_HIGHLIGHT.change,
        ledger,
        ranges
      );
  } catch {
    /* Not mounted. */
  }
  return { decorated: new Set(wanted.keys()), owners };
}
