---
'@lofcz/platejs-diff': patch
---

Remove structural-key char aliasing from the diff engine. Aliasing two byte-unequal blocks onto one DMP char broke the char↔node bijection: `stringToNodes` resolved every occurrence to the first-registered node (duplicating its content over sibling blocks with the same key), and `structuralOldForChar` returned that single stashed node for every occurrence (cross-pairing untouched siblings into spurious rename updates). Prop-only updates (renames) are still detected — they now flow exclusively through the delete+insert replace path, where `pairBlocksWithWordHints`/`handleReplacePair` reconcile them into granular update marks using the real positional nodes.
