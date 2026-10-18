# Question Bank Content Audit

Generated: 2026-10-18T08:45:46.577Z · rows: 110726 · regenerate: `node scripts/qb-content-audit.mjs`

| Check | Sev | Count | What it catches |
|---|---|---|---|
| `listen-no-transcript` | P0 | **0** | Listening item has no transcript/audio - unanswerable |
| `read-no-passage` | P0 | **0** | Prompt references a passage/text but none stored - unanswerable |
| `visual-no-assets` | P0 | **0** | Image question type with no linked assets |
| `answer-out-of-range` | P0 | **0** | answer.index points outside choices array |
| `choices-too-few` | P0 | **0** | MCQ-type with fewer than 3 choices |
| `option-placeholder` | P0 | **0** | A choice is a literal generator placeholder like "option-4" |
| `prompt-answer-leak` | P0 | **0** | Prompt literally contains the quoted correct answer (guessable without skill) |
| `prompt-answer-leak-unquoted` | P0 | **0** | English item whose bare-digit correct answer is reprinted inside the prompt |
| `prompt-image-placeholder` | P0 | **0** | Prompt describes an image in text "(Image of X)" - no real asset and the description leaks the answer |
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
| `explanation-too-short` | P1 | **13163** | Explanation under 20 chars - teaches nothing |
| `explanation-not-vietnamese` | P1 | **4441** | Explanation has no Vietnamese characters (untranslated?) |
| `explanation-mentions-other-answer` | P1 | **474** | Explanation quotes a DIFFERENT choice than the correct answer (heuristic mismatch) |
| `duplicate-choices` | P1 | **0** | Two identical choices in one question |
| `ambiguous-open-prompt` | P1 | **0** | Open-ended prompt where more than one choice is a plausible true answer - review for quarantine |
| `statement-as-question` | P1 | **0** | Declarative statement prompt (no question/blank) with yes-no agreement options - unanswerable without a scene or passage |
| `explanation-tautology` | P1 | **0** | Explanation only restates "answer fits the theme" without a reason or contrast |
| `reorder-trivial` | P1 | **0** | Reorder answer is a single word - nothing to arrange |
| `heard-word-not-in-transcript` | P1 | **0** | "Which word did you hear" answer is not spoken in the transcript |
| `form-near-dup-content` | P1 | **0** | Same form contains two questions identical modulo names/numbers (same template) |
| `form-grade-subject-mismatch` | P1 | **0** | Question grade/subject differs from its form |
| `form-blueprint-size` | P1 | **0** | Form question count differs from blueprint targetQuestions |
| `form-blueprint-missing` | P1 | **0** | Form references a blueprint that does not exist |
| `dup-prompt-same-grade` | P2 | **16546** | Identical prompt+answer that can co-appear in one exam (no shared variant_group_id) |
| `accented-text` | P2 | **187** | Non-ASCII beyond punctuation/math in served prompt or choices |
| `ambiguous-country-name` | P2 | **0** | Correct answer or prompted term is an ambiguous country name (Congo/Korea/Bosnia...) |

## explanation-too-short (P1) - 13163 rows

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
- `g1-math-tpl-041b8d2df39a` — 17 - 11 = ___ → **6**
- `g1-math-tpl-04d88f8baec9` — Which number is bigger: 64 or 38? → **64**
- _…and 13151 more (see --json)_

## explanation-not-vietnamese (P1) - 4441 rows

