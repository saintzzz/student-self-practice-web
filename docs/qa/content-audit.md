# Question Bank Content Audit

Generated: 2026-10-12T16:29:48.195Z · rows: 110726 · regenerate: `node scripts/qb-content-audit.mjs`

| Check | Sev | Count | What it catches |
|---|---|---|---|
| `wrong-answer-math` | P0 | **1780** | Marked answer contradicts the computed value of the prompt |
| `form-missing-question` | P0 | **486** | Form references a question id that does not exist |
| `listen-no-transcript` | P0 | **22** | Prompt says Listen but no transcript/audio - unanswerable |
| `prompt-answer-leak` | P0 | **15** | Prompt literally contains the quoted correct answer (guessable without skill) |
| `read-no-passage` | P0 | **0** | Prompt references a passage/text but none stored - unanswerable |
| `visual-no-assets` | P0 | **0** | Image question type with no linked assets |
| `answer-out-of-range` | P0 | **0** | answer.index points outside choices array |
| `choices-too-few` | P0 | **0** | MCQ-type with fewer than 3 choices |
| `option-placeholder` | P0 | **0** | A choice is a literal generator placeholder like "option-4" |
| `explanation-missing` | P0 | **0** | No explanation at all |
| `explanation-template-residue` | P0 | **0** | Leftover generator template text |
| `wrong-comparison-answer` | P0 | **0** | Compare X and Y items: marked answer wrong for the numbers |
| `reorder-bank-mismatch` | P0 | **0** | Reorder prompt word bank is not a permutation of the answer sentence |
| `text-answer-empty` | P0 | **0** | text-answer item has no usable answer text or accepted list |
| `dup-option-assets` | P0 | **0** | Two options reference the same image asset (visually identical choices) |
| `prompt-placeholder` | P0 | **0** | Prompt contains placeholder tokens (undefined/null/TODO) |
| `form-ineligible-question` | P0 | **0** | Form includes a question not eligible for serving (flagged/excluded) |
| `form-missing-answerkey` | P0 | **0** | Form question has no entry in answerKey |
| `form-answerkey-mismatch` | P0 | **0** | Form answerKey disagrees with the question stored answer |
| `form-duplicate-variant` | P0 | **0** | Two questions in the same form share a variant group or identical content |
| `explanation-too-short` | P1 | **13229** | Explanation under 20 chars - teaches nothing |
| `explanation-not-vietnamese` | P1 | **4642** | Explanation has no Vietnamese characters (untranslated?) |
| `explanation-mentions-other-answer` | P1 | **872** | Explanation quotes a DIFFERENT choice than the correct answer (heuristic mismatch) |
| `duplicate-choices` | P1 | **1** | Two identical choices in one question |
| `explanation-tautology` | P1 | **0** | Explanation only restates "answer fits the theme" without a reason or contrast |
| `reorder-trivial` | P1 | **0** | Reorder answer is a single word - nothing to arrange |
| `heard-word-not-in-transcript` | P1 | **0** | "Which word did you hear" answer is not spoken in the transcript |
| `form-near-dup-content` | P1 | **0** | Same form contains two questions identical modulo names/numbers (same template) |
| `form-grade-subject-mismatch` | P1 | **0** | Question grade/subject differs from its form |
| `form-blueprint-size` | P1 | **0** | Form question count differs from blueprint targetQuestions |
| `form-blueprint-missing` | P1 | **0** | Form references a blueprint that does not exist |
| `dup-prompt-same-grade` | P2 | **19067** | Identical prompt+answer that can co-appear in one exam (no shared variant_group_id) |
| `accented-text` | P2 | **195** | Non-ASCII beyond punctuation/math in served prompt or choices |
| `ambiguous-country-name` | P2 | **12** | Correct answer or prompted term is an ambiguous country name (Congo/Korea/Bosnia...) |

## wrong-answer-math (P0) - 1780 rows

- `g1-english-bulk-0744ebc9eb3b` — What is 3 + 3? → **six**
- `g1-english-bulk-11a479190c76` — What is 7 - 2? → **Five**
- `g1-english-bulk-5043e4634d6f` — What is 10 - 2? → **Eight**
- `g1-english-bulk-5ce8c54f78ac` — What is 3 + 2? → **five**
- `g1-english-bulk-634af299caff` — What is 2 + 3? → **Five**
- `g1-english-bulk-6ea040b7ee1a` — What is 10 - 1? → **nine**
- `g1-english-bulk-704cd39dad7b` — What is 6 - 2? → **four**
- `g1-english-bulk-747d652519dc` — What is 4 + 4? → **eight**
- `g1-english-bulk-821903e9ee02` — What is 5 - 2? → **three**
- `g1-english-bulk-8bf6c4ef4cfc` — What number is one less than 3? → **Two**
- `g1-english-bulk-a0aa56c67d28` — What is 2 + 2? → **Four**
- `g1-english-bulk-a80e8ae11b83` — What is 1 + 1? → **Two**
- _…and 1768 more (see --json)_

