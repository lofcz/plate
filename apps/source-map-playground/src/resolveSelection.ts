import type { ResolveSelectionByPathResult, SelectionRange } from './editor';
import { resolveSelectionByPath } from './editor';

export type ResolvedSelection = {
  containsMdx: boolean;
  endLine: number;
  extractedMarkdown: string;
  segments: ResolveSelectionByPathResult['segments'];
  startLine: number;
};

export function resolveSelection(
  editor: any,
  _selection: SelectionRange | null
): ResolvedSelection | null {
  const selection = _selection;
  if (!selection) return null;

  const { anchor, focus } = selection;
  const collapsed =
    anchor.path.length === focus.path.length &&
    anchor.path.every((v: number, i: number) => v === focus.path[i]) &&
    anchor.offset === focus.offset;

  if (collapsed) return null;

  let result: ResolveSelectionByPathResult;

  try {
    result = resolveSelectionByPath(editor, selection);
  } catch (e) {
    console.error('[resolveSelection] crash:', e);

    return null;
  }

  if (!result.extractedMarkdown) {
    console.warn(
      '[resolveSelection] empty extractedMarkdown for',
      `anchor=[${anchor.path}]:${anchor.offset}`,
      `focus=[${focus.path}]:${focus.offset}`,
      `| segments: ${result.segments.length}`
    );

    return null;
  }

  return {
    containsMdx: result.containsMdx,
    endLine: result.endLine,
    extractedMarkdown: result.extractedMarkdown,
    segments: result.segments,
    startLine: result.startLine,
  };
}
