# CR-137: Distractor-aware feedback (misconception-explicit explanations)

Research: `docs/research/edu-apps/2026-W46.md` G2 - Zearn gives
"precise digital feedback at the moment of misconception"; DreamBox
adapts to the STRATEGY shown, not just right/wrong.

## Problem

math-vi explanations state the correct computation ("25 + 17 = 42")
but say nothing about WHY the chosen wrong option was tempting.
Our distractors are deliberately generated from error patterns
(off-by-one, wrong operation, place-value slip) - the generator knows
which misconception each distractor encodes but throws that away.

## Scope (proposal)

- Generator emits `distractor_rationale` per wrong choice:
  a one-line diagnosis ("Bạn có thể đã cộng nhầm thay vì trừ" /
  "42 - 19 = 23, không phải 33 - kiểm tra hàng đơn vị").
- `explanation_vi` keeps the canonical solution; rationale shows when
  the learner picks that specific option.
- Storage: extend `answer` jsonb (`answer.distractor_feedback[choice]`)
  - additive, no migration beyond a data update; ExamScreen renders
  it under the verdict.
- Optional visual: re-render the corrected bar model beside feedback
  (assets exist for many prompts already).

## Acceptance

- Every new math-vi row carries per-distractor rationale; backfill for
  existing rows via a script keyed on the generator's distractor rules.
- UI shows "Tại sao sai: ..." line for the chosen wrong option.
- Semantic guard covers rationale text (same rules as prompts).
- Full SDLC + external review.

## Status: IMPLEMENTED (cycle W46)

- Generator emits `answer.distractor_feedback` = {wrongValue: rationale}
  for every `Tinh:` row via a post-pass over distractor arithmetic
  (wrong-op, off-by-one, off-by-ten, divisor-vs-quotient).
- Migration `0081_distractor_feedback.sql`: score_bank_attempts returns
  `distractor_feedback` for the option actually picked - post-submit
  only, body is verbatim live def + v_fb plumbing (0079 lesson applied).
- `BankScore.distractor_feedback` -> `hydrateBankQuestion` ->
  `distractorFeedback` on BankScored -> practice verdict shows
  "Goi y: <rationale>" under the correct-answer line.
- Verified live: wrong pick on "Tinh: 338 + 45" returns
  "Ban cong nham them 1 chuc."; correct pick returns null.
- Upsert switched to merge-duplicates so regenerated rows pick up the
  new answer field (quarantined ids untouched).
