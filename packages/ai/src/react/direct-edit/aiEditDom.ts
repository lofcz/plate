import type { Path, SlateEditor, TRange } from 'platejs';

import { NodeApi, TextApi } from 'platejs';

import {
  type AIChange,
  type AIChangeLedger,
  AI_CHANGE_FADE,
} from './aiChanges';
import type { AIEditTextSpan } from './diffAIEdit';

const STYLE_ATTRIBUTE = 'data-plate-ai-edit-styles';

export const AI_HIGHLIGHT = {
  pending: 'plate-ai-pending',
  trail: ['plate-ai-trail-1', 'plate-ai-trail-2', 'plate-ai-trail-3'],
} as const;

const TINT = 'rgb(139 92 246/.07)';

const CSS_TEXT = `
[data-ai-change]{border-radius:4px;transition:background-color .5s ease,box-shadow .5s ease}
[data-ai-change="new"]{background-color:${TINT};box-shadow:-6px 0 0 ${TINT},6px 0 0 ${TINT}}
[data-ai-change="new"] [data-ai-change]{background-color:transparent;box-shadow:none}
[data-ai-change="seen"]{transition-duration:${AI_CHANGE_FADE}ms}
::highlight(${AI_HIGHLIGHT.pending}){color:transparent}
::highlight(${AI_HIGHLIGHT.trail[0]}){background-color:rgb(139 92 246/.34);color:#6d28d9}
::highlight(${AI_HIGHLIGHT.trail[1]}){background-color:rgb(139 92 246/.2)}
::highlight(${AI_HIGHLIGHT.trail[2]}){background-color:rgb(139 92 246/.09)}
[data-ai-edit-ghost]{position:fixed;pointer-events:none;z-index:40;margin:0;overflow:hidden;border-radius:6px;background:rgb(244 63 94/.05);transform-origin:top center}
[data-ai-edit-ghost] *{text-decoration-line:line-through!important;text-decoration-color:rgb(244 63 94/.55)!important;text-decoration-thickness:1.5px!important}
[data-ai-edit-caret]{position:fixed;z-index:51;pointer-events:none;width:2px;border-radius:2px;background:#8b5cf6;box-shadow:0 0 10px rgb(139 92 246/.7);display:none}
[data-ai-edit-caret]::before{content:"";position:absolute;right:2px;top:12%;height:76%;width:64px;border-radius:999px 0 0 999px;background:linear-gradient(to left,rgb(139 92 246/.32),rgb(56 189 248/.12) 55%,transparent);filter:blur(3px)}
[data-ai-edit-caret]>span{position:absolute;bottom:100%;left:0;margin-bottom:3px;white-space:nowrap;background:linear-gradient(110deg,#7c3aed,#6366f1);color:#fff;border-radius:6px 6px 6px 0;padding:3px 8px;font:600 11px/1.4 system-ui,sans-serif;box-shadow:0 3px 14px rgb(124 58 237/.25)}
@media (prefers-reduced-motion:reduce){[data-ai-change]{transition:none}}
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

export const AI_CHANGE_ATTRIBUTE = 'data-ai-change';

/**
 * Mirror revealed changes onto their block elements as `data-ai-change`, and
 * update `owners` in place to map each decorated element to its change.
 */
export function syncAIChangeDecorations(
  editor: SlateEditor,
  ledger: AIChangeLedger,
  owners: Map<HTMLElement, AIChange>
) {
  const next = new Map<HTMLElement, AIChange>();
  for (const change of ledger.changes) {
    if (change.pending) continue;
    for (const ref of change.refs) {
      const element = ref.current && toDOMElement(editor, ref.current);
      if (element) next.set(element, change);
    }
  }
  for (const element of owners.keys())
    if (!next.has(element)) element.removeAttribute(AI_CHANGE_ATTRIBUTE);
  owners.clear();
  for (const [element, change] of next) {
    owners.set(element, change);
    if (element.getAttribute(AI_CHANGE_ATTRIBUTE) !== change.status)
      element.setAttribute(AI_CHANGE_ATTRIBUTE, change.status);
  }
}
