# CR-110 - Exam-form content repair + question-bank quality wave 2

Date: 2026-10-24 · Status: shipped (data patches applied + verified)

## What / why

`scripts/qb-content-audit.mjs` (CR-51/CR-104 audit wave) surfaced a new
defect class on the static exam-form path plus residual question-level
defects:

- `qb_exam_forms` payloads referenced **469 slots pointing at
  `review_status='rejected'` questions** (true-false 291, speaking 76,
  constructed-response 62, mcq 24, reorder 16). Teacher preview of
  diagnostic/midterm/final/unit-test/assignment forms therefore served
  quarantined content.
- **195 form questions had no `answerKey` entry** (plus stale/empty
  entries) - unscoreable slots.
- 10 served pool questions were real P0 defects (missing story,
  tautological answer-leak prompts, 2-choice mcq).
- 1,122 eligible questions were identical prompt+answer duplicates with
  no shared `variant_group_id`, so two copies could co-appear in one
  exam.
- Every g1/g2 English rubric item (speaking/writing, 12 rows) was
  blanket-rejected although canonical and sound - needed by the oral /
  writing sections of teacher forms.

## Changes

| Item | Mechanism |
|---|---|
| Quarantine 14 defect questions (10 P0 + 3 dup-choice + 1 short-explanation) | migrations 0062, 0063 |
| Restore 12 g1/g2 rubric items to `approved` | migration 0063 |
| "Turkiye" prompt accent fix | migration 0063 |
| Form repair: substitute 359 rejected slots, rebuild answerKey on 271 forms, 0 drops | `scripts/repair-form-refs.mjs` (run --apply) |
| Shared variant_group_id for 531 duplicate groups (1,122 rows) | `scripts/group-dup-prompts.mjs` (run --apply) |
| Audit heuristics corrected (see below) | `scripts/qb-content-audit.mjs` |

## Audit heuristic corrections (false-positive classes removed)

- `form-ineligible-question`: was flagging any non-pool-eligible member;
  pool flags do not apply to form membership (approved rubric items are
  legal in teacher forms). Now flags `review_status` rejected/draft only.
- `read-no-passage`: was flagging prompts that embed the passage inline;
  now only flags prompts too short to contain the passage (<150 chars
  after the "Read the ..." lead-in).
- `prompt-answer-leak`: now exempts the echo-response genre (quoted
  stimulus + "say back / đáp lại / reply" ask) where choosing the echo
  IS the skill.
- `prompt-answer-leak-unquoted`: only flags when the answer digit is the
  sole digit in the prompt (counting sequences / clock faces are
  contextual digits).
- `form-duplicate-variant`: fallback key now includes
  statement+passage+boolean answer - T/F items share a generic prompt.
- `duplicate-choices`: now scoped to eligible rows like every other check.
- `explanation-mentions-other-answer`: downgraded P1 -> P2 review queue
  (quoting distractors to contrast or gloss is correct pedagogy);
  exemption widened for `không phải` and multi-choice glossing.

## Verification (live, 2026-10-24)

- `qb-content-audit.mjs`: **every P0 check = 0** across 132,663 rows and
  292 forms. 5,595 form refs: 0 rejected, 0 missing questions, 0 missing
  answerKeys.
- Remaining findings are tracked, not defects:
  - P1 `explanation-not-vietnamese` 654 - diacritic-less Vietnamese;
    needs a content-generation pass (CR-sized, not mechanical).
  - P1 `ambiguous-open-prompt` 24 - manual review queue.
  - P1 `form-blueprint-missing` 22 - blueprint rows were never minted
    (`qb_exam_blueprints` empty); metadata debt, no serving impact.
  - P2 `ambiguous-country-name` 2 - prompts self-clarify ("America (the
    USA)", "South Korea").
  - P2 `explanation-mentions-other-answer` - review queue as designed.

## Out of scope / follow-ups

- Diacritics restoration for the 654 no-diacritics explanations
  (content-pipeline job).
- Minting `qb_exam_blueprints` rows or dropping the dangling
  `blueprint_id` references (22 forms).
- The standing 5% human spot-check of the bank remains manual.
