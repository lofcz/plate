---
"@platejs/markdown": patch
---

Do not force-void HTML void names that are used as paired MDX components (`<source>…</source>`). The previous rewrite left a stray closing tag, remark-mdx threw, and deserializeMd dumped the whole document as raw paragraphs.
