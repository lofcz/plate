---
"@lofcz/platejs-dnd": patch
---

Fix `onHoverNode` crash when `findPath` returns `undefined` for the hovered element.

Hover resolution can race against tree mutations: mid-drag deletion, reconcile
gaps, and portaled foreign elements all cause `editor.api.findPath(element)`
to return `undefined`. The previous code asserted it non-null with `!` and
passed the result straight to `PathApi.previous`, which then threw on
`path.length` and aborted the drag.

Now we null-check the resolved path explicitly and fall back to the hovered
node's top edge — same UX as having no previous sibling — instead of
crashing. Removes the need for downstream consumers to ship a try/catch
patch around this call site.
