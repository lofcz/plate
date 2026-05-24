import type { SlateEditor } from 'platejs';

import type { SerializeMdOptions } from './serializeMd';
import {
  serializeMdWithSourceMap,
  type MarkdownSourceMapSegment,
} from './serializeMdWithSourceMap';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

type SelectionPoint = {
  offset: number;
  path: number[];
};

export type SelectionRange = {
  anchor: SelectionPoint;
  focus: SelectionPoint;
};

export type ResolveSelectionByPathResult = {
  containsMdx: boolean;
  endLine: number;
  extractedMarkdown: string;
  markdown: string;
  /**
   * `false` when neither endpoint of the selection mapped to any segment
   * (e.g. stale paths after a concurrent edit). The line numbers in this
   * case are placeholders (1, 1) and the extracted markdown is empty.
   * Callers must check this flag before using the result; the previous
   * silent default produced invalid line-1 references.
   */
  resolved: boolean;
  segments: MarkdownSourceMapSegment[];
  startLine: number;
};

type ContainerExpandInput = {
  allSegments: MarkdownSourceMapSegment[];
  currentLine: number;
  direction: 'start' | 'end';
  leafSeg: MarkdownSourceMapSegment | null;
  selPath: number[];
};

const MDX_TAG_RE = /<[a-zA-Z_][\w.-]*/;

// -----------------------------------------------------------------------
// Path utilities
// -----------------------------------------------------------------------

/** `a` is an ancestor-or-self of `b`: a's path is a prefix of (or equal to) b's. */
const isAncestorOrSelf = (a: number[], b: number[]): boolean =>
  a.length <= b.length && a.every((v, i) => b[i] === v);

/**
 * Order two Slate selection points in document order.
 *
 * Slate selection points come in two flavours that previously got compared
 * incompatibly:
 *
 * - *Element-level*: `path` ends at an element, `offset` is the boundary
 *   index between its children (0 = before the first child, N = after the
 *   N-th child).
 * - *Leaf-level*: `path` descends into a text leaf, `offset` is a character
 *   index within that text.
 *
 * The previous implementation padded the shorter path with `0`s and then
 * fell back to comparing offsets — which only works when both points are
 * at the same depth. For mixed-depth points like `[3] offset 2`
 * (≈ "before child 2 of [3]") vs `[3, 1] offset 5` (≈ "inside child 1 of
 * [3]"), it returned the wrong order silently because the offsets are not
 * commensurate.
 *
 * Fix: when the shorter point is element-level, expand it to the leaf-level
 * coordinate space by treating its offset as the next path step ("before
 * child `offset`"), then continue path comparison. Offsets are only
 * compared when both points are at identical depth.
 */
export const comparePoints = (a: SelectionPoint, b: SelectionPoint): number => {
  const aPath = a.path;
  const bPath = b.path;
  const aLen = aPath.length;
  const bLen = bPath.length;
  const common = Math.min(aLen, bLen);

  for (let i = 0; i < common; i++) {
    if (aPath[i] !== bPath[i]) return aPath[i] - bPath[i];
  }

  if (aLen === bLen) {
    return a.offset - b.offset;
  }

  // One point is element-level (shorter path), the other descends deeper.
  // Treat the element-level offset as the child index of its next step:
  //   `{ path: [3], offset: 2 }` ≡ a boundary at child index 2 of [3].
  // The deeper point has `path[common]` as its actual child index at that
  // depth. Compare these — they live in the same coordinate space.
  // When indices are equal, the element-level point is at the boundary
  // *before* that child while the deeper point is strictly inside it, so
  // the element-level one comes first.
  if (aLen < bLen) {
    if (a.offset !== bPath[common]) return a.offset - bPath[common];
    return -1;
  }

  if (aPath[common] !== b.offset) return aPath[common] - b.offset;
  return 1;
};

// -----------------------------------------------------------------------
// Segment lookup by Slate path
// -----------------------------------------------------------------------

/**
 * Find the segment covering the start of a selection at `path`.
 *
 * 1. Ancestor-or-self: segment whose path is a prefix of `path` (most specific wins)
 * 2. First descendant: `path` is a prefix of segment's path (container selection)
 */
export const findStartSegment = (
  segments: MarkdownSourceMapSegment[],
  path: number[]
): MarkdownSourceMapSegment | null => {
  let best: MarkdownSourceMapSegment | null = null;
  let bestLen = -1;

  for (const seg of segments) {
    if (isAncestorOrSelf(seg.path, path) && seg.path.length > bestLen) {
      best = seg;
      bestLen = seg.path.length;
    }
  }

  if (best) return best;

  for (const seg of segments) {
    if (isAncestorOrSelf(path, seg.path)) return seg;
  }

  return null;
};

