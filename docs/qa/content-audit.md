# Question Bank Content Audit

Generated: 2026-10-24T10:24:57.591Z · rows: 132663 · regenerate: `node scripts/qb-content-audit.mjs`

| Check | Sev | Count | What it catches |
|---|---|---|---|
| `listen-no-transcript` | P0 | **0** | Listening item has no transcript/audio - unanswerable |
| `read-no-passage` | P0 | **0** | Prompt references a passage/text but none stored and none embedded in the prompt itself - unanswerable |
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
| `form-ineligible-question` | P0 | **0** | Form includes a quarantined question (review_status rejected/draft). Pool-eligibility flags do not apply to form membership - approved rubric items (speaking/writing) are legal members of teacher forms. |
| `form-missing-answerkey` | P0 | **0** | Form question has no entry in answerKey |
| `form-answerkey-mismatch` | P0 | **0** | Form answerKey disagrees with the question stored answer |
| `form-duplicate-variant` | P0 | **0** | Two questions in the same form share a variant group or identical content |
| `explanation-not-vietnamese` | P1 | **654** | Explanation has no Vietnamese characters (untranslated?) |
| `ambiguous-open-prompt` | P1 | **24** | Open-ended prompt where more than one choice is a plausible true answer - review for quarantine |
| `form-blueprint-missing` | P1 | **22** | Form references a blueprint that does not exist |
| `duplicate-choices` | P1 | **0** | Two identical choices in one question |
| `statement-as-question` | P1 | **0** | Declarative statement prompt (no question/blank) with yes-no agreement options - unanswerable without a scene or passage |
| `explanation-too-short` | P1 | **0** | Explanation under 20 chars - teaches nothing |
| `explanation-tautology` | P1 | **0** | Explanation only restates "answer fits the theme" without a reason or contrast |
| `reorder-trivial` | P1 | **0** | Reorder answer is a single word - nothing to arrange |
| `heard-word-not-in-transcript` | P1 | **0** | "Which word did you hear" answer is not spoken in the transcript |
| `form-near-dup-content` | P1 | **0** | Same form contains two questions identical modulo names/numbers (same template) |
| `form-grade-subject-mismatch` | P1 | **0** | Question grade/subject differs from its form |
| `form-blueprint-size` | P1 | **0** | Form question count differs from blueprint targetQuestions |
| `explanation-mentions-other-answer` | P2 | **10** | Explanation quotes a DIFFERENT choice than the correct answer - review queue heuristic, NOT a defect count: quoting distractors to explain why they are wrong or to gloss all options is correct pedagogy |
| `ambiguous-country-name` | P2 | **2** | Correct answer or prompted term is an ambiguous country name (Congo/Korea/Bosnia...) |
| `dup-prompt-same-grade` | P2 | **0** | Identical prompt+answer that can co-appear in one exam (no shared variant_group_id) |
| `accented-text` | P2 | **0** | Foreign accent marks (never legal in Vietnamese) in served prompt or choices |

## explanation-not-vietnamese (P1) - 654 rows

- `g1-english-bulk-7d98dec479d6` — Two books ___ on the desk. → **are**
- `g1-english-bulk-7d9bcb348eae` — Good afternoon! How ___ you? → **are**
- `g1-english-bulk-7da777e3c324` — Is she your teacher? → **Yes, she is.**
- `g1-english-bulk-7dc61d55b8e7` — What is the opposite of 'sad'? → **happy**
- `g1-english-bulk-7dd1ef7b6c88` — Choose the correct word: A bird ___ an animal. → **is**
- `g1-english-bulk-7de52cb1d731` — Your father's brother is your ___. → **uncle**
- `g1-english-bulk-7de61d475faf` — Choose the plural of 'hat'. → **hats**
- `g1-english-bulk-7dff9e4f7ecb` — That ___ Uncle Nam. → **is**
- `g1-english-bulk-7e15c1eab17b` — Tom ___ my brother. → **is**
- `g1-english-bulk-88524e3fe515` — Sam has three cars. How many? → **three**
- `g1-english-bulk-888c057c1d3c` — Which color has four letters? → **blue**
- `g1-english-bulk-888c66e3f4f5` — I have seven teddy bears. How many bears? → **seven**
- _…and 642 more (see --json)_

## ambiguous-open-prompt (P1) - 24 rows

