import type { Descendant, SlateEditor } from 'platejs';
import { getPluginKey, getPluginType, KEYS, TextApi } from 'platejs';
import { defaultHandlers, toMarkdown } from 'mdast-util-to-markdown';
import { unified } from 'unified';

import { buildMdastNode } from './convertNodesSerialize';
import { convertTextsSerialize } from './convertTextsSerialize';
import { getMergedOptionsSerialize } from './utils/getMergedOptionsSerialize';
import type { SerializeMdOptions } from './serializeMd';

type SelectionPath = number[];

interface SourceMapNode extends Record<string, unknown> {
  children?: SourceMapNode[];
  data?: {
    sourceMap?: SegmentSource;
  };
  type?: string;
}

type SegmentSource = {
  containsMdx: boolean;
  kind: MarkdownSourceMapKind;
  nodeId?: string;
  path: SelectionPath;
  pathKey: string;
  text: string;
};

export type MarkdownSourceMapKind =
  | 'block'
  | 'blockquote'
  | 'code_block'
  | 'heading'
  | 'list_item'
  | 'media'
  | 'paragraph'
  | 'table_cell';

export type MarkdownSourceMapSegment = {
  containsMdx: boolean;
  endLine: number;
  kind: MarkdownSourceMapKind;
  markdown: string;
  nodeId?: string;
  path: SelectionPath;
  pathKey: string;
  startLine: number;
  text: string;
};

