---
"@lofcz/platejs-markdown": patch
"@lofcz/platejs-utils": patch
---

Support GFM-style `<callout type="tip|note|warning|important|caution">` in markdown (de)serialization. MDX `type` maps to the callout `variant` so it no longer clobbers the Plate element type; serialize emits `type=` instead of legacy `variant=`.
