# Question Bank Content Audit

Generated: 2026-10-24T23:04:49.021Z · rows: 132663 · regenerate: `node scripts/qb-content-audit.mjs`

| Check | Sev | Count | What it catches |
|---|---|---|---|
| `listen-no-transcript` | P0 | **0** | Listening item has no transcript/audio - unanswerable |
| `read-no-passage` | P0 | **0** | Prompt references a passage/text but none stored and none embedded in the prompt itself - unanswerable |
| `visual-no-assets` | P0 | **0** | Image question type with no linked assets |
| `answer-out-of-range` | P0 | **0** | answer.index points outside choices array |
| `answer-index-text-mismatch` | P0 | **0** | answer.index points at a different choice than answer.text - grading would mark the correct pick wrong |
| `choices-too-few` | P0 | **0** | MCQ-type with fewer than 3 choices |
| `option-placeholder` | P0 | **0** | A choice is a literal generator placeholder like "option-4" |
| `sees-animal-ambiguous` | P0 | **0** | "sees an animal with A" distractor also has A - more than one defensible answer |
| `came-from-nonsense` | P0 | **0** | "It came from ___" baby-animal template - produces nonsense like "came from babies from eggs" |
| `blank-double-article` | P0 | **0** | prompt has "a/an ___" while EVERY choice carries its own article - filling produces "a an X" |
| `covering-appendage-answer` | P0 | **0** | "Which covering does X have?" keyed on an appendage/body answer (wings, legs, arms) - prompt must say "feature" |
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
| `duplicate-choices` | P1 | **0** | Two identical choices in one question |
| `article-a-before-vowel` | P1 | **0** | "a" before a vowel-sound word (must be "an") - grammar-teaching rows exempt |
| `finds-habitat-mismatch` | P1 | **0** | "finds a X at P" where P is not X's habitat (e.g. whale at a garden) |
| `reorder-no-tokens` | P1 | **0** | reorder item has no stored word bank (tokens) - mapper must fall back to answer split |
| `habitat-ambiguous-distractor` | P1 | **0** | "Where does X live?" lists a distractor that is a genuinely valid habitat for X (e.g. whale + cold polar regions) |
| `poster-idea-unspecified` | P1 | **0** | "poster for this idea" row still served - the idea is never stated so no unique answer exists |
| `prompt-this-no-asset` | P1 | **0** | Prompt references "this"/"the picture" but no image asset is linked |
| `ambiguous-open-prompt` | P1 | **0** | Open-ended prompt where more than one choice is a plausible true answer - review for quarantine |
| `statement-as-question` | P1 | **0** | Declarative statement prompt (no question/blank) with yes-no agreement options - unanswerable without a scene or passage |
| `explanation-too-short` | P1 | **0** | Explanation under 20 chars - teaches nothing |
| `explanation-not-vietnamese` | P1 | **0** | Explanation has no Vietnamese characters (untranslated?) |
| `explanation-tautology` | P1 | **0** | Explanation only restates "answer fits the theme" without a reason or contrast |
| `reorder-trivial` | P1 | **0** | Reorder answer is a single word - nothing to arrange |
| `heard-word-not-in-transcript` | P1 | **0** | "Which word did you hear" answer is not spoken in the transcript |
| `form-near-dup-content` | P1 | **0** | Same form contains two questions identical modulo names/numbers (same template) |
| `form-grade-subject-mismatch` | P1 | **0** | Question grade/subject differs from its form |
| `form-blueprint-size` | P1 | **0** | Form question count differs from blueprint targetQuestions |
| `form-blueprint-missing` | P1 | **0** | Form references a blueprint that does not exist |
| `explanation-mentions-other-answer` | P2 | **0** | Explanation quotes a DIFFERENT choice than the correct answer - review queue heuristic, NOT a defect count: quoting distractors to explain why they are wrong or to gloss all options is correct pedagogy |
| `dup-prompt-same-grade` | P2 | **0** | Identical prompt+answer that can co-appear in one exam (no shared variant_group_id) |
| `ambiguous-country-name` | P2 | **0** | Correct answer or prompted term is an ambiguous country name (Congo/Korea/Bosnia...) |
| `accented-text` | P2 | **0** | Foreign accent marks (never legal in Vietnamese) in served prompt or choices |