export type SerializeMdSourceMapResult = {
  /** All segments including container-level (parent MDX) segments, sorted by path. */
  allSegments: MarkdownSourceMapSegment[];
  markdown: string;
  /** Leaf-level segments only (most precise per path). */
  segments: MarkdownSourceMapSegment[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const collectSlateText = (node: any): string => {
  if (typeof node === 'string') return node;
  if (node?.text != null) return node.text;
  if (Array.isArray(node?.children)) {
    return node.children.map(collectSlateText).join('');
  }
  return '';
};

const comparePaths = (a: SelectionPath, b: SelectionPath) => {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
};

const isPathPrefix = (prefix: SelectionPath, path: SelectionPath) =>
  prefix.length < path.length &&
  prefix.every((part, index) => path[index] === part);

const toPathKey = (path: SelectionPath) => path.join('.');

// ---------------------------------------------------------------------------
// Slate-tree annotation: attach __sourceMapPath to every node
// ---------------------------------------------------------------------------

const annotatePaths = (node: any, path: SelectionPath): any => {
  if (node == null || typeof node !== 'object') return node;
  const clone: any = { ...node, __sourceMapPath: path };
  if (Array.isArray(node.children)) {
    clone.children = node.children.map((child: any, i: number) =>
      annotatePaths(child, [...path, i])
    );
  }
  return clone;
};

// ---------------------------------------------------------------------------
// MDX propagation: after building mdast, mark children of MDX nodes
// ---------------------------------------------------------------------------

const MDX_MDAST_TYPES = new Set(['mdxJsxFlowElement', 'mdxJsxTextElement']);

const propagateMdxFlag = (node: SourceMapNode): void => {
  if (!node || typeof node !== 'object') return;
  if (node.data?.sourceMap) {
    node.data.sourceMap.containsMdx = true;
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      propagateMdxFlag(child);
    }
  }
};

// ---------------------------------------------------------------------------
// Node-kind detection from Slate node
// ---------------------------------------------------------------------------

// Structural containers whose children carry the quoteable content.
// These never produce their own segment.
const SEGMENT_SKIP_TYPES = new Set<string>([
  'table',
  'tr',
  KEYS.table,
  KEYS.tr,
  'column_group',
  'column',
  KEYS.columnGroup,
  KEYS.column,
]);

const MEDIA_TYPES = new Set<string>([
  'img',
  'image',
  'media_embed',
  'video',
  'audio',
  'file',
  'excalidraw',
  KEYS.img,
  KEYS.mediaEmbed,
  KEYS.video,
  KEYS.audio,
  KEYS.file,
  KEYS.excalidraw,
]);

const slateNodeKind = (
  node: any,
  editor: SlateEditor
): MarkdownSourceMapKind | null => {
  if (node.listStyleType) return 'list_item';

  const key = getPluginKey(editor, node.type) ?? node.type;

  if (KEYS.heading.includes(key as any) || key === 'heading') return 'heading';
  if (key === KEYS.blockquote) return 'blockquote';
  if (key === KEYS.codeBlock || key === 'code_block') return 'code_block';
  if (key === KEYS.td || key === KEYS.th) return 'table_cell';
  if (MEDIA_TYPES.has(key)) return 'media';

  const pType = getPluginType(editor, KEYS.p) ?? KEYS.p;
  if (node.type === pType) return 'paragraph';

  if (SEGMENT_SKIP_TYPES.has(key)) return null;

  // Inline elements (links, mentions, dates, etc.) occupy zero lines on
  // their own — they live inside a paragraph/heading and the containing
  // block already owns the line range. Emitting a separate `'block'`
  // segment for them confuses line-range math and creates spurious
  // selectable units. Trust the editor's `isInline` introspection.
  try {
    if (editor?.api?.isInline?.(node)) return null;
  } catch {
    // Defensive: editor.api.isInline can throw on partial editors used by
    // some tests. Fall through to the catch-all.
  }

  // Catch-all: any element node with children that isn't a known container.
  // Covers MDX components, callouts, toggles, equations, toc, date blocks,
  // and any future block type.
  if (Array.isArray(node.children)) return 'block';

  return null;
};

// ---------------------------------------------------------------------------
// Build SegmentSource from a Slate node
// ---------------------------------------------------------------------------

const buildSource = (node: any, editor: SlateEditor): SegmentSource | null => {
  if (!node || typeof node !== 'object' || !Array.isArray(node.children)) {
    return null;
  }

  const kind = slateNodeKind(node, editor);
  if (!kind) return null;

  const path: SelectionPath | null = Array.isArray(node.__sourceMapPath)
    ? node.__sourceMapPath
    : null;
  if (!path) return null;

  const text = collectSlateText(node);

  // Media and catch-all blocks may be void elements with no Slate text.
  // Empty text-centric blocks (empty paragraphs, etc.) still need segments
  // for accurate line mapping — they serialize to blank lines and anchoring
  // selections on them must resolve to the correct line number.

  return {
    containsMdx: false,
    kind,
    nodeId: typeof node.id === 'string' ? node.id : undefined,
    path,
    pathKey: toPathKey(path),
    text,
  };
};

const attachSource = (
  mdastNode: SourceMapNode,
  source: SegmentSource | null
) => {
  if (!source || !mdastNode || typeof mdastNode !== 'object') return mdastNode;
  mdastNode.data = { ...(mdastNode.data ?? {}), sourceMap: source };
  return mdastNode;
};

// ---------------------------------------------------------------------------
// Filtering helpers (mirror convertNodesSerialize)
// ---------------------------------------------------------------------------

const shouldIncludeText = (
  text: Record<string, unknown>,
  options: SerializeMdOptions
): boolean => {
  const { allowedNodes, allowNode, disallowedNodes } = options;
  if (
    allowedNodes &&
    disallowedNodes &&
    allowedNodes.length > 0 &&
    disallowedNodes.length > 0
  ) {
    throw new Error('Cannot combine allowedNodes with disallowedNodes');
  }
  for (const [key, value] of Object.entries(text)) {
    if (key === 'text') continue;
    if (allowedNodes) {
      if (!allowedNodes.includes(key as any) && value) return false;
    } else if (disallowedNodes?.includes(key as any) && value) {
      return false;
    }
  }
  if (allowNode?.serialize) return allowNode.serialize(text as any);
  return true;
};

const shouldIncludeNode = (node: any, options: SerializeMdOptions): boolean => {
  const { allowedNodes, allowNode, disallowedNodes } = options;
  if (!node.type) return true;
  if (
    allowedNodes &&
    disallowedNodes &&
    allowedNodes.length > 0 &&
    disallowedNodes.length > 0
  ) {
    throw new Error('Cannot combine allowedNodes with disallowedNodes');
  }
  if (allowedNodes) {
    if (!allowedNodes.includes(node.type)) return false;
  } else if (disallowedNodes?.includes(node.type)) {
    return false;
  }
  if (allowNode?.serialize) return allowNode.serialize(node);
  return true;
};

// ---------------------------------------------------------------------------
// Build mdast node with source-map metadata attached
// ---------------------------------------------------------------------------

/**
 * After building a table mdast node, attach sourceMap to individual cells by
 * walking the Slate table and mdast table in parallel.
 */
const attachTableCellSources = (
  mdastTable: SourceMapNode,
  slateTable: any,
  editor: SlateEditor
) => {
  const mdastRows = mdastTable.children || [];
  const slateRows = slateTable.children || [];

  for (let r = 0; r < Math.min(mdastRows.length, slateRows.length); r++) {
    const mdastCells = mdastRows[r]?.children || [];
    const slateCells = slateRows[r]?.children || [];

    for (let c = 0; c < Math.min(mdastCells.length, slateCells.length); c++) {
      const source = buildSource(slateCells[c], editor);
      if (source) attachSource(mdastCells[c], source);
    }
  }
};

/**
 * Custom serializers (e.g. MDX components) build their own mdast subtree,
 * bypassing convertNodesWithSource. Walk Slate and mdast element children
 * in parallel (by position) and attach sourceMap data so the handler
 * wrappers capture per-child segments during serialization.
 *
 * Position-based matching works because custom serializers preserve child
 * order. We filter to element children only (skip text/leaf nodes) in both
 * trees before zipping.
 */
/**
 * Walk the mdast list tree and attach sources from the flat Slate list
 * paragraphs. Slate uses flat paragraphs with `listStyleType` while mdast
 * nests them as list > listItem > paragraph. We walk both in document order
 * to zip them correctly.
 */
const attachListSources = (
  mdastList: SourceMapNode,
  slateListItems: any[],
  editor: SlateEditor,
  insideMdx: boolean
) => {
  // Build a Slate-path → node lookup for tag-based matching. Each paragraph
  // produced by `listToMdastTree` (and `listToMdastTreeWithSource`) is
  // tagged with `__sourceMapSlatePath` so we can match it back to its
  // originating Slate list paragraph without relying on iteration order.
  const slateByPath = new Map<string, any>();

  for (const item of slateListItems) {
    if (Array.isArray((item as any)?.__sourceMapPath)) {
      slateByPath.set(toPathKey((item as any).__sourceMapPath), item);
    }
  }

  // Positional fallback used only when an mdast paragraph has no
  // `__sourceMapSlatePath` tag (e.g. a custom serializer that builds its
  // own listItem subtree). Advancing once per non-list child is safe today
  // because every code path that calls `attachListSources` constructs
  // exactly one paragraph per Slate list item.
  let slateIdx = 0;

  const walkList = (list: SourceMapNode) => {
    if (!Array.isArray(list.children)) return;

    for (const listItem of list.children) {
      if (listItem.type !== 'listItem' || !Array.isArray(listItem.children))
        continue;

      for (const child of listItem.children) {
        if (child.type === 'list') {
          walkList(child);
          continue;
        }

        const taggedPath = (child as any).__sourceMapSlatePath;
        let slateChild: any = null;

        if (Array.isArray(taggedPath)) {
          slateChild = slateByPath.get(toPathKey(taggedPath)) ?? null;
        }

        if (!slateChild && slateIdx < slateListItems.length) {
          slateChild = slateListItems[slateIdx++];
        }

        if (!slateChild) continue;

        const source = buildSource(slateChild, editor);

        if (source) {
          if (insideMdx) source.containsMdx = true;
          attachSource(child, source);
        }
      }
    }
  };

  walkList(mdastList);
};

/**
 * Count the number of Slate list-paragraph slots a mdast list tree needs.
 *
 * Each non-`list` child of a `listItem` corresponds to exactly one Slate
 * list paragraph; nested `list` nodes recurse. This lets us consume exactly
 * the right slice of consecutive Slate list paragraphs for a given mdast
 * list, instead of greedily swallowing every list-styled Slate sibling.
 */
const countMdastListSlots = (list: any): number => {
  if (!list || !Array.isArray(list.children)) return 0;

  let count = 0;

  for (const listItem of list.children) {
    if (listItem.type !== 'listItem' || !Array.isArray(listItem.children)) {
      continue;
    }

    for (const child of listItem.children) {
      if (child?.type === 'list') {
        count += countMdastListSlots(child);
      } else {
        count += 1;
      }
    }
  }

  return count;
};

const pathsEqual = (a: SelectionPath, b: SelectionPath): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const attachDescendantSources = (
  mdastNode: SourceMapNode,
  slateNode: any,
  editor: SlateEditor,
  insideMdx: boolean
) => {
  // Only operate within MDX subtrees where custom serializers handle children.
  // Regular blocks (paragraphs, headings) have inline children (links, bold)
  // that shouldn't get separate segments.
  if (!insideMdx && !MDX_MDAST_TYPES.has(mdastNode?.type ?? '')) return;

  const slateChildren = slateNode?.children;
  const mdastChildren = mdastNode?.children;
  if (!Array.isArray(slateChildren) || !Array.isArray(mdastChildren)) return;

  const slateElements = slateChildren.filter(
    (c: any) => c?.type && Array.isArray(c.children)
  );

  // Path-based matching is preferred whenever the mdast carries the
  // `__sourceMapSlatePath` breadcrumb (planted by `buildMdastNode` and
  // `listToMdastTree`). It survives custom MDX serializers that inject,
  // drop, or reorder mdast children — the array-position zipper used to
  // silently drift in those cases.
  const consumedSlateIndices = new Set<number>();

  const attachSingleByMdast = (mdastChild: any, slateChild: any) => {
    const isMdx = insideMdx || MDX_MDAST_TYPES.has(mdastChild.type ?? '');
    const source = buildSource(slateChild, editor);

    if (source) {
      if (isMdx) source.containsMdx = true;
      attachSource(mdastChild, source);
    }

    if (mdastChild.type === 'table') {
      attachTableCellSources(mdastChild, slateChild, editor);
    } else if (insideMdx || MDX_MDAST_TYPES.has(mdastChild.type ?? '')) {
      attachDescendantSources(mdastChild, slateChild, editor, isMdx);
    }
  };

  // Pass 1: match every mdast child that has a `__sourceMapSlatePath`
  // breadcrumb to its tagged Slate child. Mark those Slate indices as
  // consumed so the positional fallback below skips them.
  for (const mdastChild of mdastChildren) {
    if (!mdastChild || !mdastChild.type || mdastChild.type === 'text') {
      continue;
    }

    const taggedPath = (mdastChild as any).__sourceMapSlatePath;
    if (!Array.isArray(taggedPath)) continue;

    const slateIdx = slateElements.findIndex(
      (c: any) =>
        Array.isArray(c.__sourceMapPath) &&
        pathsEqual(c.__sourceMapPath, taggedPath)
    );

    if (slateIdx === -1) continue;

    consumedSlateIndices.add(slateIdx);
    attachSingleByMdast(mdastChild, slateElements[slateIdx]);
  }

  // Pass 2: handle mdast `list` wrappers (which have no path of their own)
  // and any untagged mdast children. We walk Slate children in order and
  // match them positionally to remaining untagged mdast nodes. Lists
  // consume a contiguous run of list-styled Slate paragraphs equal to the
  // number of paragraph slots inside their mdast subtree — see
  // `countMdastListSlots`. Greedy consumption would starve every subsequent
  // mdast list when alternating list styles split the Slate run into
  // multiple mdast `list` nodes (e.g. ordered → bullet → ordered).
  let si = 0;

  const advanceToUnconsumed = () => {
    while (si < slateElements.length && consumedSlateIndices.has(si)) {
      si++;
    }
  };

  for (const mdastChild of mdastChildren) {
    if (!mdastChild || !mdastChild.type || mdastChild.type === 'text') {
      continue;
    }

    // Already handled in pass 1
    if (Array.isArray((mdastChild as any).__sourceMapSlatePath)) continue;

    if (mdastChild.type === 'list') {
      const slotsNeeded = countMdastListSlots(mdastChild);
      const listRun: any[] = [];

      for (let k = 0; k < slotsNeeded; k++) {
        advanceToUnconsumed();
        if (si >= slateElements.length) break;
        if (!slateElements[si].listStyleType) break;

        listRun.push(slateElements[si]);
        consumedSlateIndices.add(si);
        si++;
      }

      attachListSources(mdastChild, listRun, editor, insideMdx);
      continue;
    }

    advanceToUnconsumed();
    if (si >= slateElements.length) break;

    const slateChild = slateElements[si];
    consumedSlateIndices.add(si);
    si++;

    attachSingleByMdast(mdastChild, slateChild);
  }
};

const buildMdastNodeWithSource = (
  node: any,
  options: SerializeMdOptions,
  isBlock = false
): SourceMapNode => {
  let mdastNode = buildMdastNode(node, options, isBlock) as SourceMapNode;

  // If the serializer doesn't know this node type, fall back to emitting its
  // text content as a plain paragraph so it still appears in the markdown
  // output and is trackable by the source map.
  if (!mdastNode) {
    const text = collectSlateText(node);
    if (text.trim()) {
      mdastNode = {
        children: [{ type: 'text', value: text } as any],
        type: 'paragraph',
      };
    } else {
      const label = node.type ?? 'unknown';
      mdastNode = { type: 'html', value: `<!-- ${label} -->` } as any;
    }
  }

  // For tables, walk cells and attach per-cell sources
  if (mdastNode?.type === 'table') {
    attachTableCellSources(mdastNode, node, options.editor!);
    return mdastNode;
  }

  const source = buildSource(node, options.editor!);
  const isMdxOutput = MDX_MDAST_TYPES.has(mdastNode?.type ?? '');

  if (!source) {
    if (isMdxOutput) propagateMdxFlag(mdastNode);
    attachDescendantSources(mdastNode, node, options.editor!, isMdxOutput);
    return mdastNode;
  }

  if (isMdxOutput) {
    source.containsMdx = true;
  }

  if (
    source.kind === 'blockquote' &&
    Array.isArray(mdastNode?.children) &&
    mdastNode.children[0]
  ) {
    attachSource(mdastNode.children[0], source);
    return mdastNode;
  }

  attachSource(mdastNode, source);
  attachDescendantSources(mdastNode, node, options.editor!, isMdxOutput);
  return mdastNode;
};

// ---------------------------------------------------------------------------
// Convert Slate nodes → mdast tree with source-map metadata
// ---------------------------------------------------------------------------

const convertNodesWithSource = (
  nodes: Descendant[],
  options: SerializeMdOptions,
  isBlock = false
): SourceMapNode[] => {
  const mdastNodes: SourceMapNode[] = [];
  let textQueue: any[] = [];
  const listBlock: any[] = [];

  for (let i = 0; i <= nodes.length; i++) {
    const n = nodes[i] as any;

    if (n && TextApi.isText(n)) {
      if (shouldIncludeText(n, options)) textQueue.push(n);
      continue;
    }

    if (textQueue.length > 0) {
      mdastNodes.push(...(convertTextsSerialize(textQueue, options) as any));
    }
    textQueue = [];

    if (!n) continue;
    if (!shouldIncludeNode(n, options)) continue;

    const pType = getPluginType(options.editor!, KEYS.p) ?? KEYS.p;

    if (n?.type === pType && 'listStyleType' in n) {
      listBlock.push(n);

      const next = nodes[i + 1] as any;
      const isNextIndent =
        next && next.type === pType && 'listStyleType' in next;
      const firstList = listBlock.at(0);
      const hasDifferentListStyle =
        isNextIndent &&
        firstList &&
        next.listStyleType !== firstList.listStyleType &&
        next.indent === firstList.indent;

      if (!isNextIndent || hasDifferentListStyle) {
        mdastNodes.push(listToMdastTreeWithSource(listBlock as any, options));
        listBlock.length = 0;
      }
      continue;
    }

    const node = buildMdastNodeWithSource(n, options, isBlock);
    if (node) mdastNodes.push(node);
  }

  return mdastNodes;
};

// ---------------------------------------------------------------------------
// List → mdast tree with source-map metadata
// ---------------------------------------------------------------------------

const listToMdastTreeWithSource = (
  nodes: any[],
  options: SerializeMdOptions
): SourceMapNode => {
  const root: SourceMapNode = {
    children: [],
    ordered: nodes[0].listStyleType === 'decimal',
    spread: options.spread ?? false,
    start: nodes[0].listStart,
    type: 'list',
  };

  const indentStack: {
    indent: number;
    list: SourceMapNode;
    parent: SourceMapNode | null;
    styleType: any;
  }[] = [
    {
      indent: nodes[0].indent,
      list: root,
      parent: null,
      styleType: nodes[0].listStyleType,
    },
  ];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const currentIndent = node.indent;

    while (
      indentStack.length > 1 &&
      indentStack.at(-1)!.indent > currentIndent
    ) {
      indentStack.pop();
    }

    let stackTop = indentStack.at(-1)!;
    const hasSameIndentStyleChange =
      stackTop.indent === currentIndent &&
      stackTop.styleType !== node.listStyleType &&
      !!stackTop.parent;

    if (hasSameIndentStyleChange) {
      const siblingList: SourceMapNode = {
        children: [],
        ordered: node.listStyleType === 'decimal',
        spread: options.spread ?? false,
        start: node.listStart,
        type: 'list',
      };
      stackTop.parent!.children!.push(siblingList);
      indentStack[indentStack.length - 1] = {
        indent: currentIndent,
        list: siblingList,
        parent: stackTop.parent,
        styleType: node.listStyleType,
      };
      stackTop = indentStack.at(-1)!;
    }

    const paragraph: SourceMapNode = {
      children: convertNodesWithSource(node.children, options) as any,
      type: 'paragraph',
    };
    attachSource(paragraph, buildSource(node, options.editor!));

    const listItem: SourceMapNode = {
      checked: null,
      children: [paragraph],
      spread: options.spread ?? false,
      type: 'listItem',
    };

    if (node.listStyleType === 'todo' && node.checked !== undefined) {
      (listItem as any).checked = node.checked;
    }

    stackTop.list.children!.push(listItem);

    const nextNode = nodes[i + 1];
    if (nextNode && nextNode.indent > currentIndent) {
      const nestedList: SourceMapNode = {
        children: [],
        ordered: nextNode.listStyleType === 'decimal',
        spread: options.spread ?? false,
        start: nextNode.listStart,
        type: 'list',
      };
      listItem.children!.push(nestedList);
      indentStack.push({
        indent: nextNode.indent,
        list: nestedList,
        parent: listItem,
        styleType: nextNode.listStyleType,
      });
    }
  }

  return root;
};

