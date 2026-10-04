# Question Bank Content Audit

Generated: 2026-10-04T06:12:20.984Z · rows: 11406 · regenerate: `node scripts/qb-content-audit.mjs`

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
| `explanation-not-vietnamese` | P1 | **1709** | Explanation has no Vietnamese characters (untranslated?) |
| `explanation-too-short` | P1 | **587** | Explanation under 20 chars - teaches nothing |
| `explanation-mentions-other-answer` | P1 | **2** | Explanation quotes a DIFFERENT choice than the correct answer (heuristic mismatch) |
| `duplicate-choices` | P1 | **0** | Two identical choices in one question |
| `dup-prompt-same-grade` | P2 | **106** | Identical prompt+answer that can co-appear in one exam (no shared variant_group_id) |
| `ambiguous-country-name` | P2 | **0** | Correct answer or prompted term is an ambiguous country name (Congo/Korea/Bosnia...) |
| `accented-text` | P2 | **0** | Non-ASCII beyond punctuation/math in served prompt or choices |

## explanation-not-vietnamese (P1) - 1709 rows

- `g3-mat-v4-time-money-57fed8a0b1` — Which digital time is 45 minutes past 10? → **10:45**
- `g4-mat-v4-time-money-96411db473` — Which digital time is 45 minutes past 4? → **4:45**
- `g3-math-v6-acbf08a179c5` — A rectangle is 14 cm long and 8 cm wide. What is its perimeter? → **44**
- `g1-math-v5-5008-91ef7323a8` — How many sides does a square have? → **4**
- `g2-math-v5-5034-667dd08f5f` — A notebook costs 1000 dong and a pen costs 5000 dong. What is the total? → **6000**
- `g1-math-v5-5007-99b067632c` — What comes next? 7, 12, 17, 22, ___ → **27**
- `g2-math-v5-5046-e3031f8ae9` — How many sides does a pentagon have? → **5**
- `g2-math-v5-5013-a7d56f79a6` — How many sides does a triangle have? → **3**
- `g2-math-v5-5035-5a50fed5c8` — How many sides does a pentagon have? → **5**
- `g2-math-v5-5057-b44345440e` — How many sides does a pentagon have? → **5**
- `g2-math-v5-5002-f82ad9311a` — How many sides does a rectangle have? → **4**
- `g3-math-v5-5046-f6b50136f7` — How many minutes are in 1 hour(s)? → **60**
- _…and 1697 more (see --json)_

## explanation-too-short (P1) - 587 rows

- `g3-mat-v4-time-money-57fed8a0b1` — Which digital time is 45 minutes past 10? → **10:45**
- `g4-mat-v4-time-money-96411db473` — Which digital time is 45 minutes past 4? → **4:45**
- `g1-math-v5-5004-1ba78bd43b` — What is 17 plus 2? → **19**
- `g2-math-v5-5008-c65f381036` — 20 sweets are shared equally among 10 children. How many sweets does each child get? → **2**
- `g2-math-v5-5051-c80874c55e` — What is 2 × 1? → **2**
- `g2-math-v5-5021-43b9894378` — A ribbon is 48 cm long. What is its length in centimetres? → **48**
- `g4-math-v5-1085-37d594ec89` — Convert 5 metres to centimetres. → **500**
- `g4-math-v5-1165-a5ce610bc3` — Convert 5 metres to centimetres. → **500**
- `g4-math-v5-1036-13ac919fde` — How many minutes are in 1 hours 30 minutes? → **90**
- `g4-math-v5-1236-35d6e534e2` — How many minutes are in 1 hours 30 minutes? → **90**
- `g4-math-v5-1158-ab09c747e9` — A shop packs 47 items in each box and makes 2 boxes. How many items are packed? → **94**
- `g4-math-v5-1055-d060fa83f3` — Convert 6 metres to centimetres. → **600**
- _…and 575 more (see --json)_

## explanation-mentions-other-answer (P1) - 2 rows

- `g3-gs-u19-v6-cloze-086c447b45c7` — Choose the best word or phrase to complete the sentence: We ride our bikes in the ___. → **park**
- `g3-gs-u01-v6-cloze-6e30be760cdb` — Choose the best word or phrase to complete the sentence: I say hello to my ___. → **friend**


## dup-prompt-same-grade (P2) - 106 rows

- `g5-mat-v4-percent-intro-3c860e0081` — What is 50% of 100? → **50**
- `g5-math-v5-5032-de0044128f` — What is 50% of 100? → **50**
- `g5-math-v5-1182-8ec4cbebfb` — What is 50% of 100? → **50**
- `g3-gs-u02-listen-008-5992a78720` — Listen and choose the sentence you hear. → **Hello!**
- `g3-gs-u01-listen-008-5992a78720` — Listen and choose the sentence you hear. → **Hello!**
- `g3-gs-u03-listen-008-5992a78720` — Listen and choose the sentence you hear. → **Hello!**
- `g1-math-v5-1093-3d6883aa3a` — How many sides does a triangle have? → **3**
- `g1-math-v5-1201-ee49697b69` — How many sides does a triangle have? → **3**
- `g1-math-v5-1210-b6c1b512b4` — How many sides does a triangle have? → **3**
- `g1-math-v5-1300-0abf6aebd4` — How many sides does a triangle have? → **3**
- `g1-mat-v4-shapes-e7311d4677` — How many sides does a triangle have? → **3**
- `g1-math-v5-1084-30f3b7cad3` — How many sides does a triangle have? → **3**
- _…and 94 more (see --json)_
