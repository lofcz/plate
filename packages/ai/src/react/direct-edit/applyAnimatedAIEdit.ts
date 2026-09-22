import type { Descendant, TElement, Value } from 'platejs';
import type { PlateEditor } from 'platejs/react';

/** Visual playback settings. Content is committed atomically before playback. */
export interface AnimatedAIEditOptions {
  /** Collaborator label shown beside the typing caret. Default: AI. */
  label?: string;
  /** Maximum typing time per changed region, in milliseconds. Default: 1400. */
  duration?: number;
  /** Disable motion explicitly. Otherwise follows prefers-reduced-motion. */
  reducedMotion?: boolean;
  /** Aborts playback only; the committed, undoable edit remains intact. */
  signal?: AbortSignal;
}

const active = new WeakMap<
  PlateEditor,
  { cancel: () => void; paths: number[][] }
>();
let sequence = 0;
const SCROLLABLE = /(auto|scroll)/;

type Tree = {
  children?: Tree[];
  text?: string;
  type?: string;
  id?: string;
  [key: string]: unknown;
};
const key = (node: Tree): string =>
  JSON.stringify(node, (name, value) => (name === 'id' ? undefined : value));

/** Identify minimal changed element paths in document order, including deletions. */
export function getAIEditPaths(before: Value, after: Value): number[][] {
  const paths: number[][] = [];
  const visit = (old: Tree[], next: Tree[], parent: number[]) => {
    let cursor = 0;
    let deleted = false;
    for (let index = 0; index < next.length; index++) {
      const node = next[index];
      const path = [...parent, index];
      if (old[cursor] && key(old[cursor]) === key(node)) {
        if (deleted && node.children) paths.push(path);
        deleted = false;
        cursor++;
        continue;
      }
      const laterOld = old.findIndex(
        (item, i) => i > cursor && key(item) === key(node)
      );
      if (laterOld !== -1) {
        if (node.children) paths.push(path);
        cursor = laterOld + 1;
        continue;
      }
      const previous = old[cursor];
      const insertion =
        previous &&
        next.slice(index + 1).some((item) => key(item) === key(previous));
      if (!insertion) cursor++;
      if (
        !insertion &&
        previous?.type === node.type &&
        previous?.children &&
        node.children &&
        previous.children.length > 0 &&
        node.children.length > 0 &&
        previous.children.every((child) => child.children) &&
        node.children.every((child) => child.children)
      ) {
        const count = paths.length;
        visit(previous.children, node.children, path);
        if (paths.length === count) paths.push(path);
      } else if (node.children) paths.push(path);
    }
    deleted = cursor < old.length;
    if (deleted && next.length) paths.push([...parent, next.length - 1]);
  };
  visit(before as Tree[], after as Tree[], []);
  return paths.sort((a, b) => {
    for (let i = 0; i < Math.min(a.length, b.length); i++)
      if (a[i] !== b[i]) return a[i] - b[i];
    return a.length - b.length;
  });
}

