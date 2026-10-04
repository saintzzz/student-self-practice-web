# Question Bank Content Audit

Generated: 2026-10-04T11:31:17.776Z · rows: 11406 · regenerate: `node scripts/qb-content-audit.mjs`

| Check | Sev | Count | What it catches |
|---|---|---|---|
| `listen-no-transcript` | P0 | **0** | Prompt says Listen but no transcript/audio - unanswerable |
| `read-no-passage` | P0 | **0** | Prompt references a passage/text but none stored - unanswerable |
| `visual-no-assets` | P0 | **0** | Image question type with no linked assets |
| `answer-out-of-range` | P0 | **0** | answer.index points outside choices array |
| `choices-too-few` | P0 | **0** | MCQ-type with fewer than 3 choices |
| `option-placeholder` | P0 | **0** | A choice is a literal generator placeholder like "option-4" |
| `prompt-answer-leak` | P0 | **0** | Prompt literally contains the quoted correct answer (guessable without skill) |
| `explanation-missing` | P0 | **0** | No explanation at all |
| `explanation-template-residue` | P0 | **0** | Leftover generator template text |
| `wrong-answer-math` | P0 | **0** | Marked answer contradicts the computed value of the prompt |
| `wrong-comparison-answer` | P0 | **0** | Compare X and Y items: marked answer wrong for the numbers |
| `reorder-bank-mismatch` | P0 | **0** | Reorder prompt word bank is not a permutation of the answer sentence |
| `text-answer-empty` | P0 | **0** | text-answer item has no usable answer text or accepted list |
| `dup-option-assets` | P0 | **0** | Two options reference the same image asset (visually identical choices) |
| `prompt-placeholder` | P0 | **0** | Prompt contains placeholder tokens (undefined/null/TODO) |
| `form-missing-question` | P0 | **0** | Form references a question id that does not exist |
| `form-ineligible-question` | P0 | **0** | Form includes a question not eligible for serving (flagged/excluded) |
| `form-missing-answerkey` | P0 | **0** | Form question has no entry in answerKey |
| `form-answerkey-mismatch` | P0 | **0** | Form answerKey disagrees with the question stored answer |
| `form-duplicate-variant` | P0 | **0** | Two questions in the same form share a variant group or identical content |
| `duplicate-choices` | P1 | **0** | Two identical choices in one question |
| `explanation-too-short` | P1 | **0** | Explanation under 20 chars - teaches nothing |
| `explanation-mentions-other-answer` | P1 | **0** | Explanation quotes a DIFFERENT choice than the correct answer (heuristic mismatch) |
| `explanation-not-vietnamese` | P1 | **0** | Explanation has no Vietnamese characters (untranslated?) |
| `reorder-trivial` | P1 | **0** | Reorder answer is a single word - nothing to arrange |
| `heard-word-not-in-transcript` | P1 | **0** | "Which word did you hear" answer is not spoken in the transcript |
| `form-near-dup-content` | P1 | **0** | Same form contains two questions identical modulo names (or identical prompt+choices+answer) |
| `form-grade-subject-mismatch` | P1 | **0** | Question grade/subject differs from its form |
| `form-blueprint-size` | P1 | **0** | Form question count differs from blueprint targetQuestions |
| `form-blueprint-missing` | P1 | **0** | Form references a blueprint that does not exist |
| `dup-prompt-same-grade` | P2 | **0** | Identical prompt+answer that can co-appear in one exam (no shared variant_group_id) |
| `ambiguous-country-name` | P2 | **0** | Correct answer or prompted term is an ambiguous country name (Congo/Korea/Bosnia...) |
| `accented-text` | P2 | **0** | Non-ASCII beyond punctuation/math in served prompt or choices |
