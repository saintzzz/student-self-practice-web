# CR-133 - International-standard visual models for math-vi

## What / Why
User (2026-11-10): hinh minh hoa de be hieu van de theo chuan quoc te.
Current diagrams (shapes, clocks, money, pies, emoji groups) cover the
pictorial layer for object-type questions, but the canonical
international primary-math models are missing:

- **Bar model / tape diagram** - the signature Singapore Math model
  (also Eureka Math, adopted in MOET-style problem solving). Maps
  exactly to Vietnamese word-problem types: part-whole, comparison
  (nhieu hon/it hon), ratio (gap k lan), equal parts (chia deu).
  Unknown is drawn as '?' - teaches the model without leaking.
- **Ten frame** - 2x5 grid, the standard g1-2 counting/number model.
- **Number bond** - part-part-whole circles, g1-2 composition.

227 word-problem questions currently have no image; most become
imaged under bar models.

## Scope
- lib-mathviz: barmodel (partWhole/compare/ratio/equalParts),
  tenFrame, numberBond renderers.
- publish-mathvi-assets.mjs: new prompt patterns for the word-problem
  frames (tong, hieu, ti so, chia deu); groups kept for small counts
  (concrete level below bar model - correct CPA ordering).
- No answer leaks: givens labeled, unknown shown as '?'.

## Estimate
1 session. Verify: DB link counts, SVG visual QA, prod screenshot.
