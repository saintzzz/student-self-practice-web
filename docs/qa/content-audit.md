# Question Bank Content Audit

Generated: 2026-10-04T07:48:05.921Z · rows: 11406 · regenerate: `node scripts/qb-content-audit.mjs`

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
| `prompt-placeholder` | P0 | **0** | Prompt contains placeholder tokens (undefined/null/TODO) |
| `form-missing-question` | P0 | **0** | Form references a question id that does not exist |
| `form-ineligible-question` | P0 | **0** | Form includes a question not eligible for serving (flagged/excluded) |
| `form-missing-answerkey` | P0 | **0** | Form question has no entry in answerKey |
| `form-answerkey-mismatch` | P0 | **0** | Form answerKey disagrees with the question stored answer |
| `form-duplicate-variant` | P0 | **0** | Two questions in the same form share a variant group or identical content |
| `explanation-not-vietnamese` | P1 | **1014** | Explanation has no Vietnamese characters (untranslated?) |
| `explanation-too-short` | P1 | **401** | Explanation under 20 chars - teaches nothing |
| `explanation-mentions-other-answer` | P1 | **3** | Explanation quotes a DIFFERENT choice than the correct answer (heuristic mismatch) |
| `duplicate-choices` | P1 | **0** | Two identical choices in one question |
| `form-grade-subject-mismatch` | P1 | **0** | Question grade/subject differs from its form |
| `dup-prompt-same-grade` | P2 | **0** | Identical prompt+answer that can co-appear in one exam (no shared variant_group_id) |
| `ambiguous-country-name` | P2 | **0** | Correct answer or prompted term is an ambiguous country name (Congo/Korea/Bosnia...) |
| `accented-text` | P2 | **0** | Non-ASCII beyond punctuation/math in served prompt or choices |

## explanation-not-vietnamese (P1) - 1014 rows

- `g1-eng-v4b-reading-basic-097bbc300ca3` — Read: "Hoa has a red cake. Hoa likes it." What colour is the cake? → **red**
- `g1-eng-v4b-reading-basic-1c4c97ec80f4` — Read: "Anna has a red yellow. Anna likes it." What colour is the yellow? → **red**
- `g1-eng-v4b-reading-basic-76934170e33a` — Read: "Lan has a red tree. Lan likes it." What colour is the tree? → **red**
- `g1-eng-v4b-reading-basic-7ad5d6a41f5c` — Read: "Lucy has a red doll. Lucy likes it." What colour is the doll? → **red**
- `g1-eng-v4b-reading-basic-836dc672e90e` — Read: "Emma has a red milk. Emma likes it." What colour is the milk? → **red**
- `g1-eng-v4b-reading-basic-96fc1221e3b9` — Read: "Linda has a blue book. Linda likes it." What colour is the book? → **blue**
- `g1-eng-v4b-reading-basic-a58f23604137` — Read: "Minh has a red school. Minh likes it." What colour is the school? → **red**
- `g1-eng-v4b-reading-basic-a9a73829b9ac` — Read: "Nam has a red pencil. Nam likes it." What colour is the pencil? → **red**
- `g1-eng-v4b-reading-basic-ae808bd26394` — Read: "Emma has a blue banana. Emma likes it." What colour is the banana? → **blue**
- `g1-eng-v4b-reading-basic-bb268fb86d54` — Read: "Peter has a blue apple. Peter likes it." What colour is the apple? → **blue**
- `g1-eng-v4b-reading-basic-c51eb3bbf528` — Read: "Tony has a blue bird. Tony likes it." What colour is the bird? → **blue**
- `g1-eng-v4b-reading-basic-c8ffbe05a323` — Read: "Alex has a red kite. Alex likes it." What colour is the kite? → **red**
- _…and 1002 more (see --json)_

## explanation-too-short (P1) - 401 rows

- `g1-eng-v4b-reading-basic-097bbc300ca3` — Read: "Hoa has a red cake. Hoa likes it." What colour is the cake? → **red**
- `g1-eng-v4b-reading-basic-1c4c97ec80f4` — Read: "Anna has a red yellow. Anna likes it." What colour is the yellow? → **red**
- `g1-eng-v4b-reading-basic-76934170e33a` — Read: "Lan has a red tree. Lan likes it." What colour is the tree? → **red**
- `g1-eng-v4b-reading-basic-7ad5d6a41f5c` — Read: "Lucy has a red doll. Lucy likes it." What colour is the doll? → **red**
- `g1-eng-v4b-reading-basic-836dc672e90e` — Read: "Emma has a red milk. Emma likes it." What colour is the milk? → **red**
- `g1-eng-v4b-reading-basic-96fc1221e3b9` — Read: "Linda has a blue book. Linda likes it." What colour is the book? → **blue**
- `g1-eng-v4b-reading-basic-a58f23604137` — Read: "Minh has a red school. Minh likes it." What colour is the school? → **red**
- `g1-eng-v4b-reading-basic-a9a73829b9ac` — Read: "Nam has a red pencil. Nam likes it." What colour is the pencil? → **red**
- `g1-eng-v4b-reading-basic-ae808bd26394` — Read: "Emma has a blue banana. Emma likes it." What colour is the banana? → **blue**
- `g1-eng-v4b-reading-basic-b23298835ac7` — Read: "Nam has a red bag. Nam likes it." What colour is the bag? → **red**
- `g1-eng-v4b-reading-basic-b2ead93ed267` — Read: "Hoa has a red sun. Hoa likes it." What colour is the sun? → **red**
- `g1-eng-v4b-reading-basic-bb268fb86d54` — Read: "Peter has a blue apple. Peter likes it." What colour is the apple? → **blue**
- _…and 389 more (see --json)_

## explanation-mentions-other-answer (P1) - 3 rows

- `g3-gs-u01-v6-cloze-6e30be760cdb` — Choose the best word or phrase to complete the sentence: I say hello to my ___. → **friend**
- `g3-gs-u19-v6-cloze-086c447b45c7` — Choose the best word or phrase to complete the sentence: We ride our bikes in the ___. → **park**
- `g4-math-v5-1033-aa29b97fa3` — An angle measures 90°. What type of angle is it? → **right**

