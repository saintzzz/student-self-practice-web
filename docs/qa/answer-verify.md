# Answer-correctness verification (LLM audit)

## Final state (2026-10-04)

Coverage: 11,312 eligible questions - all verified.

| Engine | Items | Notes |
|---|---|---|
| gemini-3.5-flash-lite | ~7,400 | first pass, stopped on HTTP 429 quota |
| SWE-2/Devin sessions (8 workers) | 3,862 | `qb_verify_todo` queue, SKIP LOCKED claiming, `qb_verify_report` RPC |
| adjudication pass (SWE-2 inline) | 127 flagged + 70 weak | two-pass confirm, ~60% of pass-1 flags were noise |

### Confirmed defects applied
- **218 questions flagged** (`practiceEligible/examEligible/mockEligible=false`,
  `review_status='flagged'`, held for human review):
  - ~130 malformed items: `{'boolean': True}` literal answers,
    text-answer "Which statement is correct?" with no choices,
    reorder items with no words, statements with no question,
    garbled reading passages ("a red yellow"), malformed English
    transcript ("This is a yellow.")
  - ~70 ambiguous: two+ valid answers (missing-letter, cloze,
    theme-match), questions with no unique answer
  - wrong answers: fractions (2/6 marked 2/3, 3/4 marked 2/3),
    equal-count tally marked 'red' vs 'none of these', etc.
- **68 explanations rewritten** (expl mismatched the answer: wrong
  object, wrong flag description, hallucinated arithmetic steps,
  wrong science claims - e.g. winter rainier than summer, whale is
  a fish, cloud = evaporation).
- **Forms repaired**: flagged slots swapped/dropped across 158 form
  patches total; final audit: `form-ineligible-question: 0`,
  `form-duplicate-variant: 0`, all P0/P1 checks = 0.

### Provider fallback (per CR-51 F7)
`qb-answer-verify.mjs` and `qb-answer-confirm.mjs` now walk
`gemini -> anthropic -> openai` (env keys; `AI_PROVIDER` pins one).
A 429/503 puts that provider on a 15-min cooldown and the batch moves
to the next provider instead of retrying a dead quota. With no direct
provider key, remaining items are seeded to `practice.qb_verify_todo`
for SWE-2/Devin session workers (`qb_verify_take`/`qb_verify_report`
RPCs - anon-key, token-gated; EXECUTE revoked after the run).

Historical smoke run below.

---
Generated: 2026-10-04T07:43:12.472Z
model: gemini-3.5-flash-lite | verified: 60/11312 eligible

## Wrong answers (0)

## Weak explanations (0)