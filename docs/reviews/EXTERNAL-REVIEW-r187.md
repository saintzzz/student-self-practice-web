# External Review - Round 187 (codex)

Reviewer: codex (real external run). Scope: commit 67f87e4, HEAD=67f87e4.

1. [severity major] `scripts/lib-mathviz.mjs:355` - Each candidate diagram is scaled into a 168×98 SVG viewport, making its labels tiny when the full puzzle image is shown at normal size. Increase the candidate viewports or redesign the grid so the models remain readable to children.

2. [severity major] `src/components/ExamScreen.tsx:1665` - The puzzle image is rendered with `alt=""`, so screen readers cannot access the four models needed to answer the question. Provide accessible descriptions for each labeled model.

