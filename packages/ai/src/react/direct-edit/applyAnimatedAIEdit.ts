import type { Path, Value } from 'platejs';
import type { PlateEditor } from 'platejs/react';

import type { AIChangesPluginConfig } from './AIChangesPlugin';

import { getAIChangeLedger } from './aiChanges';
import {
  AI_HIGHLIGHT,
  ensureAIEditStyles,
  setHighlightRanges,
  textRanges,
  toDOMElement,
  toDOMRanges,
} from './aiEditDom';
import {
  type AIEditCommitted,
  type AIEditPlanItem,
  commitAIEditPlan,
  planAIEdit,
} from './planAIEdit';

export interface AnimatedAIEditOptions {
  /** Collaborator label shown beside the typing caret. Default: AI. */
  label?: string;
  /**
   * Canonical pre-edit value when the app normalizes both sides of its diff
   * (for example markdown round-trips). Defaults to the live value.
   */
  beforeValue?: Value;
  /** Properties that never count as a change, besides `id`. Defaults to the AIChangesPlugin option. */
  ignoreProps?: readonly string[];
  /**
   * Change-tracking session, typically one user request. Edits within a
   * session merge; the first edit of a new session accepts earlier changes.
   */
  session?: string;
  /** Reveal collapsed ancestors and return the refreshed DOM node before scrolling. */
  reveal?: (path: Path) => HTMLElement | undefined;
  /** Total playback budget in milliseconds, including scrolls. Default: 2400; capped at 4000. */
  duration?: number;
  /** Disable motion explicitly. Otherwise follows prefers-reduced-motion. */
  reducedMotion?: boolean;
  /** Aborts playback only; the committed, undoable edit remains intact. */
  signal?: AbortSignal;
}

export interface AnimatedAIEdit {
  /** Committed changes in document order. */
  changes: AIEditCommitted[];
  /** Resolves when playback ends or is cancelled. */
  finished: Promise<void>;
  cancel: () => void;
}

type Ghost = {
  element: HTMLElement;
  height: number;
  /** Horizontal offset from the editor's left edge. */
  left: number;
};

type Segment = { end: number; node: Text; start: number };

type Step = {
  committed: AIEditCommitted;
  elements: HTMLElement[];
  ghost?: Ghost;
  holds: Animation[];
  reserve?: {
    element: HTMLElement;
    extra: number;
    property: 'marginBottom' | 'marginTop';
  };
  segments: Segment[];
  total: number;
};

const active = new WeakMap<
  PlateEditor,
  { cancel: () => void; startedAt: number }
>();
const SCROLLABLE = /(auto|scroll)/;
const MAX_BATCHES = 4;
const MAX_TYPED = 1400;
const TRAIL = [8, 22, 44];
const HOLD = 3_600_000;
const EASE = 'cubic-bezier(.2,.7,.2,1)';

const isRun = (item: AIEditPlanItem) =>
  item.kind === 'insert' || item.kind === 'remove' || item.kind === 'replace';

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function toSegments(range: Range): Segment[] {
  const container = range.commonAncestorContainer;
  if (container.nodeType === 3)
    return range.endOffset > range.startOffset
      ? [
          {
            end: range.endOffset,
            node: container as Text,
            start: range.startOffset,
          },
        ]
      : [];
  const walker = container.ownerDocument!.createTreeWalker(container, 4);
  const segments: Segment[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!range.intersectsNode(node)) continue;
    if (node.parentElement?.closest('[data-slate-zero-width]')) continue;
    const start = node === range.startContainer ? range.startOffset : 0;
    const end =
      node === range.endContainer ? range.endOffset : (node as Text).length;
    if (end > start) segments.push({ end, node: node as Text, start });
  }
  return segments;
}

function sliceSegments(
  doc: Document,
  segments: Segment[],
  from: number,
  to: number
): Range[] {
  const ranges: Range[] = [];
  let offset = 0;
  for (const segment of segments) {
    if (offset >= to) break;
    const length = segment.end - segment.start;
    const start = Math.max(from, offset);
    const end = Math.min(to, offset + length);
    if (end > start) {
      const range = doc.createRange();
      range.setStart(segment.node, segment.start + start - offset);
      range.setEnd(segment.node, segment.start + end - offset);
      ranges.push(range);
    }
    offset += length;
  }
  return ranges;
}