/**
 * Find the segment covering the end of a selection at `path`.
 *
 * Same as findStartSegment but for descendant matches picks the segment
 * with the LARGEST `endLine` (the container's deepest/latest child
 * segment). The previous implementation returned the last segment by
 * iteration order, which only happened to work because `allSegments` is
 * sorted by path today — any caller passing an unsorted array would
 * silently get the wrong range end.
 */
export const findEndSegment = (
  segments: MarkdownSourceMapSegment[],
  path: number[]
): MarkdownSourceMapSegment | null => {
  let best: MarkdownSourceMapSegment | null = null;
  let bestLen = -1;

  for (const seg of segments) {
    if (isAncestorOrSelf(seg.path, path) && seg.path.length > bestLen) {
      best = seg;
      bestLen = seg.path.length;
    }
  }

  if (best) return best;

  let latest: MarkdownSourceMapSegment | null = null;

  for (const seg of segments) {
    if (!isAncestorOrSelf(path, seg.path)) continue;
    if (!latest || seg.endLine > latest.endLine) {
      latest = seg;
    }
  }

  return latest;
};

// -----------------------------------------------------------------------
// Sub-line narrowing using selection offsets
// -----------------------------------------------------------------------

/** Recursively compute the total text length of a Slate node. */
const getTextLength = (node: any): number => {
  if (typeof node?.text === 'string') return node.text.length;

  if (Array.isArray(node?.children)) {
    return node.children.reduce(
      (sum: number, child: any) => sum + getTextLength(child),
      0
    );
  }

  return 0;
};

/** Walk the editor tree to reach the node at `path`. */
const getNodeAtPath = (editor: SlateEditor, path: number[]): any => {
  let node: any = { children: editor.children };

  for (const idx of path) {
    if (!node?.children?.[idx]) return null;
    node = node.children[idx];
  }

  return node;
};

/**
 * Compute the absolute character offset within a segment's text.
 *
 * Given a segment at `segPath` (e.g. [1,3,0] = a paragraph) and a selection
 * point at `selPath` (e.g. [1,3,0,1] = second text node) with `selOffset`,
 * sum up text lengths of all Slate nodes preceding the selection point within
 * the segment, then add `selOffset`.
 */
const computeAbsoluteOffset = (
  editor: SlateEditor,
  segPath: number[],
  selPath: number[],
  selOffset: number
): number | null => {
  const segNode = getNodeAtPath(editor, segPath);

  if (!segNode) return null;

  // The remaining path steps from segment root to the selection text node.
  const remainingPath = selPath.slice(segPath.length);

  if (remainingPath.length === 0) {
    // Selection is at the segment node itself (element-level point).
    // Offset is the child index — convert to text offset by summing
    // text of children before that index.
    let textOffset = 0;
    const children = segNode.children ?? [];

    for (let i = 0; i < Math.min(selOffset, children.length); i++) {
      textOffset += getTextLength(children[i]);
    }

    return textOffset;
  }

  let current: any = segNode;
  let accumulated = 0;

  for (const childIdx of remainingPath) {
    const children = current.children ?? [];

    // Sum text of all siblings before childIdx
    for (let i = 0; i < childIdx && i < children.length; i++) {
      accumulated += getTextLength(children[i]);
    }

    if (!children[childIdx]) return null;
    current = children[childIdx];
  }

  return accumulated + selOffset;
};

/**
 * Given a segment and an absolute text offset, determine which line within
 * the segment the offset falls on.
 */
const offsetToLine = (
  segText: string,
  segStartLine: number,
  absOffset: number
): number => {
  const clamped = Math.max(0, Math.min(absOffset, segText.length));
  const prefix = segText.slice(0, clamped);
  const newlines = (prefix.match(/\n/g) ?? []).length;

  return segStartLine + newlines;
};

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/**
 * Whether a segment supports sub-line narrowing. Only for kinds where text
 * content lines map 1:1 to markdown output lines (no structural wrappers
 * like code fences, MDX tags, or table delimiters).
 */
const NARROWABLE_KINDS = new Set([
  'paragraph',
  'heading',
  'list_item',
  'blockquote',
]);

const canNarrow = (seg: MarkdownSourceMapSegment): boolean =>
  NARROWABLE_KINDS.has(seg.kind);

const extractLines = (md: string, start: number, end: number): string =>
  md
    .split('\n')
    .slice(start - 1, end)
    .join('\n');

// -----------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------

/**
 * Resolve which markdown lines correspond to a Plate editor selection
 * using the source-map path mapping (no text matching).
 *
 * 1. Serializes editor to markdown with source-map segments
 * 2. Finds the segment matching the anchor path (longest prefix)
 * 3. Finds the segment matching the focus path
 * 4. Narrows to sub-line precision using selection offsets
 * 5. Returns the line range and extracted markdown
 */
