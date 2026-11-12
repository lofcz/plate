---
"@lofcz/platejs-markdown": patch
---

`htmlToJsx` no longer rewrites text inside quoted attribute values or JSX expressions. An activity named `"vazba C=O"` became `C="O"`, and words like `hidden` or `required` inside a value gained `="true"`. remark-mdx then threw and `deserializeMd` showed the whole document as raw text.
