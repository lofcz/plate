const VOID_ELEMENTS = new Set([
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

const BOOL_ATTRS = new Map([
  ['checked', 'checked'],
  ['disabled', 'disabled'],
  ['readonly', 'readOnly'],
  ['required', 'required'],
  ['multiple', 'multiple'],
  ['hidden', 'hidden'],
]);

const BOOL_ATTR_REGEXES = Array.from(BOOL_ATTRS.entries()).map(
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

export const htmlToJsx = (html: string): string => {
  if (!html || typeof html !== 'string') return html;

  return html
    .replace(/<!--([\s\S]*?)-->/g, '{/*$1*/}')
    .replace(
      /<([a-zA-Z0-9]+)\b([^>]*?)(\/?)>/gi,
      (match, tagName, attrs, selfClosing, offset, source) => {
        let a = attrs;

        ATTR_RENAMES.forEach(([pattern, replacement]) => {
          a = a.replace(pattern, replacement);
        });

        a = a.replace(
          /(^|\s)([a-zA-Z0-9_-]+)=([^{ \t\n\r"'>]+?)(?=\s|\/?>|$)/g,
          '$1$2="$3"'
        );

        for (const { reg, jsxAttr } of BOOL_ATTR_REGEXES) {
          a = a.replace(reg, `$1${jsxAttr}="true"$2`);
        }

        const isVoidName = VOID_ELEMENTS.has(tagName.toLowerCase());
        const makeSelfClosing =
          isVoidName &&
          (selfClosing === '/' ||
            shouldForceVoidClose(source, tagName, offset + match.length));
        const closing = makeSelfClosing ? ' /' : selfClosing;

        return `<${tagName}${a.trimEnd()}${closing}>`;
      }
    );
};
