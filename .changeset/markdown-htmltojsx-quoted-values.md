---
"@lofcz/platejs-markdown": patch
---

`htmlToJsx` no longer rewrites text inside quoted attribute values or JSX expressions. An activity named `"vazba C=O"` became `C="O"`, words like `hidden` or `required` gained `="true"`, and a `>` inside a quoted value ended the tag. remark-mdx then threw and `deserializeMd` showed the whole document as raw text.
