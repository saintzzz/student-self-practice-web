# External Review - Round 188 (codex)

Reviewer: codex (real external run). Scope: commit 2d20fa4, HEAD=2d20fa4.

1. [severity major] `scripts/publish-mathvi-assets.mjs:122` - Asset IDs hash only the model, but the SVG also embeds its option letter. When the same model appears at a different index elsewhere, the deduplicated asset keeps the first letter, so the displayed A-D badge can disagree with its answer choice. Remove the badge from shared model assets or include the letter in the asset ID.