## form-missing-question (P0) - 486 rows

- `g1-math-diagnostic-form-01 -> g1-math-v5-1252-366808d57d` — missing from form g1-math-diagnostic-form-01 → ****
- `g1-math-diagnostic-form-02 -> g1-math-v6-517b6a53919b` — missing from form g1-math-diagnostic-form-02 → ****
- `g1-math-final-1-form-01 -> g1-math-v6-ddfd0c5f8d5b` — missing from form g1-math-final-1-form-01 → ****
- `g1-math-final-1-form-02 -> g1-math-v6-ed0ec572d2f9` — missing from form g1-math-final-1-form-02 → ****
- `g1-math-final-1-form-02 -> g1-math-v5-1337-18f8134fad` — missing from form g1-math-final-1-form-02 → ****
- `g1-math-final-2-form-01 -> g1-math-v6-ddfd0c5f8d5b` — missing from form g1-math-final-2-form-01 → ****
- `g1-math-midterm-1-form-01 -> g1-math-v5-1220-c211eecb89` — missing from form g1-math-midterm-1-form-01 → ****
- `g1-math-midterm-1-form-01 -> g1-math-v5-1228-dc0e94f4ad` — missing from form g1-math-midterm-1-form-01 → ****
- `g1-math-midterm-2-form-01 -> g1-math-v6-0e449daeb44d-2` — missing from form g1-math-midterm-2-form-01 → ****
- `g1-math-midterm-2-form-01 -> g1-math-v6-ddfd0c5f8d5b-2` — missing from form g1-math-midterm-2-form-01 → ****
- `g1-math-midterm-2-form-02 -> g1-math-v6-ddfd0c5f8d5b-2` — missing from form g1-math-midterm-2-form-02 → ****
- `g1-math-midterm-2-form-02 -> g1-math-v5-1311-c836f82afb` — missing from form g1-math-midterm-2-form-02 → ****
- _…and 474 more (see --json)_

## listen-no-transcript (P0) - 22 rows

- `g2-english-adv-cdd0f996c68e` — Listen! The birds ___ in the tree. → **are singing**
- `g2-english-bulk-bad30828a94a` — What do you say to listen to the teacher? → **Listen to me, please.**
- `g2-english-bulk-c1602ca80bef` — The teacher says, 'Listen to me.' What do you do? → **I listen carefully.**
- `g3-english-bulk-42007d832b00` — Listen! Someone ______ at the door. → **is knocking**
- `g3-english-bulk-5c3d58ee08b0` — Listen! The baby ______ in the next room. → **is crying**
- `g3-english-bulk-64ed2892528d` — Listen! Someone _________ at the door. → **is knocking**
- `g3-english-bulk-9c0ef3c77718` — Listen! Someone ____ at the door. → **is knocking**
- `g3-english-bulk-e6c561365b89` — Listen! Someone is _______ at the door. → **knocking**
- `g4-english-bulk-094c883eb3dd` — What kind of music do you listen to? → **I listen to pop music.**
- `g4-english-bulk-839afbe287bd` — What kind of music did you listen to? → **I listened to rock music.**
- `g4-english-bulk-93b1e3371565` — When do you usually listen to music? → **I listen to music in the evening.**
- `g5-english-bulk-5cb1b12adbae` — What device do you use to listen to music? → **A speaker**
- _…and 10 more (see --json)_

## prompt-answer-leak (P0) - 15 rows

- `g1-english-bulk-09f06daac369` — Which one is 'eating'? → **eating**
- `g1-english-bulk-102864486424` — Choose the color 'pink'. → **pink**
- `g1-english-bulk-1720e01e0fb3` — When someone says 'Hello' to you, what do you say back? → **Hello**
- `g1-english-bulk-2259b06b8d16` — Which word is 'orange'? → **orange**
- `g1-english-bulk-3204b8f50e17` — My teacher says, 'Hello'. I say... → **Hello**
- `g1-english-bulk-5d4d04432cad` — Which one is 'foot'? → **foot**
- `g1-english-bulk-671b6633b3a9` — Which word is 'two'? → **Two**
- `g1-english-bulk-680cb74e326c` — Mom says, 'Good morning'. What do you say? → **Good morning**
- `g1-english-bulk-7f08ac7059ae` — Choose the correct toy name for a 'robot'. → **Robot**
- `g1-english-bulk-856e042f386d` — Which one is 'nose'? → **nose**
- `g1-english-bulk-86591c4f5cdf` — Which one is 'scared'? → **scared**
- `g1-english-bulk-bc6617c9b714` — Khi bạn của con nói 'Hello', con sẽ đáp lại như thế nào? → **Hello**
- _…and 3 more (see --json)_