/**
 * When the selection lands on a container path (e.g. clicking an MDX label),
 * look up the container segment in `allSegments` to include the MDX wrapper
 * lines (opening/closing tags) rather than just the inner content.
 */
const tryContainerExpand = ({
  allSegments,
  leafSeg,
  selPath,
  currentLine,
  direction,
}: ContainerExpandInput): number => {
  if (!leafSeg) return currentLine;

  // Only expand when the leaf was found via descendant fallback
  // (selection path is shorter than or equal to the leaf's path).
  if (selPath.length >= leafSeg.path.length) return currentLine;

  // Find the container segment in allSegments whose path matches the
  // selection path (or its closest ancestor).
  let containerSeg: MarkdownSourceMapSegment | null = null;
  let containerLen = -1;

  for (const seg of allSegments) {
    if (
      isAncestorOrSelf(seg.path, selPath) &&
      seg.path.length > containerLen &&
      seg !== leafSeg
    ) {
      containerSeg = seg;
      containerLen = seg.path.length;
    }
  }

  // Also try exact match on the selection path
  for (const seg of allSegments) {
    if (
      seg.path.length === selPath.length &&
      seg.path.every((v, i) => selPath[i] === v)
    ) {
      containerSeg = seg;
      break;
    }
  }

  if (!containerSeg) return currentLine;

  return direction === 'start'
    ? Math.min(currentLine, containerSeg.startLine)
    : Math.max(currentLine, containerSeg.endLine);
};

export const resolveSelectionByPath = (
  editor: SlateEditor,
  selection: SelectionRange,
  options?: Omit<SerializeMdOptions, 'editor'>
): ResolveSelectionByPathResult => {
  const { allSegments, markdown, segments } = serializeMdWithSourceMap(
    editor,
    options
  );

  const [start, end] =
    comparePoints(selection.anchor, selection.focus) <= 0
      ? [selection.anchor, selection.focus]
      : [selection.focus, selection.anchor];

  // Try leaf segments first for sub-line precision. If a leaf isn't available
  // for the selection path (e.g. when a serializer fails to emit one), fall
  // back to the full segment list which includes container blocks. This must
  // never silently default to line 1 — that produces invalid quote refs.
  const startSeg =
    findStartSegment(segments, start.path) ??
    findStartSegment(allSegments, start.path);
  const endSeg =
    findEndSegment(segments, end.path) ?? findEndSegment(allSegments, end.path);

  if (!startSeg && !endSeg) {
    return {
      containsMdx: false,
      endLine: 1,
      extractedMarkdown: '',
      markdown,
      resolved: false,
      segments,
      startLine: 1,
    };
  }

  let startLine = startSeg?.startLine ?? endSeg!.startLine;
  let endLine = endSeg?.endLine ?? startSeg!.endLine;

  // Sub-line narrowing: only for segment kinds where text lines correspond
  // directly to markdown lines (no structural wrappers like fences or MDX tags).
  if (
    startSeg &&
    startSeg.endLine > startSeg.startLine &&
    canNarrow(startSeg)
  ) {
    const absOffset = computeAbsoluteOffset(
      editor,
      startSeg.path,
      start.path,
      start.offset
    );

    if (absOffset !== null) {
      startLine = offsetToLine(startSeg.text, startSeg.startLine, absOffset);
    }
  }

  if (endSeg && endSeg.endLine > endSeg.startLine && canNarrow(endSeg)) {
    const absOffset = computeAbsoluteOffset(
      editor,
      endSeg.path,
      end.path,
      end.offset
    );

    if (absOffset !== null) {
      endLine = offsetToLine(endSeg.text, endSeg.startLine, absOffset);
    }
  }

  // When the selection is at a container level (e.g. starting from an MDX
  // label), expand to include the container's wrapper lines (opening/closing
  // MDX tags) from the full segment list.
  startLine = tryContainerExpand({
    allSegments,
    currentLine: startLine,
    direction: 'start',
    leafSeg: startSeg,
    selPath: start.path,
  });
  endLine = tryContainerExpand({
    allSegments,
    currentLine: endLine,
    direction: 'end',
    leafSeg: endSeg,
    selPath: end.path,
  });

  // Sanity: ensure startLine <= endLine
  if (startLine > endLine) {
    [startLine, endLine] = [endLine, startLine];
  }

  const extractedMarkdown = extractLines(markdown, startLine, endLine);

  const containsMdx =
    extractedMarkdown.includes('<') && MDX_TAG_RE.test(extractedMarkdown);

  return {
    containsMdx,
    endLine,
    extractedMarkdown,
    markdown,
    resolved: true,
    segments,
    startLine,
  };
};
