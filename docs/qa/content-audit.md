# Question Bank Content Audit

Generated: 2026-10-04T06:37:40.647Z · rows: 11406 · regenerate: `node scripts/qb-content-audit.mjs`

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
| `prompt-placeholder` | P0 | **0** | Prompt contains placeholder tokens (undefined/null/TODO) |
| `explanation-not-vietnamese` | P1 | **1513** | Explanation has no Vietnamese characters (untranslated?) |
| `explanation-too-short` | P1 | **446** | Explanation under 20 chars - teaches nothing |
| `explanation-mentions-other-answer` | P1 | **3** | Explanation quotes a DIFFERENT choice than the correct answer (heuristic mismatch) |
| `duplicate-choices` | P1 | **0** | Two identical choices in one question |
| `dup-prompt-same-grade` | P2 | **0** | Identical prompt+answer that can co-appear in one exam (no shared variant_group_id) |
| `ambiguous-country-name` | P2 | **0** | Correct answer or prompted term is an ambiguous country name (Congo/Korea/Bosnia...) |
| `accented-text` | P2 | **0** | Non-ASCII beyond punctuation/math in served prompt or choices |

## explanation-not-vietnamese (P1) - 1513 rows

- `g5-math-v5-1212-a60df76525` — What is 20% of 400? → **80**
- `g5-math-v5-1222-bc54f759ec` — What is 20% of 400? → **80**
- `g5-math-v5-1223-88b05f67d6` — A cuboid is 12 cm × 10 cm × 8 cm. What is its volume? → **960**
- `g5-math-v5-1253-4e015b9025` — A cuboid is 12 cm × 10 cm × 8 cm. What is its volume? → **960**
- `g5-math-v5-5015-6069b91c42` — Convert 12 kilometres to metres. → **12000**
- `g5-math-v5-1226-8b107571b7` — A vehicle travels at 34 km/h for 2 hours. How far does it travel? → **68**
- `g5-math-v5-5025-5436770abc` — Convert 15 kilometres to metres. → **15000**
- `g3-math-v6-cbd8ae1f179d` — A rectangle is 10 cm long and 10 cm wide. What is its perimeter? → **40**
- `g1-math-v6-efdc867e2026` — What number comes next? 8, 9, 10, 11, ___ → **12**
- `g2-math-v6-8156e19ea596` — Which shape has 4 straight sides? → **square**
- `g3-math-v5-5015-c11f21e67b` — A rectangle is 9 cm long and 6 cm wide. What is its perimeter? → **30**
- `g3-math-v6-f5353db4dca7` — A rectangle is 9 cm long and 6 cm wide. What is its perimeter? → **30**
- _…and 1501 more (see --json)_

## explanation-too-short (P1) - 446 rows

- `g5-math-v5-1212-a60df76525` — What is 20% of 400? → **80**
- `g5-math-v5-1222-bc54f759ec` — What is 20% of 400? → **80**
- `g5-math-v5-5015-6069b91c42` — Convert 12 kilometres to metres. → **12000**
- `g5-math-v5-1265-19bbe6ce6e` — Convert 9 kilometres to metres. → **9000**
- `g5-math-v5-5035-9e0c5931de` — Convert 9 kilometres to metres. → **9000**
- `g5-math-v5-5025-5436770abc` — Convert 15 kilometres to metres. → **15000**
- `g3-math-v5-5053-104f2a64d8` — What is 70 ÷ 7? → **10**
- `g1-math-v6-df7018c3a5c6` — There are 7 stickers. 2 stickers are given away. How many stickers are left? → **5**
- `g1-math-v6-a667be540747` — There are 4 stickers. 2 stickers are given away. How many stickers are left? → **2**
- `g5-math-v5-1035-edfef7e528` — Convert 20 kilometres to metres. → **20000**
- `g5-math-v5-1038-6109ead195` — A shop has 6 packs of 21 bottles. It sells 19 bottles. How many remain? → **107**
- `g5-math-v5-1039-505c006019` — A rule is “multiply by 2, then add 5”. What is the output for 28? → **61**
- _…and 434 more (see --json)_

## explanation-mentions-other-answer (P1) - 3 rows

- `g4-math-v5-1033-aa29b97fa3` — An angle measures 90°. What type of angle is it? → **right**
- `g3-gs-u19-v6-cloze-086c447b45c7` — Choose the best word or phrase to complete the sentence: We ride our bikes in the ___. → **park**
- `g3-gs-u01-v6-cloze-6e30be760cdb` — Choose the best word or phrase to complete the sentence: I say hello to my ___. → **friend**