/** Apply only changed nodes so unaffected selection anchors and node IDs survive. */
function reconcileAIValue(editor: PlateEditor, target: Value) {
  const childrenAt = (path: number[]): Tree[] =>
    (path.length ? (editor.api.node(path)?.[0] as Tree) : editor)
      .children as Tree[];
  const reconcile = (wanted: Tree[], parent: number[]) => {
    for (let index = 0; index < wanted.length; index++) {
      const path = [...parent, index];
      const node = wanted[index];
      const children = childrenAt(parent);
      const current = children[index];
      if (current && key(current) === key(node)) continue;
      const later = children.findIndex(
        (child, i) => i > index && key(child) === key(node)
      );
      if (later !== -1) {
        for (let i = index; i < later; i++) {
          editor.tf.apply({
            type: 'remove_node',
            path,
            node: childrenAt(parent)[index] as Descendant,
          });
        }
        continue;
      }
      if (
        !current ||
        wanted.slice(index + 1).some((child) => key(child) === key(current))
      ) {
        editor.tf.apply({
          type: 'insert_node',
          path,
          node: node as Descendant,
        });
        continue;
      }
      if (typeof current.text === 'string' && typeof node.text === 'string') {
        let prefix = 0;
        while (
          prefix < current.text.length &&
          prefix < node.text.length &&
          current.text[prefix] === node.text[prefix]
        )
          prefix++;
        let suffix = 0;
        while (
          suffix < current.text.length - prefix &&
          suffix < node.text.length - prefix &&
          current.text.at(-1 - suffix) === node.text.at(-1 - suffix)
        )
          suffix++;
        const removed = current.text.slice(
          prefix,
          current.text.length - suffix
        );
        const inserted = node.text.slice(prefix, node.text.length - suffix);
        if (removed)
          editor.tf.apply({
            type: 'remove_text',
            path,
            offset: prefix,
            text: removed,
          });
        if (inserted)
          editor.tf.apply({
            type: 'insert_text',
            path,
            offset: prefix,
            text: inserted,
          });
      } else if (!(current.children && node.children)) {
        editor.tf.apply({
          type: 'remove_node',
          path,
          node: current as Descendant,
        });
        editor.tf.apply({
          type: 'insert_node',
          path,
          node: node as Descendant,
        });
        continue;
      }
      const properties: Record<string, unknown> = {};
      const newProperties: Record<string, unknown> = {};
      for (const prop of new Set([
        ...Object.keys(current),
        ...Object.keys(node),
      ])) {
        if (prop === 'children' || prop === 'text' || prop === 'id') continue;
        if (JSON.stringify(current[prop]) === JSON.stringify(node[prop]))
          continue;
        properties[prop] = current[prop];
        newProperties[prop] = node[prop] ?? null;
      }
      if (Object.keys(newProperties).length)
        editor.tf.apply({ type: 'set_node', path, properties, newProperties });
      if (current.children && node.children) reconcile(node.children, path);
    }
    while (childrenAt(parent).length > wanted.length) {
      const index = wanted.length;
      editor.tf.apply({
        type: 'remove_node',
        path: [...parent, index],
        node: childrenAt(parent)[index] as Descendant,
      });
    }
  };
  editor.tf.withoutNormalizing(() => reconcile(target as Tree[], []));
}

/**
 * Replace a document as one normal undo/redo transaction, then reveal changed
 * regions top-to-bottom with a collaborator caret and smooth scrolling.
 *
 * Playback never writes partial text into Slate or persistence. Typing, undo,
 * another AI edit, abort, or unmount can end playback without losing content.
 * Unchanged regions stay visible. No suggestion marks are created.
 */
