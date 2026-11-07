# CR-132 - Hình minh họa cho câu hỏi Toán (math-vi)

## What / Why
User feedback (2026-11-07): câu hỏi có hình đi kèm trông hay và sinh động.
English bank: 13% câu có hình (word-to-image). math-vi: 0%. Toán tiểu
học SGK luôn kèm hình cho hình học, đồng hồ, tiền, phân số, đếm - đây
là chuẩn sư phạm, không phải trang trí.

## Scope
- Deterministic SVG diagrams rendered alongside the generator - the
  frame already knows the semantics (clock time, shape dims, bill
  count) so the drawing is exact. Zero API cost, own-brand.
- Asset model reuses existing: `qb_assets` + `qb_question_assets` +
  `public/images/v6/math-vi/*.svg`; RPC asset_paths enrichment and the
  <img> prompt renderer need no changes.
- Only visual questions get images (geometry, time, money, fractions,
  counting word problems). Pure arithmetic stays text - noise hurts.
- alt_text in Vietnamese.

## Impact
- scripts/lib-mathviz.mjs (new), gen-template-mathvi.mjs (viz specs),
  publish-mathvi-assets.mjs (new), public/images/v6/math-vi/ (new dir),
  qb_assets + qb_question_assets rows.
- No schema change, no frontend change.

## Estimate
1 session. Verify: regen -> asset counts in DB -> prod screenshot of
imaged math-vi questions.
