/**
 * Diff Playground — interactive harness for `computeDiff` (block / inline
 * granularity, pair order, custom word boundary).
 *
 * Layout:
 *   ┌────────────┬────────────┬─────────────────────┐
 *   │  Before    │   After    │   Diff preview      │
 *   │  (Monaco)  │  (Monaco)  │   (rendered Slate)  │
 *   └────────────┴────────────┴─────────────────────┘
 *   │  Debug: stats, pair groups, raw JSON          │
 *   └───────────────────────────────────────────────┘
 *
 * The "Before" and "After" panes are editable markdown that gets
 * deserialised through the same plugin set the production editor uses. The
 * computed diff is rendered by `DiffPreview` (a custom Slate-tree walker
 * with explicit insert / delete / update styling) so we can see at a glance
 * how the new pair-id and pair-order options behave.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { computeDiff } from '@platejs/diff';
import { lessonPlanDiffStrategy } from './lesson-plan';
import { usePlateEditor } from 'platejs/react';
import type { Descendant, Value } from 'platejs';

import { DiffPreview } from './diff-preview';
import { DIFF_PRESETS, DIFF_PRESET_KEYS } from './diff-values';
import { deserializeMd, EDITOR_PLUGINS } from './editor';

type Granularity = 'inline' | 'block';
type PairOrder = 'delete-first' | 'insert-first';

const DEBOUNCE_MS = 200;

/**
 * Punctuation-aware word boundary. Hoisted to module scope (and out of the
 * `useMemo` body) so the regex is created exactly once for the lifetime of
 * the app — Biome's `useTopLevelRegex` requires this and recreating it on
 * every diff recompute would be wasted work.
 */