export function applyAnimatedAIEdit(
  editor: PlateEditor,
  value: Value,
  options: AnimatedAIEditOptions = {}
): { finished: Promise<void>; cancel: () => void } {
  const previous = active.get(editor);
  previous?.cancel();
  const next = structuredClone(
    value.length ? value : [{ type: 'p', children: [{ text: '' }] }]
  ) as Value;
  const paths = [
    ...(previous?.paths ?? []),
    ...getAIEditPaths(editor.children, next),
  ]
    .filter(
      (path, index, all) =>
        !all.some((other, j) => j < index && other.join('.') === path.join('.'))
    )
    .sort((a, b) => {
      for (let i = 0; i < Math.min(a.length, b.length); i++)
        if (a[i] !== b[i]) return a[i] - b[i];
      return a.length - b.length;
    });
  if (
    key({ children: editor.children as Tree[] }) ===
    key({ children: next as Tree[] })
  ) {
    return { finished: Promise.resolve(), cancel: () => {} };
  }
  editor.tf.withNewBatch(() => reconcileAIValue(editor, next));
  // The next manual keystroke starts its own undo batch, even if adjacent.
  editor.tf.setSplittingOnce(true);
  const committedChildren = editor.children;
  let cancelled = false;
  let cleanup = () => {};
  const cancel = () => {
    cancelled = true;
    cleanup();
  };
  const playback = { cancel, paths };
  active.set(editor, playback);
  const finished = (async () => {
    if (typeof document === 'undefined' || options.signal?.aborted) return;
    const root = editor.api.toDOMNode(editor);
    if (!root) return;
    const doc = root.ownerDocument;
    const win = doc.defaultView!;
    const reduced =
      options.reducedMotion ??
      win.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    // CSS Custom Highlights preserve Slate's DOM, selection and rich formatting.
    const css = win.CSS as typeof CSS & { highlights?: Map<string, unknown> };
    const HighlightClass = (
      win as unknown as { Highlight?: new (...ranges: Range[]) => unknown }
    ).Highlight;
    if (!css?.highlights || !HighlightClass) return;
    const name = `plate-ai-${++sequence}`;
    const style = doc.createElement('style');
    style.textContent = `::highlight(${name}) { color: transparent; text-shadow: none; }
      ::highlight(${name}-ink) { color: #7c3aed; background-color: #8b5cf61a; text-shadow: 0 0 12px #8b5cf655; }
      @keyframes ${name}-pulse { 50% { box-shadow: 0 0 28px #8b5cf633; } }
      [data-ai-edit-region="${name}"] { border-radius: 6px; background: linear-gradient(110deg,#8b5cf610,#38bdf810,transparent); animation: ${name}-pulse 1.2s ease-in-out infinite; transition: background .3s; }`;
    const caret = doc.createElement('div');
    caret.dataset.aiEditCaret = '';
    caret.setAttribute('aria-hidden', 'true');
    caret.style.cssText =
      'position:fixed;z-index:9999;pointer-events:none;width:2px;background:#8b5cf6;border-radius:2px;box-shadow:0 0 12px #8b5cf699;transition:left 45ms linear,top 45ms linear;display:none';
    const label = doc.createElement('span');
    label.textContent = options.label ?? 'AI';
    label.style.cssText =
      'position:absolute;bottom:100%;left:0;white-space:nowrap;background:linear-gradient(110deg,#7c3aed,#6366f1);color:white;border-radius:6px 6px 6px 0;padding:4px 9px;font:600 11px/1.4 system-ui;box-shadow:0 3px 14px #7c3aed33';
    caret.append(label);
    const status = doc.createElement('span');
    status.setAttribute('role', 'status');
    status.style.cssText =
      'position:fixed;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';
    status.textContent = options.label ?? 'AI';
    doc.head.append(style);
    doc.body.append(caret, status);
    const regions: HTMLElement[] = [];
    let scrollRoot: HTMLElement | null = root.parentElement;
    while (
      scrollRoot &&
      !SCROLLABLE.test(win.getComputedStyle(scrollRoot).overflowY)
    ) {
      scrollRoot = scrollRoot.parentElement;
    }
    const events = [
      'beforeinput',
      'keydown',
      'pointerdown',
      'wheel',
      'touchstart',
    ] as const;
    cleanup = () => {
      css.highlights!.delete(name);
      css.highlights!.delete(`${name}-ink`);
      style.remove();
      caret.remove();
      status.remove();
      for (const region of regions) {
        if (region.dataset.aiEditRegion === name)
          region.removeAttribute('data-ai-edit-region');
      }
      for (const event of events) root.removeEventListener(event, cancel, true);
      options.signal?.removeEventListener('abort', cancel);
    };
    for (const event of events)
      root.addEventListener(event, cancel, { capture: true, passive: true });
    options.signal?.addEventListener('abort', cancel, { once: true });
    const wait = (ms: number) =>
      new Promise<void>((resolve) => win.setTimeout(resolve, ms));
    // React may commit after the first frame when an entire subtree is new.
    // Wait for Slate's DOM mappings, never animate stale or missing DOM nodes.
    for (let attempt = 0; attempt < 60; attempt++) {
      await wait(16);
      if (
        cancelled ||
        !root.isConnected ||
        editor.children !== committedChildren
      )
        return;
      if (
        paths.every((path) => {
          const node = editor.api.node(path)?.[0];
          return !node || !!editor.api.toDOMNode(node);
        })
      )
        break;
    }
    const pending: Range[] = [];
    const groups: { element: HTMLElement; ranges: Range[] }[] = [];
    for (const path of paths) {
      const node = editor.api.node(path)?.[0];
      if (!node) continue;
      const element = editor.api.toDOMNode(node as TElement);
      if (!element) continue;
      const ranges: Range[] = [];
      for (const span of element.querySelectorAll('[data-slate-string]')) {
        const walker = doc.createTreeWalker(span, 4);
        let text = walker.nextNode();
        while (text) {
          const range = doc.createRange();
          range.selectNodeContents(text);
          ranges.push(range);
          pending.push(range);
          text = walker.nextNode();
        }
      }
      groups.push({ element, ranges });
    }
    const paint = () =>
      css.highlights!.set(name, new HighlightClass(...pending));
    paint();
    for (const { element, ranges } of groups) {
      if (
        cancelled ||
        !root.isConnected ||
        editor.children !== committedChildren
      )
        break;
      label.textContent = `✦ ${options.label ?? 'AI'} · ${regions.length + 1}/${groups.length}`;
      regions.push(element);
      element.dataset.aiEditRegion = name;
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
      await wait(360);
      if (
        cancelled ||
        !root.isConnected ||
        editor.children !== committedChildren
      )
        break;
      const total = ranges.reduce(
        (sum, range) => sum + range.toString().length,
        0
      );
      const duration = Math.max(
        0,
        Math.min(options.duration ?? 1400, Math.max(650, total * 14))
      );
      const started = win.performance.now();
      let shown = 0;
      do {
        if (
          cancelled ||
          !root.isConnected ||
          editor.children !== committedChildren
        )
          break;
        const count =
          duration === 0
            ? total
            : Math.min(
                total,
                Math.ceil(
                  (total * (win.performance.now() - started)) / duration
                )
              );
        let remaining = count - shown;
        for (const range of ranges) {
          const length = range.endOffset - range.startOffset;
          if (!length) continue;
          const take = Math.min(remaining, length);
          range.setStart(range.startContainer, range.startOffset + take);
          remaining -= take;
          if (take) {
            const ink = range.cloneRange();
            ink.setStart(
              range.startContainer,
              Math.max(0, range.startOffset - 18)
            );
            ink.setEnd(range.startContainer, range.startOffset);
            css.highlights!.set(`${name}-ink`, new HighlightClass(ink));
            const point = range.cloneRange();
            point.collapse(true);
            const rect = point.getBoundingClientRect();
            if (rect.height) {
              caret.style.display = 'block';
              caret.style.left = `${rect.left}px`;
              caret.style.top = `${rect.top}px`;
              caret.style.height = `${rect.height}px`;
              const viewport = scrollRoot?.getBoundingClientRect();
              const bottom = viewport?.bottom ?? win.innerHeight;
              const top = viewport?.top ?? 0;
              if (rect.bottom > bottom - 70 || rect.top < top + 40) {
                const delta = rect.top - (top + (bottom - top) * 0.45);
                if (scrollRoot)
                  scrollRoot.scrollBy({ top: delta, behavior: 'smooth' });
                else win.scrollBy({ top: delta, behavior: 'smooth' });
              }
            }
          }
          if (!remaining) break;
        }
        shown = count;
        paint();
        if (shown < total) await wait(24);
      } while (shown < total);
      element.removeAttribute('data-ai-edit-region');
      playback.paths.shift();
    }
  })().finally(() => {
    cleanup();
    if (active.get(editor) === playback) active.delete(editor);
  });
  return { finished, cancel };
}
