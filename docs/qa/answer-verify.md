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
### Flagged-item salvage (CR-51 F8)
All 232 flagged items adjudicated into: salvage vs unfixable.

| Class | Count | Action |
|---|---:|---|
| text-answer with `{'boolean': True}` literal | 102 + 117 | converted to `true-false` (statement + boolean answer + True/False choices) |
| MCQ ambiguous distractors / off-theme answers | 76 | per-item distractor or context rewrite (see below) |
| visual-mcq `Option 4` placeholder | 2 | replaced with a plausible wrong-clock distractor |
| reorder missing word bank | 191 | unflagged (tiles derive from `answer.text` split; `tokens` column backfilled where source had them) |
| reorder 1-word answer ("Hi", "Goodbye.") | 4 | kept flagged - nothing to arrange |
| text-answer keyword tautologies | 16 | kept flagged |
| visual-count of abstracts ("How many weekends...") | 4 | kept flagged |
| constructed-response w/o usable rubric | 2 | kept flagged |
| "I like three." (non-sentence reorder) | 1 | kept flagged |

Net: 205 items restored to the serving pool, 27 kept flagged for
human review in `qb_review_queue`. Every restored item was re-checked
against the full deterministic audit - 32/32 checks at 0.

Also fixed in this pass: `answer.index` pointing at the wrong choice
after distractor rewrites (14 rows re-indexed), duplicated
`answer.accepted[]` entries (553 rows deduped), and 20 extra
duplicate-content groups unified under one `variant_group_id`.

### Form blueprint conformance
`qb-content-audit` gained `form-blueprint-size` + `form-blueprint-missing`.
62 unit-test forms were short of `targetQuestions` after flagged-question
drops; topped up with eligible same-grade+same-subject items (unit-matched
first, then grade pool) - 55 forms patched, +105 questions, answerKey
rebuilt for every added slot. All 270 forms now meet their blueprint.