const PUNCTUATION_WORD_BOUNDARY = /([\s.,!?;:()[\]{}"'`]+)/u;

export function DiffPlayground() {
  const [preset, setPreset] = useState(DIFF_PRESET_KEYS[0]);
  const [granularity, setGranularity] = useState<Granularity>('block');
  const [pairOrder, setPairOrder] = useState<PairOrder>('insert-first');
  const [punctuationBoundary, setPunctuationBoundary] = useState(false);

  const [before, setBefore] = useState(DIFF_PRESETS[preset].before);
  const [after, setAfter] = useState(DIFF_PRESETS[preset].after);

  // Debounced live state: we only recompute when typing stops to keep
  // Monaco snappy with large inputs.
  const [beforeDeb, setBeforeDeb] = useState(before);
  const [afterDeb, setAfterDeb] = useState(after);
  const debTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // A headless Plate editor instance is used purely for `deserializeMd` and
  // `editor.api.isInline`. It never renders.
  const editor = usePlateEditor({
    plugins: EDITOR_PLUGINS,
    value: [{ type: 'p', children: [{ text: '' }] }] as Value,
  });

  // Switching presets resets both panes.
  useEffect(() => {
    setBefore(DIFF_PRESETS[preset].before);
    setAfter(DIFF_PRESETS[preset].after);
  }, [preset]);

  // Debounce input → recompute trigger.
  useEffect(() => {
    clearTimeout(debTimerRef.current);
    debTimerRef.current = setTimeout(() => {
      setBeforeDeb(before);
      setAfterDeb(after);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debTimerRef.current);
  }, [before, after]);

  const computed = useMemo(() => {
    if (!editor) return null;
    try {
      const beforeNodes = deserializeMd(editor, beforeDeb) as Descendant[];
      const afterNodes = deserializeMd(editor, afterDeb) as Descendant[];

      let pairCounter = 0;
      const wordBoundary = punctuationBoundary
        ? PUNCTUATION_WORD_BOUNDARY
        : undefined;

      const diff = computeDiff(beforeNodes, afterNodes, {
        ignoreProps: ['id'],
        isInline: editor.api.isInline,
        granularity,
        pairOrder,
        wordBoundary,
        generatePairId: () => `p${++pairCounter}`,
        // Declarative per-element strategies. Each MDX type owns its own
        // identity rules: see lesson-plan.tsx. Plain block types (p, h1,
        // blockquote, ...) return undefined here and continue to be
        // handled by the engine's structural heuristics.
        getDiffStrategy: lessonPlanDiffStrategy,
      });

      return { beforeNodes, afterNodes, diff, error: null as string | null };
    } catch (e) {
      return {
        beforeNodes: [],
        afterNodes: [],
        diff: [],
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [
    editor,
    beforeDeb,
    afterDeb,
    granularity,
    pairOrder,
    punctuationBoundary,
  ]);

  // Stats for the debug strip.
  const stats = useMemo(() => {
    if (!computed) return null;
    const diff = computed.diff as any[];
    let inserts = 0;
    let deletes = 0;
    let updates = 0;
    const pairIds = new Set<string>();
    const seenPairIdsPerBlock: Record<string, string[]> = {
      insert: [],
      delete: [],
    };
    for (const n of diff) {
      const op = n?.diffOperation?.type;
      if (op === 'insert') inserts++;
      else if (op === 'delete') deletes++;
      else if (op === 'update') updates++;
      if (n?.pairId) {
        pairIds.add(n.pairId);
        if (op === 'insert' || op === 'delete') {
          seenPairIdsPerBlock[op].push(n.pairId);
        }
      }
    }
    const sharedPairs = [...pairIds].filter(
      (id) =>
        seenPairIdsPerBlock.insert.includes(id) &&
        seenPairIdsPerBlock.delete.includes(id)
    );
    return {
      inserts,
      deletes,
      updates,
      blocks: diff.length,
      uniquePairs: pairIds.size,
      pairedBoth: sharedPairs.length,
      orphanInserts: seenPairIdsPerBlock.insert.filter(
        (id) => !seenPairIdsPerBlock.delete.includes(id)
      ).length,
      orphanDeletes: seenPairIdsPerBlock.delete.filter(
        (id) => !seenPairIdsPerBlock.insert.includes(id)
      ).length,
    };
  }, [computed]);

  const handleBeforeMount: OnMount = useCallback(() => {}, []);
  const handleAfterMount: OnMount = useCallback(() => {}, []);

  const reset = useCallback(() => {
    setBefore(DIFF_PRESETS[preset].before);
    setAfter(DIFF_PRESETS[preset].after);
  }, [preset]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Toolbar
        preset={preset}
        onPresetChange={setPreset}
        granularity={granularity}
        onGranularityChange={setGranularity}
        pairOrder={pairOrder}
        onPairOrderChange={setPairOrder}
        punctuationBoundary={punctuationBoundary}
        onPunctuationBoundaryChange={setPunctuationBoundary}
        onReset={reset}
        stats={stats}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1.1fr',
          gap: 1,
          background: '#e5e7eb',
          flex: 1,
          minHeight: 0,
        }}
      >
        <Pane label={`Before (${DIFF_PRESETS[preset].label})`}>
          <Editor
            defaultLanguage="markdown"
            value={before}
            onChange={(v) => setBefore(v ?? '')}
            theme="vs"
            options={{
              minimap: { enabled: false },
              wordWrap: 'on',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              fontSize: 13,
              automaticLayout: true,
            }}
            onMount={handleBeforeMount}
          />
        </Pane>

        <Pane label="After (editable)">
          <Editor
            defaultLanguage="markdown"
            value={after}
            onChange={(v) => setAfter(v ?? '')}
            theme="vs"
            options={{
              minimap: { enabled: false },
              wordWrap: 'on',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              fontSize: 13,
              automaticLayout: true,
            }}
            onMount={handleAfterMount}
          />
        </Pane>

        <Pane label="Diff preview">
          <div
            style={{ padding: '8px 14px', overflow: 'auto', height: '100%' }}
          >
            {computed?.error ? (
              <div style={{ color: '#dc2626', fontSize: 12 }}>
                Error: {computed.error}
              </div>
            ) : (
              <DiffPreview nodes={(computed?.diff ?? []) as any} />
            )}
          </div>
        </Pane>
      </div>

      <DebugStrip
        description={DIFF_PRESETS[preset].description}
        diff={computed?.diff ?? []}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Pane({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 600,
          color: '#374151',
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

function Toolbar({
  preset,
  onPresetChange,
  granularity,
  onGranularityChange,
  pairOrder,
  onPairOrderChange,
  punctuationBoundary,
  onPunctuationBoundaryChange,
  onReset,
  stats,
}: {
  preset: string;
  onPresetChange: (v: string) => void;
  granularity: Granularity;
  onGranularityChange: (v: Granularity) => void;
  pairOrder: PairOrder;
  onPairOrderChange: (v: PairOrder) => void;
  punctuationBoundary: boolean;
  onPunctuationBoundaryChange: (v: boolean) => void;
  onReset: () => void;
  stats: {
    inserts: number;
    deletes: number;
    updates: number;
    blocks: number;
    uniquePairs: number;
    pairedBoth: number;
    orphanInserts: number;
    orphanDeletes: number;
  } | null;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px',
        background: '#fafafa',
        borderBottom: '1px solid #e5e7eb',
        flexWrap: 'wrap',
      }}
    >
      <strong style={{ fontSize: 14 }}>Diff Playground</strong>

      <select
        value={preset}
        onChange={(e) => onPresetChange(e.target.value)}
        style={selectStyle}
      >
        {DIFF_PRESET_KEYS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>

      <Toggle
        label="Granularity"
        options={[
          { value: 'inline', label: 'inline' },
          { value: 'block', label: 'block' },
        ]}
        value={granularity}
        onChange={(v) => onGranularityChange(v as Granularity)}
      />

      <Toggle
        label="Pair order"
        options={[
          { value: 'delete-first', label: 'del → ins' },
          { value: 'insert-first', label: 'ins → del' },
        ]}
        value={pairOrder}
        onChange={(v) => onPairOrderChange(v as PairOrder)}
        disabled={granularity === 'inline'}
      />

      <label
        style={{
          fontSize: 12,
          color: granularity === 'inline' ? '#9ca3af' : '#374151',
          cursor: granularity === 'inline' ? 'not-allowed' : 'pointer',
        }}
      >
        <input
          type="checkbox"
          disabled={granularity === 'inline'}
          checked={punctuationBoundary}
          onChange={(e) => onPunctuationBoundaryChange(e.target.checked)}
          style={{ marginRight: 4 }}
        />
        punctuation-aware boundary
      </label>

      <button type="button" onClick={onReset} style={btnStyle}>
        Reset preset
      </button>

      {stats && (
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6b7280' }}>
          {stats.blocks} blocks · ins {stats.inserts} / del {stats.deletes} /
          upd {stats.updates} · {stats.uniquePairs} pair id
          {stats.uniquePairs === 1 ? '' : 's'} ({stats.pairedBoth} paired,{' '}
          {stats.orphanInserts + stats.orphanDeletes} orphan)
        </span>
      )}
    </div>
  );
}

function Toggle({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span style={{ fontSize: 12, color: '#6b7280' }}>{label}:</span>
      <div
        style={{
          display: 'inline-flex',
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid #d1d5db',
        }}
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.value)}
            style={{
              padding: '3px 10px',
              fontSize: 12,
              border: 'none',
              background: value === o.value ? '#2563eb' : '#fff',
              color: value === o.value ? '#fff' : '#374151',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DebugStrip({
  description,
  diff,
}: {
  description: string;
  diff: any[];
}) {
  const [showJson, setShowJson] = useState(false);

  // Group by pairId so we can see how the suggestion plugin would group them.
  const groups = useMemo(() => {
    const byId = new Map<string, any[]>();
    const orphans: any[] = [];
    for (const n of diff) {
      if (n?.pairId) {
        if (!byId.has(n.pairId)) byId.set(n.pairId, []);
        byId.get(n.pairId)!.push(n);
      } else if (n?.diffOperation) {
        orphans.push(n);
      }
    }
    return { byId, orphans };
  }, [diff]);

  return (
    <div
      style={{
        borderTop: '1px solid #e5e7eb',
        padding: '8px 16px',
        background: '#f9fafb',
        fontSize: 12,
        maxHeight: 240,
        overflow: 'auto',
        flexShrink: 0,
      }}
    >
      <div style={{ color: '#6b7280', marginBottom: 6 }}>{description}</div>

      {groups.byId.size > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 6,
          }}
        >
          {[...groups.byId.entries()].map(([id, nodes]) => (
            <div
              key={id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 6px',
                background: '#fff',
                border: '1px solid #d1d5db',
                borderRadius: 3,
              }}
            >
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: '#6b7280',
                }}
              >
                {id}
              </span>
              {nodes.map((n, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '0 4px',
                    borderRadius: 2,
                    background:
                      n.diffOperation?.type === 'insert'
                        ? '#d1fae5'
                        : n.diffOperation?.type === 'delete'
                          ? '#fee2e2'
                          : '#fef3c7',
                    color:
                      n.diffOperation?.type === 'insert'
                        ? '#065f46'
                        : n.diffOperation?.type === 'delete'
                          ? '#991b1b'
                          : '#92400e',
                  }}
                >
                  {n.diffOperation?.type}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowJson((s) => !s)}
        style={{ ...btnStyle, fontSize: 11 }}
      >
        {showJson ? 'Hide' : 'Show'} raw diff JSON
      </button>
      {showJson && (
        <pre
          style={{
            marginTop: 6,
            padding: 8,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 3,
            fontSize: 11,
            maxHeight: 160,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
          }}
        >
          {JSON.stringify(diff, null, 2)}
        </pre>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '3px 8px',
  borderRadius: 4,
  border: '1px solid #d1d5db',
  fontSize: 12,
  background: '#fff',
};

const btnStyle: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: 4,
  border: '1px solid #d1d5db',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 12,
};
