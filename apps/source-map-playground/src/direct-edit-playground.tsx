import { useEffect, useRef, useState } from 'react';
import { LinkPlugin } from '@platejs/link/react';
import type { PlateElementProps } from 'platejs/react';
import {
  applyAnimatedAIEdit,
  type AnimatedAIEditOptions,
} from '@platejs/ai/react';
import { Plate, PlateContent, usePlateEditor } from 'platejs/react';
import { deserializeMd, EDITOR_PLUGINS } from './editor';

const original = Array.from(
  { length: 12 },
  (_, i) =>
    `## ${i + 1}. Learning together\n\nStudents explore the topic in pairs and share their observations.\n\nTake time to listen, discuss, and reflect on what you discovered.`
).join('\n\n');
const revised = original
  .replace('## 1. Learning together', '## 1. Start with a question ✨')
  .replace('## 6. Learning together', '## 6. Experiment and discover 🔬')
  .replace('## 12. Learning together', '## 12. Share your discoveries 🎉');

const directEditPlugins = EDITOR_PLUGINS.map((plugin) =>
  plugin.key === LinkPlugin.key
    ? LinkPlugin.withComponent(
        ({ attributes, children, element }: PlateElementProps) => (
          <a {...attributes} href={String(element.url ?? '')}>
            {children}
          </a>
        )
      )
    : plugin
);

export function DirectEditPlayground() {
  const editor = usePlateEditor({
    plugins: directEditPlugins,
    value: (ed) => deserializeMd(ed, original),
  });
  const [playing, setPlaying] = useState(false);
  const playback = useRef<ReturnType<typeof applyAnimatedAIEdit> | null>(null);
  useEffect(() => {
    const harness = {
      editor,
      setMarkdown(markdown: string) {
        editor.tf.setValue(deserializeMd(editor, markdown));
      },
      applyMarkdown(markdown: string) {
        return this.apply(deserializeMd(editor, markdown));
      },
      apply(
        value: typeof editor.children,
        options: AnimatedAIEditOptions = {}
      ) {
        playback.current = applyAnimatedAIEdit(editor, value, {
          label: 'ScioBot',
          ...options,
        });
        return playback.current.finished;
      },
    };
    Object.assign(window, { directEditPlayground: harness });
    return () => {
      playback.current?.cancel();
      Reflect.deleteProperty(window, 'directEditPlayground');
    };
  }, [editor]);
  const apply = (markdown = revised) => {
    setPlaying(true);
    playback.current = applyAnimatedAIEdit(
      editor,
      deserializeMd(editor, markdown),
      { label: 'ScioBot' }
    );
    void playback.current.finished.finally(() => setPlaying(false));
  };
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#f4f3fa',
      }}
    >
      <div
        style={{
          padding: '18px 28px',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <strong style={{ marginRight: 'auto' }}>Your AI writing partner</strong>
        <span role="status">
          {playing ? 'Editing your document…' : 'Ready'}
        </span>
        <button type="button" onClick={() => apply()}>
          Edit three sections
        </button>
        <button
          type="button"
          onClick={() =>
            apply(
              '**Parent meeting**\n\nDear families,\n\n- Date: Wednesday\n- Time: 17:00\n- Place: Classroom\n\n## Agenda\n\n' +
                Array.from(
                  { length: 12 },
                  (_, i) =>
                    `${i + 1}. Discuss learning, activities and questions ${i + 1}.`
                ).join('\n') +
                '\n\nThank you for joining us.'
            )
          }
        >
          Rewrite whole document
        </button>
        <button
          type="button"
          onClick={() => {
            playback.current?.cancel();
            editor.tf.undo();
          }}
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => {
            playback.current?.cancel();
            editor.tf.redo();
          }}
        >
          Redo
        </button>
        <button
          type="button"
          onClick={() => {
            playback.current?.cancel();
            editor.tf.setValue(deserializeMd(editor, original));
          }}
        >
          Reset
        </button>
      </div>
      <div
        data-testid="direct-edit-scroll"
        style={{
          overflowY: 'auto',
          flex: 1,
          minHeight: 0,
          padding: '48px 20px',
        }}
      >
        <div
          style={{
            background: 'white',
            maxWidth: 760,
            margin: 'auto',
            padding: '60px 70px',
            borderRadius: 12,
            boxShadow: '0 8px 50px #3523650c',
            font: '17px/1.8 system-ui',
            color: '#252138',
          }}
        >
          <Plate editor={editor}>
            <PlateContent aria-label="AI document" />
          </Plate>
        </div>
      </div>
    </div>
  );
}