- `g1-science-tpl-00077b7cca02` — At the beach, Lan finds a baby butterfly. It came from ___. → **caterpillars from eggs**
- `g1-science-tpl-010f43b1cfdb` — At the beach, Mai finds a baby salmon. It came from ___. → **babies from eggs**
- `g1-science-tpl-0172f38626d6` — At the zoo, Lan finds a baby duck. It came from ___. → **ducklings from eggs**
- `g1-science-tpl-01b48deb0d35` — At a garden, Linh finds a baby gecko. It came from ___. → **babies from eggs**
- `g1-science-tpl-0203255b8b48` — At the forest, Huy finds a baby frog. It came from ___. → **tadpoles from eggs**
- `g1-science-tpl-023e6628cca6` — At the zoo, Nam finds a baby rabbit. It came from ___. → **kits**
- `g1-science-tpl-02c39d1b90bb` — At a farm, Nam finds a baby crocodile. It came from ___. → **babies from eggs**
- `g1-science-tpl-02f7308a178c` — At the park, Lan finds a baby tiger. It came from ___. → **cubs**
- `g1-science-tpl-0310a2cedea6` — At the zoo, Lan finds a baby ant. It came from ___. → **larvae from eggs**
- `g1-science-tpl-0358ecc92afa` — At a garden, Linh finds a baby toad. It came from ___. → **tadpoles from eggs**
- `g1-science-tpl-038113b46963` — At the park, Linh finds a baby bear. It came from ___. → **cubs**
- `g1-science-tpl-03cb5ba052e2` — At the beach, Nam finds a baby frog. It came from ___. → **tadpoles from eggs**
- _…and 4429 more (see --json)_

## explanation-mentions-other-answer (P1) - 474 rows

- `g1-english-adv-359d4a9ac279` — ___ is this? - It is a ruler. → **What**
- `g1-english-adv-77f3a113625d` — This is Tom. ___ bag is blue. → **His**
- `g1-english-bulk-07c56dfb68fa` — This is a big family. Yes or no? → **Yes, it is.**
- `g1-english-bulk-08475094198f` — This is a small family. Yes or no? → **Yes, it is.**
- `g1-english-bulk-08e88cd090c7` — She is ____ about her drawing. → **Proud**
- `g1-english-bulk-20d7c24e753c` — Who is not a family member? → **teacher**
- `g1-english-bulk-2e5cf528a336` — That is ... tree. → **One**
- `g1-english-bulk-3b40176d1f8b` — What is for lunch? → **rice and fish**
- `g1-english-bulk-49341ad7bc52` — I use my ____ to hear. → **ears**
- `g1-english-bulk-5cc3b4c6e664` — One nose, two... → **feet**
- `g1-english-bulk-62f59bcb8872` — What kind of fruit is this? → **strawberry**
- `g1-english-bulk-74c568fb4723` — Choose the plural form of 'cat'. → **cats**
- _…and 462 more (see --json)_

## dup-prompt-same-grade (P2) - 16546 rows

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
- _…and 16534 more (see --json)_

## accented-text (P2) - 187 rows

- `g1-english-bulk-0bd1ebbde1e7` — Khi con gặp ai đó vào buổi tối (khi trời đã tối hẳn), con nói gì? → **Good evening**
- `g1-english-bulk-1b8bd4b1f5a1` — purple → **tím**
- `g1-english-bulk-1c4aa6969506` — Nine means... → **chín**
- `g1-english-bulk-25d12a644388` — She is throwing a ball. What is 'throwing'? → **ném**
- `g1-english-bulk-629b015f00ef` — I am excited! → **vui sướng**
- `g1-english-bulk-6915c18ed0e1` — Which color is 'orange'? → **cam**
- `g1-english-bulk-703c02c59859` — He is kicking a ball. What is 'kicking'? → **đá**
- `g1-english-bulk-736d2e9c7268` — Chọn từ thích hợp: I ______ fine. → **am**
- `g1-english-bulk-8371fc81f816` — orange → **cam**
- `g1-english-bulk-83c999528525` — Which one is pink? → **(hình ảnh màu hồng)**
- `g1-english-bulk-913b40dfe61b` — One, two, three. → **Một, hai, ba.**
- `g1-english-bulk-a80a05e79662` — They are catching a ball. What is 'catching'? → **bắt**
- _…and 175 more (see --json)_