// ---------------------------------------------------------------------------
// Extension handler utilities
// ---------------------------------------------------------------------------

const collectExtensionHandlers = (
  extensions: any[] | undefined,
  into: Record<string, any>
) => {
  if (!extensions) return into;
  for (const ext of extensions) {
    if (!ext) continue;
    if (Array.isArray(ext)) {
      collectExtensionHandlers(ext, into);
      continue;
    }
    if (Array.isArray(ext.extensions)) {
      collectExtensionHandlers(ext.extensions, into);
    }
    if (ext.handlers) {
      Object.assign(into, ext.handlers);
    }
  }
  return into;
};

/**
 * Strip `handlers` from extension objects so that `toMarkdown`'s `configure()`
 * won't overwrite our wrapped handlers while keeping `unsafe`, `join`, etc.
 */
const stripExtensionHandlers = (extensions: any[]): any[] =>
  extensions.map((ext) => {
    if (!ext) return ext;
    if (Array.isArray(ext)) return stripExtensionHandlers(ext);
    if (typeof ext !== 'object') return ext;
    const { handlers: _h, ...rest } = ext;
    if (Array.isArray(rest.extensions)) {
      rest.extensions = stripExtensionHandlers(rest.extensions);
    }
    return rest;
  });

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export const serializeMdWithSourceMap = (
  editor: SlateEditor,
  options?: Omit<SerializeMdOptions, 'editor'>
): SerializeMdSourceMapResult => {
  const mergedOptions = getMergedOptionsSerialize(editor, options);
  const rawValue = mergedOptions.value ?? editor.children;
  const value = rawValue.map((child, index) => annotatePaths(child, [index]));

  const mdast: SourceMapNode = {
    children: convertNodesWithSource(value, mergedOptions, true),
    type: 'root',
  };

  // Gather handlers from base + remark plugins.
  // freeze() runs attacher functions so they register toMarkdownExtensions data.
  const extensionProcessor = unified().use(mergedOptions.remarkPlugins ?? []);
  try {
    extensionProcessor.freeze();
  } catch {
    /* ignore missing compiler */
  }
  const extensions =
    (extensionProcessor.data('toMarkdownExtensions') as any[]) ?? [];
  const handlers: Record<string, any> = { ...defaultHandlers };
  collectExtensionHandlers(extensions, handlers);

  // Wrap every handler to capture line positions
  const segments: MarkdownSourceMapSegment[] = [];
  const wrappedHandlers: Record<string, any> = {};

  const pushSegment = (
    source: SegmentSource,
    emitted: string,
    startLine: number,
    endLine: number
  ) => {
    segments.push({
      containsMdx: source.containsMdx,
      endLine,
      kind: source.kind,
      markdown: emitted,
      nodeId: source.nodeId,
      path: source.path,
      pathKey: source.pathKey,
      startLine,
      text: source.text,
    });
  };

  for (const [type, handler] of Object.entries(handlers)) {
    wrappedHandlers[type] = (
      node: SourceMapNode,
      parent: any,
      state: any,
      info: any
    ) => {
      const startLine: number = info.now.line;
      const emitted: string = handler(node, parent, state, info);

      const source = node?.data?.sourceMap;
      if (source) {
        // Strip a trailing newline before counting lines. The standard
        // mdast-util-to-markdown block handlers don't emit trailing
        // newlines (block separation is added by the parent join logic),
        // but custom serializers — particularly MDX wrappers — sometimes
        // do. A trailing `\n` would inflate `endLine` by one and push the
        // segment past its actual content onto a blank line.
        //
        // NOTE: we intentionally DO NOT gate this push on `emitted.trim()`.
        // Block-level nodes (paragraphs, list items, table cells, etc.) may
        // serialize to empty content under user-provided `disallowedNodes`
        // filters — for example, a `<suggestion>`-wrapped paragraph that
        // is the *only* content of its block has all its text dropped
        // when `disallowedNodes: ['suggestion']` is configured. Skipping
        // the segment for those blocks left selections inside them with
        // no resolvable leaf, forcing `resolveSelectionByPath` to fall
        // back to the nearest ancestor segment — typically the *whole
        // surrounding container* (e.g. an entire lesson_activity). The
        // user's quote chip then advertises a line range vastly wider
        // than what they actually selected. Emitting a 1-line segment at
        // the empty block's actual position keeps that fallback tight.
        const normalized = emitted.replace(/(?:\r?\n|\r)+$/g, '');
        const newlineCount = normalized.split(/\r?\n|\r/g).length - 1;
        pushSegment(source, emitted, startLine, startLine + newlineCount);
      }

      // GFM table handler serializes cells via containerPhrasing, bypassing
      // state.handle(). Extract cell segments from attached sourceMap data.
      if (type === 'table' && Array.isArray(node?.children)) {
        for (let r = 0; r < node.children.length; r++) {
          // Row 0 = header line, row 1+ = data lines (delimiter row adds 1)
          const line = r === 0 ? startLine : startLine + 1 + r;
          const cells = node.children[r]?.children;
          if (!Array.isArray(cells)) continue;
          for (const cell of cells) {
            const cellSource = (cell as SourceMapNode)?.data?.sourceMap;
            if (cellSource) {
              pushSegment(cellSource, emitted, line, line);
            }
          }
        }
      }

      return emitted;
    };
  }

  // Pass extensions with handlers stripped so configure() applies unsafe/join
  // rules but doesn't overwrite our wrapped handlers.
  const markdown = toMarkdown(mdast as any, {
    emphasis: '_',
    ...(mergedOptions.remarkStringifyOptions ?? {}),
    extensions: stripExtensionHandlers(extensions),
    handlers: wrappedHandlers,
  });

  // De-duplicate: keep smallest (most precise) segment per path
  const deduped = new Map<string, MarkdownSourceMapSegment>();
  for (const seg of segments) {
    const existing = deduped.get(seg.pathKey);
    const span = seg.endLine - seg.startLine;
    const existingSpan = existing
      ? existing.endLine - existing.startLine
      : Number.POSITIVE_INFINITY;
    if (!existing || span <= existingSpan) {
      deduped.set(seg.pathKey, seg);
    }
  }

  // Sort by path and filter to leaf-level segments only
  const ordered = Array.from(deduped.values()).sort((a, b) =>
    comparePaths(a.path, b.path)
  );
  const leafSegments = ordered.filter(
    (seg) =>
      !ordered.some(
        (other) => other !== seg && isPathPrefix(seg.path, other.path)
      )
  );

  return { allSegments: ordered, markdown, segments: leafSegments };
};
