'use client';

import React from 'react';

import type { PluginConfig } from 'platejs';

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
  AI_CHANGE_ATTRIBUTE,
  ensureAIEditStyles,
  syncAIChangeDecorations,
} from './aiEditDom';

export type AIChangesPluginConfig = PluginConfig<
  'aiChanges',
  {
    /** Hover dwell in milliseconds after which a change fades out. */
    acknowledgeDelay: number;
    /** Properties that never count as a change, besides `id`. */
    ignoreProps: string[];
  },
  {
    aiChanges: {
      list: () => readonly AIChange[];
      /** Stop highlighting every change. */
      settleAll: () => void;
    };
  }
>;

const SELECTOR = `[${AI_CHANGE_ATTRIBUTE}]`;

function AIChangesOverlay() {
  const editor = useEditorRef();
  const ignoreProps = usePluginOption(AIChangesPlugin, 'ignoreProps');
  const acknowledgeDelay = usePluginOption(AIChangesPlugin, 'acknowledgeDelay');
  const ledger = getAIChangeLedger(editor, ignoreProps);
  React.useSyncExternalStore(
    ledger.subscribe,
    ledger.getVersion,
    ledger.getVersion
  );
  useEditorVersion();
  const [owners] = React.useState(() => new Map<HTMLElement, AIChange>());

  React.useLayoutEffect(() => {
    if (!ledger.changes.length && !owners.size) return;
    try {
      const root = editor.api.toDOMNode(editor);
      if (root) ensureAIEditStyles(root.ownerDocument);
    } catch {
      return;
    }
    syncAIChangeDecorations(editor, ledger, owners);
  });

  React.useEffect(
    () => () => {
      for (const element of owners.keys())
        element.removeAttribute(AI_CHANGE_ATTRIBUTE);
      owners.clear();
    },
    [owners]
  );

  React.useEffect(() => {
    let root: HTMLElement | undefined;
    try {
      root = editor.api.toDOMNode(editor) ?? undefined;
    } catch {
      return;
    }
    if (!root) return;
    const editable = root;
    let hovered: string | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const leave = () => {
      clearTimeout(timer);
      hovered = undefined;
    };
    const onMove = (event: PointerEvent) => {
      let element = (event.target as Element | null)?.closest?.(
        SELECTOR
      ) as HTMLElement | null;
      while (element && !owners.has(element))
        element = element.parentElement?.closest(SELECTOR) ?? null;
      const change = element && owners.get(element);
      if (!change || change.status !== 'new') {
        leave();
        return;
      }
      if (change.id === hovered) return;
      leave();
      hovered = change.id;
      timer = setTimeout(() => ledger.acknowledge(change.id), acknowledgeDelay);
    };
    editable.addEventListener('pointermove', onMove, { passive: true });
    editable.addEventListener('pointerleave', leave, { passive: true });
    return () => {
      leave();
      editable.removeEventListener('pointermove', onMove);
      editable.removeEventListener('pointerleave', leave);
    };
  }, [editor, ledger, owners, acknowledgeDelay]);

  return null;
}

/**
 * Tracks AI edits committed with `applyAnimatedAIEdit` and softly tints the
 * blocks the AI wrote. A tint fades out for good once the user hovers the
 * block or edits inside it; the next AI session clears all of them.
 */
export const AIChangesPlugin = createTPlatePlugin<AIChangesPluginConfig>({
  key: 'aiChanges',
  options: {
    acknowledgeDelay: 600,
    ignoreProps: [],
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
        list: () => ledger().changes,
        settleAll: () => ledger().settleAll(),
      };
    }
  );