function capSegments(segments: Segment[]): Segment[] {
  const capped: Segment[] = [];
  let total = 0;
  for (const segment of segments) {
    if (total >= MAX_TYPED) break;
    const end = Math.min(segment.end, segment.start + MAX_TYPED - total);
    capped.push({ ...segment, end });
    total += end - segment.start;
  }
  return capped;
}

function captureGhost(
  editor: PlateEditor,
  root: HTMLElement,
  item: AIEditPlanItem
): Ghost | undefined {
  const elements = item.removed.flatMap((node) => {
    try {
      const element = editor.api.toDOMNode(node);
      return element ? [element] : [];
    } catch {
      return [];
    }
  });
  if (!elements.length) return;
  const rects = elements.map((element) => element.getBoundingClientRect());
  const top = Math.min(...rects.map((rect) => rect.top));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  const left = Math.min(...rects.map((rect) => rect.left));
  const right = Math.max(...rects.map((rect) => rect.right));
  if (bottom <= top || right <= left) return;
  // A shallow editor clone keeps editor-scoped selectors applying to blocks.
  const ghost = root.cloneNode(false) as HTMLElement;
  for (const name of [
    'id',
    'contenteditable',
    'role',
    'aria-label',
    'aria-multiline',
    'data-slate-editor',
    'data-slate-node',
    'style',
    'tabindex',
  ])
    ghost.removeAttribute(name);
  ghost.dataset.aiEditGhost = '';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.inert = true;
  ghost.style.cssText = `width:${right - left}px;height:${bottom - top}px;padding:0;min-height:0;`;
  elements.forEach((element, index) => {
    const clone = element.cloneNode(true) as HTMLElement;
    for (const node of [clone, ...clone.querySelectorAll<HTMLElement>('*')]) {
      node.removeAttribute('id');
      node.removeAttribute('contenteditable');
    }
    const rect = rects[index];
    clone.style.cssText += `;position:absolute;margin:0;top:${rect.top - top}px;left:${rect.left - left}px;width:${rect.width}px;box-sizing:border-box;`;
    ghost.append(clone);
  });
  return {
    element: ghost,
    height: bottom - top,
    left: left - root.getBoundingClientRect().left,
  };
}

/**
 * Commit an AI edit as one undoable batch of minimal operations, record it as
 * reviewable changes (with AIChangesPlugin), and play a bounded transition:
 * removed blocks strike through and dissolve, replacements fade in and are
 * typed out by a labelled caret with a fading trail. Playback is purely
 * visual and never writes partial content into the document.
 */
