import type { Descendant, Path } from 'platejs';

/**
 * How one changed region differs between two documents.
 *
 * - `insert` / `remove` / `replace`: a run of sibling blocks is swapped.
 * - `text`: one text block keeps its identity; only its inline content (and
 *   optionally its own properties) changed.
 * - `props`: a container keeps its children; only its own properties changed.
 */
export type AIEditGroupKind =
  | 'insert'
  | 'props'
  | 'remove'
  | 'replace'
  | 'text';

/** Character range `[start, end)` inside a block string. */
export type AIEditTextSpan = [start: number, end: number];

export interface AIEditTextDiff {
  /** Ranges of the new block string that were inserted or rewritten. */
  inserted: AIEditTextSpan[];
  /** Removed words, in order, joined by single spaces. */
  removed: string;
}

/** One changed region, addressed in both the before and the after tree. */
export interface AIEditGroup {
  kind: AIEditGroupKind;
  /** `[beforePath, afterPath]` of every ancestor element, outermost first. */
  ancestors: [before: Path, after: Path][];
  /** Index of the first affected child in the before parent. */
  beforeIndex: number;
  /** Index of the first affected child in the after parent. */
  afterIndex: number;
  /** Number of before siblings replaced (`1` for `text` and `props`). */
  removeCount: number;
  /** Number of after siblings inserted (`1` for `text` and `props`). */
  insertCount: number;
  /** Word-level text difference, for `text` groups. */
  text?: AIEditTextDiff;
}

export interface DiffAIEditOptions {
  /** Properties that never count as a change. `id` is always ignored. */
  isIgnoredProp?: (key: string) => boolean;
  /** Inline elements belong to their text block instead of forming a level. */
  isInline?: (node: Descendant) => boolean;
  /**
   * Node identity cache reused across diffs with the same `isIgnoredProp`.
   * Slate shares unchanged node objects between values, so repeated diffs of
   * one document only serialize what changed.
   */
  keyCache?: WeakMap<object, string>;
}

type Tree = {
  children?: Tree[];
  text?: string;
  type?: unknown;
  [key: string]: unknown;
};

const TEXT_SIMILARITY = 0.3;
const MAX_LCS_CELLS = 1_000_000;
const MAX_WORDS = 600;

/**
 * Structural difference between two documents as ordered, non-overlapping
 * change groups. Containers of the same type are paired and recursed into, so
 * a one-word edit inside a nested section yields one `text` group rather than
 * a replaced section. Pure: neither tree is mutated.
 */
export function diffAIEdit(
  before: Descendant[],
  after: Descendant[],
  options: DiffAIEditOptions = {}
): AIEditGroup[] {
  const ignored = options.isIgnoredProp;
  const isIgnored = (key: string) => key === 'id' || !!ignored?.(key);
  const isInline = options.isInline ?? (() => false);
  const keyOf = createNodeKey(isIgnored, options.keyCache);
  const stringOf = createNodeString();
  const groups: AIEditGroup[] = [];

  const isElement = (node: Tree): boolean => Array.isArray(node.children);
  const isContainer = (node: Tree): boolean =>
    isElement(node) &&
    node.children!.length > 0 &&
    node.children!.every(
      (child) => isElement(child) && !isInline(child as Descendant)
    );

  const pairable = (a: Tree, b: Tree): boolean => {
    if (!isElement(a) || !isElement(b) || a.type !== b.type) return false;
    const containers = isContainer(a);
    if (containers !== isContainer(b)) return false;
    if (containers) return true;
    return textSimilarity(stringOf(a), stringOf(b)) >= TEXT_SIMILARITY;
  };

  const visit = (old: Tree[], next: Tree[], ancestors: [Path, Path][]) => {
    const beforeParent = ancestors.at(-1)?.[0] ?? [];
    const afterParent = ancestors.at(-1)?.[1] ?? [];
    const interned = new Map<string, number>();
    const intern = (node: Tree) => {
      const key = keyOf(node);
      let id = interned.get(key);
      if (id === undefined) {
        id = interned.size;
        interned.set(key, id);
      }
      return id;
    };
    const a = old.map(intern);
    const b = next.map(intern);

    const pair = (i: number, j: number) => {
      const from = old[i];
      const to = next[j];
      if (a[i] === b[j]) return;
      const nested: [Path, Path] = [
        [...beforeParent, i],
        [...afterParent, j],
      ];
      if (isContainer(from)) {
        if (hasOwnPropChange(from, to, isIgnored))
          groups.push({
            kind: 'props',
            ancestors,
            beforeIndex: i,
            afterIndex: j,
            removeCount: 1,
            insertCount: 1,
          });
        visit(from.children!, to.children!, [...ancestors, nested]);
        return;
      }
      groups.push({
        kind: 'text',
        ancestors,
        beforeIndex: i,
        afterIndex: j,
        removeCount: 1,
        insertCount: 1,
        text: diffWords(stringOf(from), stringOf(to)),
      });
    };

    const gap = (
      beforeStart: number,
      beforeEnd: number,
      afterStart: number,
      afterEnd: number
    ) => {
      let bs = beforeStart;
      let be = beforeEnd;
      let as = afterStart;
      let ae = afterEnd;
      while (bs < be && as < ae && pairable(old[bs], next[as])) {
        pair(bs++, as++);
      }
      const tail: [number, number][] = [];
      while (be > bs && ae > as && pairable(old[be - 1], next[ae - 1])) {
        tail.unshift([--be, --ae]);
      }
      if (be > bs || ae > as)
        groups.push({
          kind: be === bs ? 'insert' : ae === as ? 'remove' : 'replace',
          ancestors,
          beforeIndex: bs,
          afterIndex: as,
          removeCount: be - bs,
          insertCount: ae - as,
        });
      for (const [i, j] of tail) pair(i, j);
    };

    let i = 0;
    let j = 0;
    for (const [mi, mj] of matchSequences(a, b)) {
      gap(i, mi, j, mj);
      i = mi + 1;
      j = mj + 1;
    }
    gap(i, a.length, j, b.length);
  };

  visit(before as Tree[], after as Tree[], []);
  return groups;
}