## explanation-too-short (P1) - 13229 rows

- `g1-english-bulk-1df82f1b21db` — This is number 9. It is... → **nine**
- `g1-english-bulk-cf1f4ff184a0` — This is number 5. It is... → **five**
- `g1-math-tpl-000092c61341` — Which number is "ten"? → **10**
- `g1-math-tpl-006acc6f9fd4` — 4 + 11 = ___ → **15**
- `g1-math-tpl-00afca0021e0` — Which number is "four"? → **4**
- `g1-math-tpl-01234b5df9fc` — 6 - 2 = ___ → **4**
- `g1-math-tpl-0287c922cb26` — 3 + 10 = ___ → **13**
- `g1-math-tpl-0335d62805a0` — Which number is "two"? → **2**
- `g1-math-tpl-03509e2f37f0` — 3 + 12 = ___ → **15**
- `g1-math-tpl-037bf8bbc2b0` — 4 + 3 = ___ → **7**
- `g1-math-tpl-03a5af572189` — 6 + 13 = ___ → **19**
- `g1-math-tpl-03d99b164f37` — Which number is bigger: 55 or 19? → **55**
- _…and 13217 more (see --json)_

## explanation-not-vietnamese (P1) - 4642 rows

- `g1-english-bulk-02c7aec8615d` — Are they ______? → **Bored**
- `g1-english-bulk-08a99ecb6302` — How does the boy feel? → **Embarrassed**
- `g1-english-bulk-3a1dba979f06` — This balloon is ______.  → **Excited**
- `g1-english-bulk-3f3104a8a5fb` — One, two, three ______.  → **Happy**
- `g1-english-bulk-4f933cbe94c1` — I feel ______. → **Tired**
- `g1-english-bulk-70d5429072a8` — This is a ______ dog. → **Scared**
- `g1-english-bulk-7a16a64705f5` — They are ______.  → **Excited**
- `g1-english-bulk-bede5bfe581e` — How do they feel? → **Relieved**
- `g1-english-bulk-d2ab0fced6ac` — I feel ______.  → **Lonely**
- `g1-english-bulk-e09e7be8175c` — Two cats are ______.  → **Happy**
- `g1-english-bulk-eb9f3c894613` — That is ______.  → **Annoyed**
- `g1-english-bulk-f46f79dc67d1` — One girl is ______.  → **Worried**
- _…and 4630 more (see --json)_

## explanation-mentions-other-answer (P1) - 872 rows

- `g1-english-adv-359d4a9ac279` — ___ is this? - It is a ruler. → **What**
- `g1-english-adv-77f3a113625d` — This is Tom. ___ bag is blue. → **His**
- `g1-english-bulk-02c7aec8615d` — Are they ______? → **Bored**
- `g1-english-bulk-0318aa5bed56` — That is ... house. → **Ten**
- `g1-english-bulk-04e1ac2c210e` — I like playing with... → **Blocks**
- `g1-english-bulk-0520562414bd` — That is a classroom... → **desk**
- `g1-english-bulk-07c56dfb68fa` — This is a big family. Yes or no? → **Yes, it is.**
- `g1-english-bulk-08475094198f` — This is a small family. Yes or no? → **Yes, it is.**
- `g1-english-bulk-08a99ecb6302` — How does the boy feel? → **Embarrassed**
- `g1-english-bulk-08e88cd090c7` — She is ____ about her drawing. → **Proud**
- `g1-english-bulk-10395fa62d80` — This is ... car. → **Four**
- `g1-english-bulk-10bcb12e940a` — Look! ... cars. → **Four**
- _…and 860 more (see --json)_

## duplicate-choices (P1) - 1 rows

- `g5-english-tpl-3dec940c4759` — ___ it rained, we still played outside. → **Although**


## dup-prompt-same-grade (P2) - 19067 rows

- `g1-cr67-i2w-0044-fbd9ff` — Look at the picture. Choose the correct English word. → **apple**
- `g1-visual-image-word-0064-fbd9ff` — Look at the picture. Choose the correct English word. → **apple**
- `g1-cr67-i2w-0082-5da21f` — Look at the picture. Choose the correct English word. → **baby**
- `g1-visual-image-word-0033-5da21f` — Look at the picture. Choose the correct English word. → **baby**
- `g1-cr67-i2w-0090-a56d0e` — Look at the picture. Choose the correct English word. → **bag**
- `g1-visual-image-word-0004-a56d0e` — Look at the picture. Choose the correct English word. → **bag**
- `g1-cr67-i2w-0178-ba3698` — Look at the picture. Choose the correct English word. → **bin**
- `g1-visual-image-word-0112-ba3698` — Look at the picture. Choose the correct English word. → **bin**
- `g1-cr67-i2w-0180-90d3e4` — Look at the picture. Choose the correct English word. → **bird**
- `g1-visual-image-word-0038-90d3e4` — Look at the picture. Choose the correct English word. → **bird**
- `g1-cr67-i2w-0184-b209c0` — Look at the picture. Choose the correct English word. → **black**
- `g1-visual-image-word-0024-b209c0` — Look at the picture. Choose the correct English word. → **black**
- _…and 19055 more (see --json)_

