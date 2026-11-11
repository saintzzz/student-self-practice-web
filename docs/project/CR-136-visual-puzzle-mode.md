# CR-136: Visual-first puzzle questions (model-first answering)

Research: `docs/research/edu-apps/2026-W46.md` G1 - ST Math's
spatial-temporal approach (1.3M students): concepts are learned
visually BEFORE symbols; the visual IS the question.

## Problem

math-vi visuals currently ILLUSTRATE a text question. World-class
products invert this: the child reasons about the model itself
("which bar shows 25 + 17?"), then maps to symbols. This builds
schema before language - especially valuable for weak readers and
concept-first learners, and is the piece our CPA coverage is missing
(we have pictorial SUPPORT, not pictorial QUESTIONS).

## Scope (proposal)

- New `question_type` or prompt family: model-first MCQ.
  - "Hình nào thể hiện 25 + 17?" - 3-4 candidate bar models, one correct.
  - "Hoàn thành sơ đồ tách-gộp" - number bond with a missing node.
  - "Cân nào cân bằng?" - balance-scale equality for early algebra.
  - "Tô đúng bao nhiêu phần?" - fraction-of-shape selection.
- Renderer: reuse `lib-mathviz.mjs` to emit the candidate models;
  store as asset-per-choice or one composite SVG with A/B/C/D labels.
- Bank: generator produces puzzle rows per grade (deterministic,
  same upsert semantics); semantic guard unchanged.
- Fetch: no RPC change if stored as normal mcq rows - the prompt text
  references the figure ("Hình nào..."), choices stay text or figure
  references. If choices must BE images, needs a small schema +
  ExamScreen render extension - decide in design phase.

## Acceptance

- >=30 visual-puzzle items per grade served in practice mode.
- Each has: correct model, plausible-wrong models (from known
  misconception shapes), VN explanation tying model->symbols.
- No answer leak through images (same rules as CR-132).
- Full SDLC: BA -> design (figure-choice UX) -> dev -> external review.
