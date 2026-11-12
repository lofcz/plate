const HTML_VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const HTML_BOOLEAN_ATTRIBUTES = new Map([
  ['checked', 'checked'],
  ['disabled', 'disabled'],
  ['readonly', 'readOnly'],
  ['required', 'required'],
  ['multiple', 'multiple'],
  ['hidden', 'hidden'],
]);

const BOOL_ATTR_REGEXES = Array.from(HTML_BOOLEAN_ATTRIBUTES.entries()).map(
  ([htmlAttr, jsxAttr]) => ({
    jsxAttr,
    reg: new RegExp(`(\\s|^)${htmlAttr}(\\s|/?>|$)`, 'gi'),
  })
);

const ATTR_RENAMES: [RegExp, string][] = [
  [/(\s)class=/g, '$1className='],
  [/(\s)for=/g, '$1htmlFor='],
];

/**
 * True HTML void usage (`<br>`, `<img src>`, `<source src>` with no body)
 * should become self-closing JSX. A matching close tag means the name is
 * being used as an MDX/JSX component with children — e.g. a custom
 * `<source>…</source>` excerpt. Forcing `/>` there leaves a stray
 * `</source>` that remark-mdx throws on; `deserializeMd` then swallows
 * the error and dumps the entire document as raw paragraphs.
 *
 * When another open of the same name appears before the next close, this
 * open is treated as void (HTML `<source>` inside `<video>` sitting
 * beside a later paired component).
 */
const shouldForceVoidClose = (
  source: string,
  tagName: string,
  afterOpenIndex: number
): boolean => {
  const rest = source.slice(afterOpenIndex);
  const nextOpen = rest.search(new RegExp(`<${tagName}\\b`, 'i'));
  const nextClose = rest.search(new RegExp(`<\\/${tagName}\\s*>`, 'i'));

  if (nextClose === -1) return true;
  if (nextOpen === -1) return false;

  return nextOpen < nextClose;
};

/**
 * End (exclusive) of the attribute value opening at `index`: a quoted value
 * (only right after `=`, as in HTML/JSX) or a `{…}` JSX expression. Returns
 * -1 when no value opens there or it never closes; the caller then treats
 * the character as plain attribute text, exactly as before.
 */
const protectedValueEnd = (
  text: string,
  index: number,
  afterEquals: boolean
): number => {
  const ch = text[index];

  if (ch === '"' || ch === "'") {
    if (!afterEquals) return -1;
    const end = text.indexOf(ch, index + 1);

    return end === -1 ? -1 : end + 1;
  }
  if (ch !== '{') return -1;

  let depth = 0;

  for (let i = index; i < text.length; i++) {
    const c = text[i];

    if (c === '"' || c === "'" || c === '`') {
      const end = text.indexOf(c, i + 1);

      if (end === -1) return -1;
      i = end;
    } else if (c === '{') {
      depth++;
    } else if (c === '}' && --depth === 0) {
      return i + 1;
    }
  }

  return -1;
};

const isSpace = (ch: string) =>
  ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f';

/**
 * Index of the `>` closing a tag whose attributes start at `from`. A `>`
 * inside a quoted value (`alt="a > b"`) or a JSX expression does not end
 * the tag. An unterminated value falls back to the first `>`.
 */
const findTagEnd = (source: string, from: number): number => {
  let afterEquals = false;

  for (let i = from; i < source.length; i++) {
    const ch = source[i];

    if (ch === '>') return i;

    const valueEnd = protectedValueEnd(source, i, afterEquals);

    if (valueEnd !== -1) {
      i = valueEnd - 1;
      afterEquals = false;
      continue;
    }
    if (ch === '=') afterEquals = true;
    else if (!isSpace(ch)) afterEquals = false;
  }

  return -1;
};

const MASKED_VALUE = /(["'{])\0(\d+)\0["'}]/g;

/**
 * Rewrite HTML attribute syntax to JSX. Quoted values and JSX expressions
 * are masked first: the rewrites below must only see attribute names and
 * unquoted values. Without the mask, `name="vazba C=O"` became
 * `name="vazba C="O""` and `title="Is hidden here"` gained a
 * `hidden="true"` in the middle of its text — remark-mdx then threw and
 * `deserializeMd` dumped the whole document as raw paragraphs.
 */
const rewriteAttributes = (attrs: string): string => {
  const values: string[] = [];
  let masked = '';
  let afterEquals = false;

  for (let i = 0; i < attrs.length; i++) {
    const valueEnd = protectedValueEnd(attrs, i, afterEquals);

    if (valueEnd !== -1) {
      const value = attrs.slice(i, valueEnd);
      const open = value[0]!;
      const close = open === '{' ? '}' : open;

      masked += `${open}\0${values.length}\0${close}`;
      values.push(value);
      i = valueEnd - 1;
      afterEquals = false;
      continue;
    }

    const ch = attrs[i]!;

    masked += ch;
    if (ch === '=') afterEquals = true;
    else if (!isSpace(ch)) afterEquals = false;
  }

  ATTR_RENAMES.forEach(([pattern, replacement]) => {
    masked = masked.replace(pattern, replacement);
  });

  masked = masked.replace(
    /(^|\s)([a-zA-Z0-9_-]+)=([^{ \t\n\r"'>]+?)(?=\s|\/?>|$)/g,
    '$1$2="$3"'
  );

  for (const { reg, jsxAttr } of BOOL_ATTR_REGEXES) {
    masked = masked.replace(reg, `$1${jsxAttr}="true"$2`);
  }

  return masked.replace(
    MASKED_VALUE,
    (_match, _open, index) => values[Number(index)]!
  );
};

const TAG_OPEN = /<([a-zA-Z0-9]+)\b/g;

export const legacyHtmlToJsx = (
  html: string,
  preserve?: (match: string) => boolean
): string => {
  if (!html || typeof html !== 'string') return html;

  const source = html.replace(/<!--([\s\S]*?)-->/g, '{/*$1*/}');
  let out = '';
  let cursor = 0;

  TAG_OPEN.lastIndex = 0;

  for (let open = TAG_OPEN.exec(source); open; open = TAG_OPEN.exec(source)) {
    const tagName = open[1]!;
    const attrsStart = open.index + open[0].length;
    const end = findTagEnd(source, attrsStart);

    if (end === -1) break;

    const match = source.slice(open.index, end + 1);

    TAG_OPEN.lastIndex = end + 1;
    if (preserve?.(match)) continue;

    const inner = source.slice(attrsStart, end);
    const selfClosing = inner.endsWith('/') ? '/' : '';
    const attrs = rewriteAttributes(selfClosing ? inner.slice(0, -1) : inner);
    const isVoidName = HTML_VOID_ELEMENTS.has(tagName.toLowerCase());
    const makeSelfClosing =
      isVoidName &&
      (selfClosing === '/' || shouldForceVoidClose(source, tagName, end + 1));
    const closing = makeSelfClosing ? ' /' : selfClosing;

    out += `${source.slice(cursor, open.index)}<${tagName}${attrs.trimEnd()}${closing}>`;
    cursor = end + 1;
  }

  return out + source.slice(cursor);
};
