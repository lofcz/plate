'use client';

import React from 'react';
import { createPortal } from 'react-dom';

import { type PluginConfig, NodeApi } from 'platejs';
import {
  createTPlatePlugin,
  useEditorRef,
  useEditorVersion,
  usePluginOption,
} from 'platejs/react';

import {
  type AIChange,
  getAIChangeLedger,
  peekAIChangeLedger,
} from './aiChanges';
import {
  ensureAIEditStyles,
  setHighlightRanges,
  AI_HIGHLIGHT,
  syncAIChangeDecorations,
} from './aiEditDom';

export interface AIChangesLabels {
  /** Keep the change. */
  accept: string;
  /** Chip title for edited content. */
  changed: string;
  /** Revert the change. */
  reject: string;
  /** Chip title for removed content. */
  removed: string;
}

export type AIChangesPluginConfig = PluginConfig<
  'aiChanges',
  {
    /** Hover dwell in milliseconds after which a change counts as seen. */
    acknowledgeDelay: number;
    /** Properties that never count as a change, besides `id`. */
    ignoreProps: string[];
    labels: AIChangesLabels;
  },
  {
    aiChanges: {
      accept: (id: string) => void;
      acceptAll: () => void;
      list: () => readonly AIChange[];
      reject: (id: string) => void;
      rejectAll: () => void;
    };
  }
>;

const REJECT_ICON = (
  <svg
    aria-hidden="true"
    fill="none"
    height="13"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="13"
  >
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);

const ACCEPT_ICON = (
  <svg
    aria-hidden="true"
    fill="none"
    height="13"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2.2"
    viewBox="0 0 24 24"
    width="13"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const HIDE_DELAY = 220;
const SELECTOR = '[data-ai-change],[data-ai-change-removed]';

type Hover = { change: AIChange; element: HTMLElement };

function removedPreview(change: AIChange) {
  const text =
    change.kind === 'text'
      ? (change.text?.removed ?? '')
      : change.kind === 'props'
        ? ''
        : change.removed.map((node) => NodeApi.string(node)).join(' ');
  return text.length > 240 ? `${text.slice(0, 240)}…` : text;
}

function AIChangesOverlay() {
  const editor = useEditorRef();
  const options = editor.getOptions(AIChangesPlugin);
  const labels = usePluginOption(AIChangesPlugin, 'labels');
  const ledger = getAIChangeLedger(editor, options.ignoreProps);
  React.useSyncExternalStore(
    ledger.subscribe,
    ledger.getVersion,
    ledger.getVersion
  );
  useEditorVersion();
  const synced = React.useRef({
    decorated: new Set<HTMLElement>(),
    owners: new Map<HTMLElement, AIChange>(),
  });
  const [hover, setHover] = React.useState<Hover | null>(null);
  const [, setFrame] = React.useState(0);
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  React.useLayoutEffect(() => {
    if (!ledger.changes.length && !synced.current.decorated.size) return;
    try {
      const root = editor.api.toDOMNode(editor);
      if (root) ensureAIEditStyles(root.ownerDocument);
    } catch {
      return;
    }
    synced.current = syncAIChangeDecorations(
      editor,
      ledger,
      synced.current.decorated
    );
  });

  React.useEffect(
    () => () => {
      for (const element of synced.current.decorated)
        for (const name of [
          'data-ai-change',
          'data-ai-change-kind',
          'data-ai-change-removed',
        ])
          element.removeAttribute(name);
      if (typeof document !== 'undefined')
        setHighlightRanges(document, AI_HIGHLIGHT.change, ledger, []);
    },
    [ledger]
  );

  const cancelHide = React.useCallback(
    () => clearTimeout(hideTimer.current),
    []
  );
  const scheduleHide = React.useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHover(null), HIDE_DELAY);
  }, []);

  React.useEffect(() => {
    let root: HTMLElement | undefined;
    try {
      root = editor.api.toDOMNode(editor) ?? undefined;
    } catch {
      return;
    }
    if (!root) return;
    const editable = root;
    const onMove = (event: PointerEvent) => {
      let element = (event.target as Element | null)?.closest?.(
        SELECTOR
      ) as HTMLElement | null;
      while (element && !synced.current.owners.has(element))
        element = element.parentElement?.closest(SELECTOR) ?? null;
      const change = element && synced.current.owners.get(element);
      if (!element || !change || !editable.contains(element)) {
        scheduleHide();
        return;
      }
      cancelHide();
      setHover((current) =>
        current?.element === element && current.change === change
          ? current
          : { change, element }
      );
    };
    editable.addEventListener('pointermove', onMove, { passive: true });
    editable.addEventListener('pointerleave', scheduleHide, { passive: true });
    return () => {
      editable.removeEventListener('pointermove', onMove);
      editable.removeEventListener('pointerleave', scheduleHide);
    };
  }, [editor, cancelHide, scheduleHide]);

  const hovered =
    hover && ledger.get(hover.change.id) && hover.element.isConnected
      ? hover
      : null;
  const hoveredId = hovered?.change.id;
  const acknowledgeDelay = options.acknowledgeDelay;

  React.useEffect(() => {
    if (!hoveredId) return;
    const timer = setTimeout(
      () => ledger.markSeen(hoveredId),
      acknowledgeDelay
    );
    const reposition = () => setFrame((frame) => frame + 1);
    window.addEventListener('scroll', reposition, {
      capture: true,
      passive: true,
    });
    window.addEventListener('resize', reposition, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', reposition, { capture: true });
      window.removeEventListener('resize', reposition);
    };
  }, [hoveredId, acknowledgeDelay, ledger]);

  React.useEffect(() => () => clearTimeout(hideTimer.current), []);

  if (!hovered || typeof document === 'undefined') return null;
  const { change, element } = hovered;
  const rect = element.getBoundingClientRect();
  const below = rect.top < 48;
  const preview = removedPreview(change);
  const close = () => setHover(null);

  return createPortal(
    <div
      aria-label={change.refs.length ? labels.changed : labels.removed}
      data-ai-change-chip=""
      data-placement={below ? 'below' : 'above'}
      role="toolbar"
      onMouseDown={(event) => event.preventDefault()}
      onPointerEnter={cancelHide}
      onPointerLeave={scheduleHide}
      style={{
        left: Math.max(rect.right, 200),
        top: below ? rect.bottom : rect.top,
      }}
    >
      <span data-chip-label="" title={preview || undefined}>
        ✦ {change.refs.length ? labels.changed : labels.removed}
      </span>
      <button
        data-action="reject"
        onClick={() => {
          editor.getApi(AIChangesPlugin).aiChanges.reject(change.id);
          close();
        }}
        title={preview ? `${labels.reject}: ${preview}` : labels.reject}
        type="button"
      >
        {REJECT_ICON}
        {labels.reject}
      </button>
      <button
        data-action="accept"
        onClick={() => {
          editor.getApi(AIChangesPlugin).aiChanges.accept(change.id);
          close();
        }}
        type="button"
      >
        {ACCEPT_ICON}
        {labels.accept}
      </button>
    </div>,
    element.ownerDocument.body
  );
}

