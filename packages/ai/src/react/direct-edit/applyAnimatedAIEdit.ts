import type { Descendant, TElement, Value } from 'platejs';
import type { PlateEditor } from 'platejs/react';

/** Visual playback settings. Content is committed atomically before playback. */
export interface AnimatedAIEditOptions {
  /** Collaborator label shown beside the typing caret. Default: AI. */
  label?: string;
  /** Total playback budget in milliseconds, including scrolls. Default: 1800; capped at 2000. */
  duration?: number;
  /** Disable motion explicitly. Otherwise follows prefers-reduced-motion. */
  reducedMotion?: boolean;
  /** Aborts playback only; the committed, undoable edit remains intact. */
  signal?: AbortSignal;
}

const active = new WeakMap<
  PlateEditor,
  { cancel: () => void; startedAt: number }
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
 * Apply one undoable edit and play a bounded visual transition.
 *
 * The old visible document is retained in an inert snapshot during the swap.
 * Broad rewrites crossfade together; small edits receive ordered ink/caret
 * accents. Text and list markers in pending regions remain visible throughout.
 * Playback never writes partial content into Slate or persistence.
 */
export function applyAnimatedAIEdit(
  editor: PlateEditor,
  value: Value,
  options: AnimatedAIEditOptions = {}
): { finished: Promise<void>; cancel: () => void } {
  const previous = active.get(editor);
  const startedAt = previous?.startedAt ?? Date.now();
  previous?.cancel();
  const next = structuredClone(
    value.length ? value : [{ type: 'p', children: [{ text: '' }] }]
  ) as Value;
  if (
    key({ children: editor.children as Tree[] }) ===
    key({ children: next as Tree[] })
  )
    return { finished: Promise.resolve(), cancel: () => {} };
  const paths = getAIEditPaths(editor.children, next);
  const changedRoots = new Set(paths.map((path) => path[0]));
  const broad =
    paths.length > 5 ||
    changedRoots.size / Math.max(1, editor.children.length, next.length) >= 0.6;
  // A burst of tool calls shares its original deadline, not one budget per call.
  const requested = options.duration ?? 1800;
  const budget = Math.max(
    0,
    Math.min(Number.isFinite(requested) ? requested : 1800, 2000)
  );
  const deadline = startedAt + budget;
  let root: HTMLElement | undefined;
  try {
    root = editor.api.toDOMNode(editor) ?? undefined;
  } catch {
    /* Not mounted. */
  }
  const doc = root?.ownerDocument;
  const win = doc?.defaultView;
  const motion =
    root &&
    win &&
    budget > 0 &&
    !options.signal?.aborted &&
    !(
      options.reducedMotion ??
      win.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    );
  let snapshot: HTMLElement | undefined;
  let scrollRoot: HTMLElement | null = root?.parentElement ?? null;
  while (
    scrollRoot &&
    !SCROLLABLE.test(win!.getComputedStyle(scrollRoot).overflowY)
  )
    scrollRoot = scrollRoot.parentElement;
  // Capture before mutating Slate: the old words never disappear into blank lists.
  if (motion && root && win && Date.now() < deadline) {
    const rect = root.getBoundingClientRect();
    const viewport = scrollRoot?.getBoundingClientRect();
    const top = Math.max(0, rect.top, viewport?.top ?? 0);
    const bottom = Math.min(
      win.innerHeight,
      rect.bottom,
      viewport?.bottom ?? win.innerHeight
    );
    const left = Math.max(0, rect.left, viewport?.left ?? 0);
    const right = Math.min(
      win.innerWidth,
      rect.right,
      viewport?.right ?? win.innerWidth
    );
    if (bottom > top && right > left) {
      snapshot = doc!.createElement('div');
      snapshot.dataset.aiEditSnapshot = '';
      snapshot.setAttribute('aria-hidden', 'true');
      snapshot.inert = true;
      let background = 'Canvas';
      for (
        let ancestor: HTMLElement | null = root;
        ancestor;
        ancestor = ancestor.parentElement
      ) {
        const color = win.getComputedStyle(ancestor).backgroundColor;
        if (color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') {
          background = color;
          break;
        }
      }
      snapshot.style.cssText = `position:fixed;pointer-events:none;z-index:50;overflow:hidden;background:${background};top:${top}px;left:${left}px;width:${right - left}px;height:${bottom - top}px;`;
      const clone = root.cloneNode(true) as HTMLElement;
      for (const element of [
        clone,
        ...clone.querySelectorAll<HTMLElement>('*'),
      ]) {
        element.removeAttribute('id');
        element.removeAttribute('contenteditable');
        element.removeAttribute('role');
        element.removeAttribute('aria-label');
      }
      clone.style.cssText += `;position:absolute;margin:0;top:${rect.top - top}px;left:${rect.left - left}px;width:${rect.width}px;height:${rect.height}px;box-sizing:border-box;`;
      snapshot.append(clone);
      root.parentElement!.append(snapshot);
    }
  }
  try {
    editor.tf.withNewBatch(() => reconcileAIValue(editor, next));
    editor.tf.setSplittingOnce(true);
  } catch (error) {
    snapshot?.remove();
    throw error;
  }
  const committedChildren = editor.children;
  let cancelled = false;
  let cleanup = () => {
    snapshot?.remove();
  };
  const cancel = () => {
    cancelled = true;
    cleanup();
  };
  const playback = { cancel, startedAt };
  active.set(editor, playback);
  const finished = (async () => {
    if (!motion || !root || !doc || !win || Date.now() >= deadline) return;
    const name = `plate-ai-${++sequence}`;
    const css = win.CSS as typeof CSS & { highlights?: Map<string, unknown> };
    const HighlightClass = (
      win as unknown as { Highlight?: new (...ranges: Range[]) => unknown }
    ).Highlight;
    const style = doc.createElement('style');
    style.textContent = `::highlight(${name}-ink) { color: #7c3aed; background-color: #8b5cf61a; text-shadow: 0 0 9px #8b5cf633; }
      [data-ai-edit-region="${name}"] { border-radius:6px; background:linear-gradient(110deg,#8b5cf614,#38bdf80d,transparent); }
      [data-ai-edit-mode="rewrite"] { border-radius:6px; }`;
    const caret = doc.createElement('div');
    caret.dataset.aiEditCaret = '';
    caret.setAttribute('aria-hidden', 'true');
    caret.style.cssText =
      'position:fixed;z-index:51;pointer-events:none;width:2px;background:#8b5cf6;border-radius:2px;box-shadow:0 0 12px #8b5cf699;display:none';
    const label = doc.createElement('span');
    label.textContent = `✦ ${options.label ?? 'AI'}`;
    label.style.cssText =
      'position:absolute;bottom:100%;left:0;white-space:nowrap;background:linear-gradient(110deg,#7c3aed,#6366f1);color:white;border-radius:6px 6px 6px 0;padding:4px 9px;font:600 11px/1.4 system-ui;box-shadow:0 3px 14px #7c3aed33';
    caret.append(label);
    doc.head.append(style);
    doc.body.append(caret);
    root.dataset.aiEditMode = broad ? 'rewrite' : 'regions';
    const animations: Animation[] = [];
    const regions: HTMLElement[] = [];
    const events = [
      'beforeinput',
      'keydown',
      'pointerdown',
      'wheel',
      'touchstart',
    ] as const;
    const eventRoot = scrollRoot ?? root;
    const invalid = () =>
      cancelled ||
      !root!.isConnected ||
      editor.children !== committedChildren ||
      Date.now() >= deadline;
    const monitor = win.setInterval(() => {
      if (invalid()) cancel();
    }, 16);
    const watchdog = win.setTimeout(cancel, Math.max(0, deadline - Date.now()));
    cleanup = () => {
      win.clearInterval(monitor);
      win.clearTimeout(watchdog);
      snapshot?.remove();
      for (const animation of animations) animation.cancel();
      css?.highlights?.delete(`${name}-ink`);
      style.remove();
      caret.remove();
      for (const region of regions)
        if (region.dataset.aiEditRegion === name)
          region.removeAttribute('data-ai-edit-region');
      // A cancelled predecessor must not clear a successor's state.
      if (active.get(editor) === playback)
        root!.removeAttribute('data-ai-edit-mode');
      for (const event of events)
        eventRoot.removeEventListener(event, cancel, true);
      options.signal?.removeEventListener('abort', cancel);
    };
    for (const event of events)
      eventRoot.addEventListener(event, cancel, {
        capture: true,
        passive: true,
      });
    options.signal?.addEventListener('abort', cancel, { once: true });
    const wait = (ms: number) =>
      new Promise<void>((resolve) =>
        win.setTimeout(
          resolve,
          Math.max(0, Math.min(ms, deadline - Date.now()))
        )
      );
    // Bound DOM readiness as part of the same budget. Never reveal an old mapping.
    for (let attempt = 0; attempt < 15; attempt++) {
      await wait(16);
      if (invalid()) return;
      if (
        paths.every((path) => {
          const node = editor.api.node(path)?.[0];
          return !node || !!editor.api.toDOMNode(node);
        })
      )
        break;
    }
    const animate = (
      element: HTMLElement,
      frames: Keyframe[],
      duration: number
    ) => {
      if (element.animate)
        animations.push(
          element.animate(frames, {
            duration,
            easing: 'cubic-bezier(.2,.7,.2,1)',
            fill: 'forwards',
          })
        );
    };
    const swapDuration = Math.min(
      broad ? 480 : 160,
      Math.max(0, deadline - Date.now() - 32)
    );
    if (snapshot)
      animate(snapshot, [{ opacity: 1 }, { opacity: 0 }], swapDuration);
    if (broad) {
      // A full rewrite is one short, calm transition. Preserve the viewport.
      animate(
        root,
        [
          { opacity: 0.45, filter: 'blur(1px)' },
          { opacity: 1, filter: 'blur(0px)' },
        ],
        swapDuration
      );
      await wait(swapDuration);
      return;
    }
    await wait(swapDuration);
    snapshot?.remove();
    const groups: { element: HTMLElement; ranges: Range[] }[] = [];
    for (const path of paths) {
      const node = editor.api.node(path)?.[0];
      const element = node && editor.api.toDOMNode(node as TElement);
      if (!element) continue;
      const ranges: Range[] = [];
      for (const span of element.querySelectorAll('[data-slate-string]')) {
        const walker = doc.createTreeWalker(span, 4);
        let text = walker.nextNode();
        while (text) {
          const range = doc.createRange();
          range.selectNodeContents(text);
          ranges.push(range);
          text = walker.nextNode();
        }
      }
      groups.push({ element, ranges });
    }
    for (const [index, { element, ranges }] of groups.entries()) {
      if (invalid()) break;
      regions.push(element);
      element.dataset.aiEditRegion = name;
      label.textContent = `✦ ${options.label ?? 'AI'} · ${index + 1}/${groups.length}`;
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
      const slot = Math.max(
        0,
        (deadline - Date.now() - 40) / (groups.length - index)
      );
      await wait(Math.min(130, slot * 0.3));
      const total = ranges.reduce(
        (sum, range) => sum + range.toString().length,
        0
      );
      const start = Date.now();
      const duration = Math.max(0, slot - Math.min(130, slot * 0.3));
      do {
        if (invalid()) break;
        let count = Math.min(
          total,
          Math.ceil((total * (Date.now() - start)) / Math.max(1, duration))
        );
        for (const range of ranges) {
          const length = range.endOffset - range.startOffset;
          if (count > length) {
            count -= length;
            continue;
          }
          const ink = range.cloneRange();
          ink.setStart(
            range.startContainer,
            Math.max(range.startOffset, range.startOffset + count - 18)
          );
          ink.setEnd(range.startContainer, range.startOffset + count);
          if (css?.highlights && HighlightClass)
            css.highlights.set(`${name}-ink`, new HighlightClass(ink));
          const point = ink.cloneRange();
          point.collapse(false);
          const rect = point.getBoundingClientRect();
          if (rect.height) {
            caret.style.display = 'block';
            caret.style.left = `${Math.min(rect.left, win.innerWidth - 130)}px`;
            caret.style.top = `${rect.top}px`;
            caret.style.height = `${rect.height}px`;
          }
          break;
        }
        if (Date.now() - start >= duration) break;
        await wait(16);
      } while (!invalid());
      element.removeAttribute('data-ai-edit-region');
    }
  })().finally(() => {
    cleanup();
    if (active.get(editor) === playback) active.delete(editor);
  });
  return { finished, cancel };
}