export function applyAnimatedAIEdit(
  editor: PlateEditor,
  value: Value,
  options: AnimatedAIEditOptions = {}
): AnimatedAIEdit {
  const previous = active.get(editor);
  const startedAt = previous?.startedAt ?? Date.now();
  previous?.cancel();
  const next = (
    value.length ? value : [{ children: [{ text: '' }], type: 'p' }]
  ) as Value;
  const tracking = 'aiChanges' in editor.plugins;
  const ignoreProps =
    options.ignoreProps ??
    (tracking
      ? editor.getOptions<AIChangesPluginConfig>({ key: 'aiChanges' })
          .ignoreProps
      : []);
  const ledger = getAIChangeLedger(editor, ignoreProps);
  const plan = planAIEdit(
    editor,
    options.beforeValue ?? editor.children,
    next,
    {
      ignoreProps,
      keyCache: options.beforeValue ? undefined : ledger.keyCache,
    }
  );
  if (!plan.length)
    return { cancel: () => {}, changes: [], finished: Promise.resolve() };

  // A burst of tool calls shares its original deadline, not one budget per call.
  const requested = options.duration ?? 2400;
  const budget = clamp(Number.isFinite(requested) ? requested : 2400, 0, 4000);
  const deadline = startedAt + budget;
  let root: HTMLElement | undefined;
  try {
    root = editor.api.toDOMNode(editor) ?? undefined;
  } catch {
    /* Not mounted. */
  }
  const doc = root?.ownerDocument;
  const win = doc?.defaultView ?? undefined;
  const motion = !!(
    root &&
    win &&
    budget > 0 &&
    Date.now() < deadline &&
    !options.signal?.aborted &&
    !(
      options.reducedMotion ??
      win.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    )
  );

  // Capture removed blocks before Slate replaces their DOM.
  const ghosts = new Map<AIEditPlanItem, Ghost>();
  if (motion)
    for (const item of plan)
      if (isRun(item) && item.removed.length) {
        const ghost = captureGhost(editor, root!, item);
        if (ghost) ghosts.set(item, ghost);
      }

  const before = editor.children;
  let changes: AIEditCommitted[] = [];
  ledger.mute(() =>
    editor.tf.withNewBatch(() => {
      changes = commitAIEditPlan(editor, plan, { ignoreProps });
    })
  );
  editor.tf.setSplittingOnce(true);
  if (tracking)
    ledger.record(before, { pending: motion, session: options.session });

  const committedChildren = editor.children;
  let cancelled = false;
  let cleanup = () => {
    for (const change of changes) {
      for (const ref of change.refs) ref.unref();
      change.anchor?.ref.unref();
    }
    ledger.reveal();
  };
  const cancel = () => {
    cancelled = true;
    cleanup();
  };
  const playback = { cancel, startedAt };
  active.set(editor, playback);

  const finished = (async () => {
    if (!motion || !root || !doc || !win) return;
    const editable = root;
    ensureAIEditStyles(doc);
    let scrollRoot: HTMLElement | null = editable.parentElement;
    while (
      scrollRoot &&
      !SCROLLABLE.test(win.getComputedStyle(scrollRoot).overflowY)
    )
      scrollRoot = scrollRoot.parentElement;
    const viewport = () => {
      const rect = scrollRoot?.getBoundingClientRect();
      return {
        bottom: Math.min(win.innerHeight, rect?.bottom ?? win.innerHeight),
        left: Math.max(0, rect?.left ?? 0),
        right: Math.min(win.innerWidth, rect?.right ?? win.innerWidth),
        top: Math.max(0, rect?.top ?? 0),
      };
    };

    const layer = doc.createElement('div');
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText =
      'position:fixed;pointer-events:none;overflow:hidden;z-index:40;';
    editable.parentElement!.append(layer);
    const caret = doc.createElement('div');
    caret.dataset.aiEditCaret = '';
    caret.setAttribute('aria-hidden', 'true');
    const label = doc.createElement('span');
    label.textContent = `✦ ${options.label ?? 'AI'}`;
    caret.append(label);
    doc.body.append(caret);

    const animations: Animation[] = [];
    const animate = (
      element: HTMLElement,
      frames: Keyframe[],
      duration: number,
      fill: FillMode = 'none',
      easing = EASE
    ) => {
      if (typeof element.animate !== 'function') return;
      const animation = element.animate(frames, { duration, easing, fill });
      animations.push(animation);
      return animation;
    };
    const steps: Step[] = changes.map((committed) => ({
      committed,
      elements: [],
      ghost: ghosts.get(committed.item),
      holds: [],
      segments: [],
      total: 0,
    }));
    const trailOwner = {};
    const events = [
      'beforeinput',
      'keydown',
      'pointerdown',
      'wheel',
      'touchstart',
    ] as const;
    const eventRoot = scrollRoot ?? editable;
    const invalid = () =>
      cancelled ||
      !editable.isConnected ||
      editor.children !== committedChildren ||
      Date.now() >= deadline;

    const baseCleanup = cleanup;
    cleanup = () => {
      for (const animation of animations) animation.cancel();
      for (const step of steps)
        setHighlightRanges(doc, AI_HIGHLIGHT.pending, step, []);
      for (const name of AI_HIGHLIGHT.trail)
        setHighlightRanges(doc, name, trailOwner, []);
      layer.remove();
      caret.remove();
      for (const event of events)
        eventRoot.removeEventListener(event, cancel, true);
      options.signal?.removeEventListener('abort', cancel);
      baseCleanup();
    };
    for (const event of events)
      eventRoot.addEventListener(event, cancel, {
        capture: true,
        passive: true,
      });
    options.signal?.addEventListener('abort', cancel, { once: true });

    // Background tabs pause animation frames; the timeout keeps the deadline authoritative.
    const frame = () =>
      new Promise<void>((resolve) => {
        win.requestAnimationFrame(() => resolve());
        win.setTimeout(resolve, 100);
      });
    const wait = async (ms: number) => {
      const end = Math.min(Date.now() + ms, deadline);
      while (Date.now() < end && !invalid()) {
        layout();
        await frame();
      }
    };

    const resolveElements = (step: Step) =>
      step.committed.refs.flatMap((ref) => {
        const element = ref.current && toDOMElement(editor, ref.current);
        return element ? [element] : [];
      });
    const anchorElement = (step: Step) => {
      const path = step.committed.anchor?.ref.current;
      return path && toDOMElement(editor, path);
    };
    const prepareText = (step: Step) => {
      const { item, refs } = step.committed;
      const path = refs[0]?.current;
      const ranges =
        item.kind === 'text'
          ? path && item.text
            ? toDOMRanges(editor, path, item.text.inserted)
            : []
          : step.elements.flatMap(textRanges);
      step.segments = capSegments(ranges.flatMap(toSegments));
      step.total = step.segments.reduce(
        (sum, segment) => sum + segment.end - segment.start,
        0
      );
    };

    function layout() {
      const clip = viewport();
      layer.style.top = `${clip.top}px`;
      layer.style.left = `${clip.left}px`;
      layer.style.width = `${Math.max(0, clip.right - clip.left)}px`;
      layer.style.height = `${Math.max(0, clip.bottom - clip.top)}px`;
      const editorLeft = editable.getBoundingClientRect().left;
      for (const step of steps) {
        const ghost = step.ghost;
        if (!ghost?.element.isConnected) continue;
        let top: number | undefined;
        if (step.elements[0]?.isConnected)
          top = step.elements[0].getBoundingClientRect().top;
        else {
          const anchor = anchorElement(step);
          const rect = anchor?.getBoundingClientRect();
          if (rect)
            top = step.committed.anchor!.after
              ? rect.bottom
              : rect.top - ghost.height;
        }
        if (top === undefined) continue;
        ghost.element.style.transform = `translate(${editorLeft + ghost.left - clip.left}px,${top - clip.top}px)`;
      }
    }

    // Hold the pre-edit look: hide new content, keep old blocks in place.
    // Polled per animation frame so hidden content never paints first.
    const pending = () =>
      steps.some((step) => step.committed.refs.length && !step.elements.length);
    for (let attempt = 0; attempt < 8; attempt++) {
      for (const step of steps)
        if (!step.elements.length) step.elements = resolveElements(step);
      if (!pending()) break;
      await frame();
      if (invalid()) return;
    }
    for (const step of steps) {
      prepareText(step);
      if (step.total)
        setHighlightRanges(
          doc,
          AI_HIGHLIGHT.pending,
          step,
          sliceSegments(doc, step.segments, 0, step.total)
        );
      if (isRun(step.committed.item))
        for (const element of step.elements) {
          const hold = animate(
            element,
            [{ opacity: 0 }, { opacity: 0 }],
            HOLD,
            'both'
          );
          if (hold) step.holds.push(hold);
        }
      const ghost = step.ghost;
      if (!ghost) continue;
      ghost.element.style.position = 'absolute';
      ghost.element.style.top = '0';
      ghost.element.style.left = '0';
      layer.append(ghost.element);
      const first = step.elements[0];
      const last = step.elements.at(-1);
      let reserve: Step['reserve'];
      if (first && last) {
        const extra =
          ghost.height -
          (last.getBoundingClientRect().bottom -
            first.getBoundingClientRect().top);
        if (extra > 1)
          reserve = { element: last, extra, property: 'marginBottom' };
      } else {
        const anchor = anchorElement(step);
        if (anchor)
          reserve = {
            element: anchor,
            extra: ghost.height,
            property: step.committed.anchor!.after
              ? 'marginBottom'
              : 'marginTop',
          };
      }
      if (reserve) {
        const base =
          Number.parseFloat(
            win.getComputedStyle(reserve.element)[reserve.property]
          ) || 0;
        const held = `${base + reserve.extra}px`;
        const hold = animate(
          reserve.element,
          [{ [reserve.property]: held }, { [reserve.property]: held }],
          HOLD,
          'both'
        );
        if (hold) step.holds.push(hold);
        step.reserve = reserve;
      }
    }
    layout();

    const batchSize = Math.ceil(steps.length / MAX_BATCHES);
    const batches: Step[][] = [];
    for (let index = 0; index < steps.length; index += batchSize)
      batches.push(steps.slice(index, index + batchSize));

    const placeCaret = (step: Step, head: number) => {
      const index = Math.max(0, Math.min(step.total - 1, Math.ceil(head) - 1));
      const [range] = sliceSegments(doc, step.segments, index, index + 1);
      const rects = range?.getClientRects();
      const rect = rects?.[rects.length - 1];
      if (!rect?.height) return;
      const x = head <= 0 ? rect.left : rect.right;
      caret.style.display = 'block';
      caret.style.left = `${Math.min(x, win.innerWidth - 4)}px`;
      caret.style.top = `${rect.top}px`;
      caret.style.height = `${rect.height}px`;
    };

    const type = async (batch: Step[], duration: number) => {
      const typed = batch.filter((step) => step.total);
      if (!typed.length) return;
      const lead = typed.reduce((longest, step) =>
        step.total > longest.total ? step : longest
      );
      const start = Date.now();
      let fade = 1;
      while (!invalid()) {
        const elapsed = Date.now() - start;
        const progress = Math.min(1, elapsed / Math.max(1, duration));
        if (progress >= 1) fade = Math.max(0, 1 - (elapsed - duration) / 260);
        const trail: Range[][] = TRAIL.map(() => []);
        for (const step of typed) {
          const head = progress * step.total;
          setHighlightRanges(
            doc,
            AI_HIGHLIGHT.pending,
            step,
            sliceSegments(doc, step.segments, head, step.total)
          );
          let from = head;
          TRAIL.forEach((width, level) => {
            const to = Math.max(0, head - width * fade);
            trail[level].push(...sliceSegments(doc, step.segments, to, from));
            from = to;
          });
        }
        for (const [level, name] of AI_HIGHLIGHT.trail.entries())
          setHighlightRanges(doc, name, trailOwner, trail[level]);
        if (progress < 1) placeCaret(lead, progress * lead.total);
        else caret.style.display = 'none';
        layout();
        if (progress >= 1 && fade <= 0) break;
        await frame();
      }
    };

    for (const [index, batch] of batches.entries()) {
      if (invalid()) return;
      const slot = Math.max(
        0,
        (deadline - Date.now() - 40) / (batches.length - index)
      );
      const lead = batch[0];
      for (const step of batch) {
        const path =
          step.committed.refs[0]?.current ?? step.committed.anchor?.ref.current;
        const revealed = path && options.reveal?.(path);
        if (revealed && !step.elements.length) {
          step.elements = resolveElements(step);
          prepareText(step);
        }
      }
      const target = lead.elements[0] ?? anchorElement(lead);
      const started = Date.now();
      if (target) {
        const rect = target.getBoundingClientRect();
        const clip = viewport();
        if (rect.top < clip.top + 8 || rect.top > clip.bottom - 48) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
          await wait(Math.min(320, slot * 0.22));
        }
      }
      ledger.reveal(
        batch.flatMap((step) => {
          const own =
            step.committed.refs[0]?.current ??
            step.committed.anchor?.ref.current;
          return own ? [own] : [];
        })
      );
      const exiting = batch.filter((step) => step.ghost?.element.isConnected);
      const exit = exiting.length ? clamp(slot * 0.28, 160, 420) : 0;
      for (const step of exiting)
        animate(
          step.ghost!.element,
          [
            { filter: 'blur(0)', offset: 0, opacity: 1 },
            { filter: 'blur(0)', offset: 0.25, opacity: 1 },
            { filter: 'blur(3px)', offset: 1, opacity: 0 },
          ],
          exit,
          'forwards'
        );
      if (exit) await wait(exit);
      for (const step of exiting) step.ghost!.element.remove();
      if (invalid()) return;

      const remaining = Math.max(0, slot - (Date.now() - started));
      const enter = clamp(remaining * 0.35, 140, 280);
      for (const step of batch) {
        for (const hold of step.holds) hold.cancel();
        step.holds = [];
        if (step.reserve) {
          const { element, extra, property } = step.reserve;
          const base =
            Number.parseFloat(win.getComputedStyle(element)[property]) || 0;
          animate(
            element,
            [{ [property]: `${base + extra}px` }, { [property]: `${base}px` }],
            enter
          );
        }
        if (isRun(step.committed.item))
          for (const element of step.elements)
            animate(
              element,
              [
                {
                  filter: 'blur(2px)',
                  opacity: 0,
                  transform: 'translateY(6px)',
                },
                { filter: 'blur(0)', opacity: 1, transform: 'none' },
              ],
              enter
            );
        else if (step.committed.item.kind === 'props')
          for (const element of step.elements)
            animate(
              element,
              [
                { backgroundColor: 'rgb(139 92 246 / .2)' },
                { backgroundColor: 'transparent' },
              ],
              600
            );
      }
      const longest = Math.max(0, ...batch.map((step) => step.total));
      const typing = clamp(longest * 16, 180, Math.max(180, remaining - 40));
      label.textContent = `✦ ${options.label ?? 'AI'}${batches.length > 1 ? ` · ${index + 1}/${batches.length}` : ''}`;
      await type(batch, typing);
    }
  })().finally(() => {
    cleanup();
    if (active.get(editor) === playback) active.delete(editor);
  });
  return { cancel, changes, finished };
}
