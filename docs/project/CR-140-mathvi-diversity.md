# CR-140: math-vi diversity + higher-order remediation

## Why
User report: bank dominated by repetitive "Nam hái 30 quả..." frames and bare
arithmetic drill - low diversity, low challenge, not truly quality content.
Audit confirmed ~45% of serving bank was `Tính: a±b×÷` shapes plus a handful
of repeated word-problem frames.

## Scope
- 12 new grade-gated higher-order families in gen-template-mathvi.mjs:
  find-the-error, choose-the-operation, estimate/round-to-ten, divisibility,
  multiplicative comparison, time-context, change/money, unit conversion,
  place-value composition, age-comparison, compare-expressions, inverse
  ("của X là"), two-step word problems.
- Serving cap: max 12 items per (grade, normalized-prompt-shape); surplus
  drill rows rejected (354 rows, history retained).
- Semantic guards unchanged; all new prompts use full classifier forms.

## Verified
- Serving bank: 1298 rows, 353 distinct shapes (was 158), bare drill 12%.
- Semantic guard passes all 5 grades.

## Extended scope (all subjects)
- math (toán tiếng Anh): same shape-cap-12 quarantine - 43,267 surplus
  drill rows rejected (52.4k -> ~9.2k live; "# + # = ___" was x4,950 in G2).
- science: literal prompt+answer dedupe - 4,710 duplicate rows rejected.
- english: literal prompt+answer dedupe - 5,795 duplicate rows rejected
  (prompt-only key NOT used: image-MCQ rows share prompt text but differ
  by answer/asset).
- All quarantines set review_status='rejected' + all serving flags off,
  history retained. Total this CR: ~54k rows curated out of serving.