/**
 * Tracks AI edits committed with `applyAnimatedAIEdit`: highlights changed
 * blocks and rewritten words, marks removed content, and lets users keep or
 * revert each change from a hover chip. Hovering acknowledges a change; a
 * user edit inside it accepts it; the next AI session accepts all.
 */
export const AIChangesPlugin = createTPlatePlugin<AIChangesPluginConfig>({
  key: 'aiChanges',
  options: {
    acknowledgeDelay: 900,
    ignoreProps: [],
    labels: {
      accept: 'Keep',
      changed: 'AI edit',
      reject: 'Revert',
      removed: 'AI removed content',
    },
  },
  render: { afterEditable: AIChangesOverlay },
})
  .overrideEditor(({ editor, tf: { apply } }) => ({
    transforms: {
      apply(operation) {
        const ledger = peekAIChangeLedger(editor);
        if (!ledger || ledger.isMuted || operation.type === 'set_selection') {
          apply(operation);
          return;
        }
        ledger.onUserOperation(operation);
        apply(operation);
        ledger.prune();
      },
    },
  }))
  .extendApi<AIChangesPluginConfig['api']['aiChanges']>(
    ({ editor, getOptions }) => {
      const ledger = () => getAIChangeLedger(editor, getOptions().ignoreProps);
      return {
        accept: (id) => ledger().accept(id),
        acceptAll: () => ledger().acceptAll(),
        list: () => ledger().changes,
        reject: (id) => ledger().reject(id),
        rejectAll: () => ledger().rejectAll(),
      };
    }
  );
