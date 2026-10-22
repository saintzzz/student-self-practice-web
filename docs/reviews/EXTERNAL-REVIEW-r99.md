# EXTERNAL-REVIEW r99 - CR-102 (server-side scoring moat)

- **Date:** 2026-10-21
- **Mechanism:** pinned cross-model reviewer subagent (reviewer-gpt) - Codex
  CLI quota exhausted until 2026-10-27; fallback path per AGENTS.md.
- **Scope:** uncommitted CR-102 diff - migrations 0046/0047 (strip_bank_row,
  score_bank_attempts, fetch_form/assignment_form wrappers, ACL fix),
  `bank.ts` keyless mapping + score client + hydration, `examSession.ts`
  bankId branches + unbankQuestion, `ExamScreen.tsx` async verdict +
  finishExam, `types/exam.ts` BankScored.

## Findings & triage

### BLOCKER - `{}` response discloses the structured key

- **Status:** FIXED (migration `0048_score_oracle_fixes`, applied).
- **Evidence:** an attempt with an empty response returned a wrong verdict
  plus the full `correct_answer` blob - one probe per key, not "up to 4
  guesses". 
- **Fix:** `correct_answer` now requires a type-appropriate response
  (`v_typed` gate per question_type). Skipped attempts still receive
  `correct_answer_text` + `explanation_vi` (the review sheet needs them);
  the richer leak (accepted[] variants, index values) requires a real
  typed attempt. Verified remote: `{}` -> `{correct:false,
  correct_answer:null, correct_answer_text, explanation_vi}`.
- **Honest economics documented in CR-102:** post-attempt disclosure is
  inherent (review pedagogy); the binding defense is the rate cap
  (~15h/36h saturated drain), not guess complexity.

### MAJOR - multi-`accepted` text-answer rows crashed the batch

- **Status:** FIXED (0048).
- **Evidence:** scalar subquery inside `IN(...)` -> "more than one row
  returned" abort for rows with >=2 accepted alternatives.
- **Fix:** `EXISTS` over `jsonb_array_elements_text` + `IS TRUE` on the
  primary-text comparison. Verified remote on row
  `g2-math-v6-edb5341d8270` (accepted ["10","10 cm"]): correct -> true,
  wrong -> false.
- **Bonus bug found + fixed during verification:** NULL verdicts leaked
  (`v_typed AND NULL` = NULL) when `answer->>'text'` was absent;
  comparisons now `IS TRUE` + `coalesce(v_correct,false)`.

### MAJOR - changed exam answer kept the old verdict

- **Status:** FIXED (`ExamScreen.tsx`, `examSession.ts`, `bank.ts`).
- **Evidence:** after hydration `bankVerdict` persisted across re-answers;
  `scoreBankAttempts` skips resolved questions, so a wrong->correct or
  correct->wrong change kept the stale verdict forever.
- **Fix:** `sameExamAnswer` detects changes; a changed bank answer clears
  `bankVerdict` in state AND rescores; `patchExamQuestion(hydrated, index,
  expected)` drops resolutions whose answer no longer matches
  (last-writer = newest answer); `finishExam` freezes input during the
  resolve window.

### MAJOR - index-only true/false keys scored + hydrated inverted

- **Status:** FIXED (0048 + `hydrateBankQuestion`).
- **Evidence:** SQL's text branch returned non-null FALSE for missing
  `answer->>'text'`, so the `{index:0}` choice fallback never ran -
  index-only keys scored inverted; hydration had the same blind spot.
- **Fix:** text branch yields NULL unless the key exists; validated
  choices/index fallback restored. Hydration now prefers
  `correct_answer_text` ('True'/'False' - derived from the fixed
  expected logic) with boolean/text/index key fallbacks. New unit test
  pins the index-only path.

### MAJOR - practice scoring failures were unhandled rejections

- **Status:** FIXED (`ExamScreen.tsx`).
- **Evidence:** the async practice block had `try/finally` but no `catch` -
  RPC failures (incl. rate limit) rejected silently; the kid saw a dead
  button with no retry signal.
- **Fix:** `catch` -> `setScoreError(true)` retry chip (copy made generic:
  re-tap the answer / re-tap NỘP BÀI); the recorded answer + cleared
  `verdictPendingRef` make re-tap a real retry; telemetry only records
  on success so no double-count.

## Verified clean areas

- Bank fetch rows contain no `answer`/`explanation_vi` post-0046 (remote).
- Helpers `bank_norm`/`bank_norm_answer` + `__impl` functions: postgres-only
  ACL post-0047.
- `qb_questions` RLS unchanged - authenticated admin policy only.
- Review replays: `unbankQuestion` strips bankId/verdict/bankCorrectText;
  hydrated real fields score locally offline.
- 51 focused tests green; tsc + build green.

## Verdict

Initial: **REJECT** (5 findings) -> all fixed + remotely verified.
Round 2 (reviewer-gpt, fix-diff): 4/6 fixes confirmed clean; 2 items -
(a) reorder `v_typed` gate accepted `{"text":null}`/`{"text":false}` ->
tightened to jsonb-typeof string/array (applied + file updated; cosmetic
since reorder keys stay on the wire by design, fixed anyway for
contract honesty); (b) TF hydration precedence nit -> reordered so
`correct_answer_text` wins cleanly.
Regression caught outside review: `finishExam` went fully async, breaking
8 existing tests that submit synchronously -> fast path added (no
pending verdicts = synchronous submit; oracle path only when needed).
Final: **APPROVE** - full suite 207 files / 1740 tests green, build
green, e2e 6/6 (exam-paper, cr100-hearts, engagement).