## accented-text (P2) - 195 rows

- `g1-english-bulk-0bd1ebbde1e7` — Khi con gặp ai đó vào buổi tối (khi trời đã tối hẳn), con nói gì? → **Good evening**
- `g1-english-bulk-1b8bd4b1f5a1` — purple → **tím**
- `g1-english-bulk-1c4aa6969506` — Nine means... → **chín**
- `g1-english-bulk-25d12a644388` — She is throwing a ball. What is 'throwing'? → **ném**
- `g1-english-bulk-48f63d73c6e0` — My name is ... → **Tên của mình là...**
- `g1-english-bulk-629b015f00ef` — I am excited! → **vui sướng**
- `g1-english-bulk-6915c18ed0e1` — Which color is 'orange'? → **cam**
- `g1-english-bulk-703c02c59859` — He is kicking a ball. What is 'kicking'? → **đá**
- `g1-english-bulk-736d2e9c7268` — Chọn từ thích hợp: I ______ fine. → **am**
- `g1-english-bulk-7d909b605944` — Chọn từ thích hợp điền vào chỗ trống: Thank …! → **you**
- `g1-english-bulk-8371fc81f816` — orange → **cam**
- `g1-english-bulk-83c999528525` — Which one is pink? → **(hình ảnh màu hồng)**
- _…and 183 more (see --json)_

## ambiguous-country-name (P2) - 12 rows

- `g1-cr67-i2w-0416-a5ec7c` — Look at the picture. Choose the correct English word. → **congo**
- `g1-cr67-i2w-1070-25a11c` — Look at the picture. Choose the correct English word. → **korea**
- `g1-cr67-w2i-0417-a5ec7c` — Which picture shows "congo"? → **congo**
- `g1-cr67-w2i-1071-25a11c` — Which picture shows "korea"? → **korea**
- `g2-cr67-i2w-0416-a5ec7c` — Look at the picture. Choose the correct English word. → **congo**
- `g2-cr67-i2w-1070-25a11c` — Look at the picture. Choose the correct English word. → **korea**
- `g2-cr67-w2i-0417-a5ec7c` — Which picture shows "congo"? → **congo**
- `g2-cr67-w2i-1071-25a11c` — Which picture shows "korea"? → **korea**
- `g3-cr67-i2w-0020-1b6d6b` — Look at the picture. Choose the correct English word. → **america**
- `g3-cr67-i2w-0218-f8c38f` — Look at the picture. Choose the correct English word. → **bosnia**
- `g3-cr67-w2i-0021-1b6d6b` — Which picture shows "america"? → **america**
- `g3-cr67-w2i-0219-f8c38f` — Which picture shows "bosnia"? → **bosnia**

---

## Addendum 2026-10-18 - MCP SQL spot-check (no service key on this machine)

Partial re-run of the P0 classes via `execute_sql` (postgres role) on the
live DB. Eligible pool = publication_policy practice/exam/mockEligible.

| Check | Oct-12 | 2026-10-18 |
|---|---|---|
| listen-no-transcript (eligible) | 22 | **0** |
| read-no-passage | 0 | 0 |
| visual-no-assets | 0 | 0 |
| answer-out-of-range | 0 | 0 |
| choices-too-few | 0 | 0 |
| option-placeholder | 0 | 0 |
| explanation-missing | 0 | 0 |
| prompt-placeholder | 0 | 0 |
| prompt-answer-leak | 15 | **0** |
| form-missing-question | 486 | **486** (unchanged - stale payload refs) |
| form-ineligible-question | 0 | **373** (NEW - forms reference quarantined ids) |
| form-missing-answerkey | 0 | 0 |

Scope note: `fetch_form`/`list_assessment_forms` are `is_admin()`-gated
and the FormPicker UI is admin-only (`StartBatchScreen` line ~112), so the
two non-zero form findings are **admin-tooling staleness**, not a
student-facing leak - `fetch_questions_public` filters eligibility per
mode correctly. Follow-up: regenerate form payloads (or filter at
`fetch_form`) when the admin exam-form surface is next touched.
Not re-run: wrong-answer-math, wrong-comparison-answer,
reorder-bank-mismatch, text-answer-empty, dup-option-assets,
explanation heuristics, dup-prompt (need row-level eval, keep the
Oct-12 baseline for those).

