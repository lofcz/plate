import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as monacoEditor } from 'monaco-editor';
import { Plate, PlateContent, usePlateEditor } from 'platejs/react';
import {
  deserializeMd,
  serializeMdWithSourceMap,
  EDITOR_PLUGINS,
} from './editor';
import type {
  MarkdownSourceMapSegment,
  SerializeMdSourceMapResult,
} from './editor';
import { resolveSelection, type ResolvedSelection } from './resolveSelection';
import { PRESETS } from './values';

type MonacoInstance = monacoEditor.IStandaloneCodeEditor;
const PRESET_KEYS = Object.keys(PRESETS);
const DEBOUNCE_MS = 150;

export function App() {
  const [preset, setPreset] = useState(PRESET_KEYS[0]);
  const [sourceMap, setSourceMap] = useState<SerializeMdSourceMapResult | null>(
    null
  );
  const [resolved, setResolved] = useState<ResolvedSelection | null>(null);
  const monacoRef = useRef<MonacoInstance | null>(null);
  const decorationsRef =
    useRef<monacoEditor.IEditorDecorationsCollection | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const initialValue = useMemo(() => PRESETS[preset], [preset]);

  const editor = usePlateEditor(
    {
      plugins: EDITOR_PLUGINS,
      value: (editor) => deserializeMd(editor, initialValue),
    },
    [initialValue]
  );

  const recompute = useCallback(() => {
    if (!editor) return;

    try {
      const smResult = serializeMdWithSourceMap(editor);
      setSourceMap(smResult);
    } catch (e) {
      console.error('[recompute] serializeMdWithSourceMap crashed:', e);
    }

    try {
      const res = resolveSelection(editor, editor.selection);
      setResolved(res);
    } catch (e) {
      console.error('[recompute] resolveSelection crashed:', e);
    }
  }, [editor]);

  const scheduleRecompute = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(recompute, DEBOUNCE_MS);
  }, [recompute]);

  // Set up the remapDomPoint callback and selectionchange listener.
  // The Slate patch calls editor.remapDomPoint when toSlatePoint fails —
  // returning the nearest Slate element lets the patch resolve to
  // Editor.start(editor, path) without modifying the physical DOM selection.
  useEffect(() => {
    if (!editor) return;

    (editor as any).remapDomPoint = (domNode: Node): HTMLElement | null => {
      let el = domNode instanceof HTMLElement ? domNode : domNode.parentElement;
      while (el) {
        if (el.hasAttribute('data-slate-editor')) break;
        if (el.hasAttribute('data-mdx-remap')) {
          return el.closest(
            '[data-slate-node="element"]'
          ) as HTMLElement | null;
        }
        el = el.parentElement;
      }
      return null;
    };

    const handler = () => scheduleRecompute();
    document.addEventListener('selectionchange', handler);

    return () => {
      (editor as any).remapDomPoint = undefined;
      document.removeEventListener('selectionchange', handler);
    };
  }, [editor, scheduleRecompute]);

  // Initial compute
  useEffect(() => {
    recompute();
  }, [recompute]);

  const handlePresetChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setPreset(e.target.value);
      setResolved(null);
    },
    []
  );

  const handleMonacoMount: OnMount = useCallback((ed) => {
    monacoRef.current = ed;
    decorationsRef.current = ed.createDecorationsCollection([]);
  }, []);

  // Highlight resolved lines in Monaco
  useEffect(() => {
    const ed = monacoRef.current;
    const coll = decorationsRef.current;
    if (!ed || !coll) return;

    if (!resolved) {
      coll.set([]);
      return;
    }

    coll.set([
      {
        range: {
          startLineNumber: resolved.startLine,
          startColumn: 1,
          endLineNumber: resolved.endLine,
          endColumn: 1000,
        },
        options: {
          isWholeLine: true,
          className: 'line-highlight-selected',
          glyphMarginClassName: 'glyph-selected',
        },
      },
    ]);

    ed.revealLineInCenterIfOutsideViewport(resolved.startLine);
  }, [resolved]);

  const markdown = sourceMap?.markdown ?? '';
  const segments = sourceMap?.segments ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <strong style={{ fontSize: 14 }}>Source Map Playground</strong>
        <select
          value={preset}
          onChange={handlePresetChange}
          style={selectStyle}
        >
          {PRESET_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <button type="button" onClick={recompute} style={btnStyle}>
          Recompute
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888' }}>
          {segments.length} segments &middot; {markdown.split('\n').length}{' '}
          lines
        </span>
      </div>

      {/* Main split */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: Monaco (serialized markdown) */}
        <div
          style={{
            flex: 1,
            borderRight: '1px solid #e0e0e0',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={paneLabelStyle}>Serialized Markdown</div>
          <div style={{ flex: 1 }}>
            <Editor
              defaultLanguage="markdown"
              value={markdown}
              theme="vs"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                glyphMargin: true,
                fontSize: 13,
              }}
              onMount={handleMonacoMount}
            />
          </div>
        </div>

        {/* Right: Live Plate editor + debug info */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={paneLabelStyle}>
            Plate Editor
            <span style={{ fontWeight: 400, color: '#999', marginLeft: 8 }}>
              Select text to see resolved markdown lines
            </span>
          </div>

          {/* Plate editor */}
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px' }}>
            <Plate
              editor={editor}
              onSelectionChange={scheduleRecompute}
              onValueChange={scheduleRecompute}
            >
              <PlateContent
                style={{ outline: 'none', minHeight: 200 }}
                placeholder="Type or paste content..."
              />
            </Plate>
          </div>

          {/* Debug panel */}
          <DebugPanel
            resolved={resolved}
            segmentCount={segments.length}
            selection={editor?.selection ?? null}
            slateChildren={editor?.children ?? []}
          />
        </div>
      </div>

      <style>{`
        .line-highlight-selected { background: rgba(59, 130, 246, 0.18) !important; }
        .glyph-selected { background: #3b82f6; width: 4px !important; margin-left: 3px; border-radius: 2px; }
      `}</style>
    </div>
  );
}