/** Stable, key-order-insensitive identity of a node, cached per object. */
function createNodeKey(
  isIgnored: (key: string) => boolean,
  cache = new WeakMap<object, string>()
) {
  const serialize = (value: unknown): string => {
    if (value === null || typeof value !== 'object')
      return JSON.stringify(value) ?? 'null';
    const cached = cache.get(value);
    if (cached !== undefined) return cached;
    let result: string;
    if (Array.isArray(value)) {
      result = `[${value.map(serialize).join(',')}]`;
    } else {
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record)
        .filter((key) => record[key] !== undefined && !isIgnored(key))
        .sort();
      result = `{${keys.map((key) => `${JSON.stringify(key)}:${serialize(record[key])}`).join(',')}}`;
    }
    cache.set(value, result);
    return result;
  };
  return serialize;
}

function createNodeString() {
  const cache = new WeakMap<object, string>();
  const stringOf = (node: Tree): string => {
    if (typeof node.text === 'string') return node.text;
    const cached = cache.get(node);
    if (cached !== undefined) return cached;
    const result = (node.children ?? []).map(stringOf).join('');
    cache.set(node, result);
    return result;
  };
  return stringOf;
}

function hasOwnPropChange(
  a: Tree,
  b: Tree,
  isIgnored: (key: string) => boolean
): boolean {
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (key === 'children' || key === 'text' || isIgnored(key)) continue;
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) return true;
  }
  return false;
}

/**
 * Longest common subsequence of two id sequences as matched index pairs.
 * Common prefix and suffix are matched without the quadratic table, so a
 * localized edit in a long document costs only its changed window.
 */
function matchSequences(a: number[], b: number[]): [number, number][] {
  const head: [number, number][] = [];
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) {
    head.push([start, start]);
    start++;
  }
  let endA = a.length;
  let endB = b.length;
  const tail: [number, number][] = [];
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    tail.unshift([--endA, --endB]);
  }
  const n = endA - start;
  const m = endB - start;
  if (n === 0 || m === 0 || n * m > MAX_LCS_CELLS) return [...head, ...tail];
  const width = m + 1;
  const table = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * width + j] =
        a[start + i] === b[start + j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }
  const middle: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[start + i] === b[start + j]) {
      middle.push([start + i, start + j]);
      i++;
      j++;
    } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) i++;
    else j++;
  }
  return [...head, ...middle, ...tail];
}

const tokenize = (text: string) => text.match(/\s+|[^\s]+/g) ?? [];

function lcsTokens(a: string[], b: string[]): boolean[][] | undefined {
  if (a.length > MAX_WORDS || b.length > MAX_WORDS) return;
  const width = b.length + 1;
  const table = new Uint16Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      table[i * width + j] =
        a[i] === b[j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
  const keptA = a.map(() => false);
  const keptB = b.map(() => false);
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      keptA[i++] = true;
      keptB[j++] = true;
    } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) i++;
    else j++;
  }
  return [keptA, keptB];
}

/**
 * How much of two strings survives, from 0 to 1: the better of shared words
 * and shared leading/trailing characters (so `change` → `changed` counts).
 */
export function textSimilarity(a: string, b: string): number {
  if (a === b) return a ? 1 : 0;
  if (!a || !b) return 0;
  let prefix = 0;
  while (prefix < a.length && a[prefix] === b[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < a.length - prefix &&
    suffix < b.length - prefix &&
    a.at(-1 - suffix) === b.at(-1 - suffix)
  )
    suffix++;
  const characters = (prefix + suffix) / Math.max(a.length, b.length);
  const wordsA = tokenize(a).filter((token) => token.trim());
  const wordsB = tokenize(b).filter((token) => token.trim());
  const kept = lcsTokens(wordsA, wordsB);
  if (!kept) return characters;
  const common = kept[0].filter(Boolean).length;
  return Math.max(characters, (2 * common) / (wordsA.length + wordsB.length));
}

/** Word-level difference: rewritten spans of `after` and the removed words. */
export function diffWords(before: string, after: string): AIEditTextDiff {
  const a = tokenize(before);
  const b = tokenize(after);
  const kept = lcsTokens(a, b);
  if (!kept) {
    let prefix = 0;
    while (prefix < before.length && before[prefix] === after[prefix]) prefix++;
    let suffix = 0;
    while (
      suffix < before.length - prefix &&
      suffix < after.length - prefix &&
      before.at(-1 - suffix) === after.at(-1 - suffix)
    )
      suffix++;
    return {
      inserted:
        after.length - suffix > prefix ? [[prefix, after.length - suffix]] : [],
      removed: before.slice(prefix, before.length - suffix).trim(),
    };
  }
  const [keptA, keptB] = kept;
  const inserted: AIEditTextSpan[] = [];
  let offset = 0;
  b.forEach((token, index) => {
    const end = offset + token.length;
    if (!keptB[index] && token.trim()) {
      const last = inserted.at(-1);
      // Merge words separated only by whitespace into one span.
      if (last && !after.slice(last[1], offset).trim()) last[1] = end;
      else inserted.push([offset, end]);
    }
    offset = end;
  });
  const removed = a
    .filter((token, index) => !keptA[index] && token.trim())
    .join(' ');
  return { inserted, removed };
}
