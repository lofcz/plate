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
 * (only right after `=`, as in HTML/JSX) or a `{…}` JSX expression. A quote
 * with no closing partner runs to the end: the tag match stops at the first
 * `>`, so `title="a > b"` arrives here as `title="a `. Returns -1 when no
 * value opens there or a JSX expression never closes.
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

    return end === -1 ? text.length : end + 1;
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

  // Trim before restoring so whitespace inside a cut value survives.
  return masked
    .trimEnd()
    .replace(MASKED_VALUE, (_match, _open, index) => values[Number(index)]!);
};

export const legacyHtmlToJsx = (
  html: string,
  preserve?: (match: string) => boolean
): string => {
  if (!html || typeof html !== 'string') return html;

  return html
    .replace(/<!--([\s\S]*?)-->/g, '{/*$1*/}')
    .replace(
      /<([a-zA-Z0-9]+)\b([^>]*?)(\/?)>/gi,
      (_match, tagName, attrs, selfClosing, offset, source) => {
        if (preserve?.(_match)) return _match;

        const a = rewriteAttributes(attrs);
        const isVoidName = HTML_VOID_ELEMENTS.has(tagName.toLowerCase());
        const makeSelfClosing =
          isVoidName &&
          (selfClosing === '/' ||
            shouldForceVoidClose(source, tagName, offset + _match.length));
        const closing = makeSelfClosing ? ' /' : selfClosing;

        return `<${tagName}${a}${closing}>`;
      }
    );
};