function DebugPanel({
  resolved,
  segmentCount,
  selection,
  slateChildren,
}: {
  resolved: ResolvedSelection | null;
  segmentCount: number;
  selection: any;
  slateChildren: any[];
}) {
  const [showSlate, setShowSlate] = useState(false);
  const [showAllBlocks, setShowAllBlocks] = useState(false);

  return (
    <div style={debugPanelStyle}>
      {selection && (
        <div style={{ marginBottom: 8, fontSize: 11, color: '#888' }}>
          Selection: anchor=[{selection.anchor.path.join(',')}]:
          {selection.anchor.offset}
          {' → '}focus=[{selection.focus.path.join(',')}]:
          {selection.focus.offset}
        </div>
      )}

      {resolved ? (
        <>
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              marginBottom: 8,
            }}
          >
            <DebugField label="startLine" value={resolved.startLine} />
            <DebugField label="endLine" value={resolved.endLine} />
            <DebugField
              label="containsMdx"
              value={String(resolved.containsMdx)}
            />
            <DebugField
              label="touched segments"
              value={
                resolved.segments.filter(
                  (s: MarkdownSourceMapSegment) =>
                    s.startLine >= resolved.startLine &&
                    s.endLine <= resolved.endLine
                ).length
              }
            />
            <DebugField
              label="total segments"
              value={resolved.segments.length}
            />
          </div>

          <div
            style={{
              fontWeight: 600,
              marginBottom: 4,
              fontSize: 11,
              color: '#666',
            }}
          >
            Touched segments (source-map path-based):
          </div>
          <div style={{ maxHeight: 80, overflow: 'auto', marginBottom: 8 }}>
            {resolved.segments
              .filter(
                (s: MarkdownSourceMapSegment) =>
                  s.startLine >= resolved.startLine &&
                  s.endLine <= resolved.endLine
              )
              .map((seg: MarkdownSourceMapSegment, i: number) => (
                <SegmentRow key={i} segment={seg} />
              ))}
          </div>

          <div
            style={{
              fontWeight: 600,
              marginBottom: 4,
              fontSize: 11,
              color: '#666',
            }}
          >
            Extracted markdown (what the AI would see):
          </div>
          <pre style={extractedStyle}>{resolved.extractedMarkdown}</pre>

          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setShowAllBlocks(!showAllBlocks)}
              style={{ ...btnStyle, fontSize: 11 }}
            >
              {showAllBlocks ? 'Hide' : 'Show'} all {resolved.segments.length}{' '}
              segments
            </button>
            {showAllBlocks && (
              <div style={{ maxHeight: 140, overflow: 'auto', marginTop: 4 }}>
                {resolved.segments.map(
                  (seg: MarkdownSourceMapSegment, i: number) => (
                    <SegmentRow key={i} segment={seg} />
                  )
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <span style={{ color: '#aaa' }}>
          Select text in the Plate editor to see resolved quote info.
          {segmentCount > 0 &&
            ` (${segmentCount} source map segments available)`}
        </span>
      )}

      <div style={{ marginTop: 8, borderTop: '1px solid #eee', paddingTop: 8 }}>
        <button
          type="button"
          onClick={() => setShowSlate(!showSlate)}
          style={{ ...btnStyle, fontSize: 11 }}
        >
          {showSlate ? 'Hide' : 'Show'} Slate JSON ({slateChildren.length}{' '}
          nodes)
        </button>
        {showSlate && (
          <pre style={{ ...extractedStyle, maxHeight: 200, marginTop: 4 }}>
            {JSON.stringify(slateChildren, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function DebugField({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div style={{ fontSize: 12, fontFamily: 'monospace' }}>
      <span style={{ color: '#888' }}>{label}:</span>{' '}
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function SegmentRow({ segment }: { segment: MarkdownSourceMapSegment }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontFamily: 'monospace',
        padding: '2px 0',
        display: 'flex',
        gap: 6,
      }}
    >
      <Tag color={kindColor(segment.kind)}>{segment.kind}</Tag>
      <span style={{ color: '#999' }}>[{segment.path.join(',')}]</span>
      <span>
        L{segment.startLine}–{segment.endLine}
      </span>
      <span
        style={{
          color: '#666',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 300,
        }}
      >
        {segment.text || '(empty)'}
      </span>
    </div>
  );
}

function Tag({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  return (
    <span
      style={{
        background: `${color}22`,
        color,
        padding: '0 5px',
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

function kindColor(kind: string) {
  const map: Record<string, string> = {
    heading: '#2563eb',
    paragraph: '#16a34a',
    list_item: '#ca8a04',
    blockquote: '#9333ea',
    code_block: '#dc2626',
    table_cell: '#0891b2',
    media: '#ea580c',
    block: '#c084fc',
  };
  return map[kind] ?? '#6b7280';
}

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 16px',
  borderBottom: '1px solid #e0e0e0',
  background: '#fafafa',
};

const selectStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 4,
  border: '1px solid #ccc',
  fontSize: 13,
};

const btnStyle: React.CSSProperties = {
  padding: '4px 12px',
  borderRadius: 4,
  border: '1px solid #ccc',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 13,
};

const paneLabelStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 600,
  color: '#666',
  borderBottom: '1px solid #e0e0e0',
  background: '#fafafa',
  flexShrink: 0,
};

const debugPanelStyle: React.CSSProperties = {
  borderTop: '1px solid #e0e0e0',
  padding: 12,
  fontSize: 12,
  fontFamily: 'monospace',
  background: '#f9fafb',
  maxHeight: 320,
  overflow: 'auto',
  flexShrink: 0,
};

const extractedStyle: React.CSSProperties = {
  whiteSpace: 'pre-wrap',
  color: '#333',
  background: '#f0f0f0',
  padding: 8,
  borderRadius: 4,
  maxHeight: 120,
  overflow: 'auto',
  fontSize: 12,
  margin: 0,
};