- `g2-english-codex-7290a81c5914` — "We like skipping. Do you like skipping?" - "____" → **Yes, we do.**
- `g2-english-gemini-1ad0a4b3433f` — What do you like to do when it is rainy? - I like ___ books. → **reading**
- `g2-english-gemini-4477dccc41a3` — What do you like doing? I like ___ apples. → **eating**
- `g3-english-gemini-2efce0bae44e` — What do you like doing in your free time? - I like playing ___ with my friends. → **tennis**
- `g3-english-gemini-2fb60bc35b98` — What do you like doing in your free time? - I like ________ pictures. → **drawing**
- `g3-english-gemini-4b8ba1bd2293` — What is your favorite sport? - I like ___ because I love water. → **swimming**
- `g3-english-gemini-648481753a02` — What do you like doing in your free time? - I like ___. → **reading books**
- `g3-english-gemini-7294417e066e` — What do you like doing in the afternoon? - I like playing ___ with my friends. → **football**
- `g3-english-gemini-80b715f44e20` — What do you like doing in your free time? - I like ___ pictures. → **drawing**
- `g3-english-gemini-8403820c188f` — What do you like doing in your free time? I like ___ pictures. → **drawing**
- `g3-english-gemini-9518849baeb9` — What is your favorite subject? - I like ___ because I like drawing pictures. → **Art**
- `g3-english-gemini-ad53a2632cea` — What is your favorite sport? - It's ___. → **basketball**
- _…and 12 more (see --json)_

## form-blueprint-missing (P1) - 22 rows

- `asg-0b604df2-8349-4ac9-9675-86099b4a8dda` — blueprint asg-0b604df2-8349-4ac9-9675-86099b4a8dda not found → ****
- `asg-0b8b8459-f149-490d-9acc-4bfaba821cda` — blueprint asg-0b8b8459-f149-490d-9acc-4bfaba821cda not found → ****
- `asg-16f00097-3b5c-4f51-b8b9-3c52ee57fc19` — blueprint asg-16f00097-3b5c-4f51-b8b9-3c52ee57fc19 not found → ****
- `asg-1da7d6e3-731c-4c53-9c80-fb479a8f7b0e` — blueprint asg-1da7d6e3-731c-4c53-9c80-fb479a8f7b0e not found → ****
- `asg-22b6af14-aeea-4504-81d1-26b7f9382c8f` — blueprint asg-22b6af14-aeea-4504-81d1-26b7f9382c8f not found → ****
- `asg-2b79bbb1-c64d-4835-b19f-c8a85f9d153a` — blueprint asg-2b79bbb1-c64d-4835-b19f-c8a85f9d153a not found → ****
- `asg-50384d31-c630-4ffb-a5cc-96ef13b9beed` — blueprint asg-50384d31-c630-4ffb-a5cc-96ef13b9beed not found → ****
- `asg-51f6cb5a-0250-4915-aacd-a009fc41d35a` — blueprint asg-51f6cb5a-0250-4915-aacd-a009fc41d35a not found → ****
- `asg-5241ac1c-060d-42ea-81be-d07e68b08b33` — blueprint asg-5241ac1c-060d-42ea-81be-d07e68b08b33 not found → ****
- `asg-6ac06890-33e9-4c4f-8bb6-1ee44e98f861` — blueprint asg-6ac06890-33e9-4c4f-8bb6-1ee44e98f861 not found → ****
- `asg-6fcc377c-0d8e-4cde-af54-524a49072754` — blueprint asg-6fcc377c-0d8e-4cde-af54-524a49072754 not found → ****
- `asg-85157d6e-1b8f-4dc3-a21b-880f62352611` — blueprint asg-85157d6e-1b8f-4dc3-a21b-880f62352611 not found → ****
- _…and 10 more (see --json)_

## explanation-mentions-other-answer (P2) - 10 rows

- `g2-english-codex-3a86869fe60e` — This driver cannot swim. He ___ swim. → **can't**
- `g2-english-codex-53e070ec3d7c` — I ___ see the sun. Tôi không thể. → **can't**
- `g2-english-codex-599a48e0e9b8` — A bus ___ fly. → **can't**
- `g2-english-codex-5fa252d74adb` — Today is Friday. Yesterday was ___. → **Thursday**
- `g2-english-codex-819d4d790750` — I ___ fly on Sundays. → **can't**
- `g2-english-codex-c985cd404a2e` — I ___ fly. I have no wings. → **can't**
- `g2-english-gemini-c3137438d2d2` — Choose the correct answer: Can a dog fly? - No, it ___ . → **can't**
- `g4-english-gemini-133992b04cbe` — There is ___ apple in my lunch box. → **an**
- `g4-english-gemini-1d5130338b12` — Tet comes ___ than the Mid-Autumn Festival in the calendar year. → **earlier**
- `g5-english-gemini-df2a7033dd75` — If you study hard, your marks will be ___ than last semester. → **better**


## ambiguous-country-name (P2) - 2 rows

- `g5-english-bulk-icon-e1fb2c353573` — Which picture represents America (the USA)? → **america**
- `g5-english-bulk-icon-e3e21ed4b84d` — Which picture represents South Korea? → **korea**

