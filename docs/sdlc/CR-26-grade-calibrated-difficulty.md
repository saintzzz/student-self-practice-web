# CR-26 - Grade-calibrated difficulty & diversity (IOE deep dive round 2)

## Trigger

User feedback: "đề cho lớp 4 dễ quá và không đa dạng" - and asked whether
question forms are truly differentiated by grade.

## Deep-dive research (ioe.vn, account Lý Bảo Anh, 2026-10-01)

Account is locked to Khối 4 (grade selector is display-only for this
account - cannot inspect grade 3/5 content; that limitation is
acknowledged). Two research surfaces were mined:

1. **Thi thử live exam** (previous session): Cấp Trường Lớp 4, 30:00
   countdown, 10-question strip paging, NỘP BÀI, ~15 questions sampled.
2. **Kết quả bài thi gần nhất** (this session): the wrong-answer review
   of a real completed Cấp Trường G4 exam (1570/2000) - exposes the full
   text + correct answer of 31 real questions (Q1..Q189).

### Real Grade-4 question evidence (verbatim from the review)

- Pronunciation is **reference-letter based**, not simple odd-one-out:
  - "Which word has the underlined part pronounced differently from the
    letter I in NIGHT?" -> correct: English (kite was the trap)
  - "...pronounced like the letter S in ADDRESS?" -> weeks (not days)
  - "...like the letter O in TODAY?" -> collect (not open)
  - "...differently from the letter T in TRAIN?" -> kitchen (dictation same)
  - "...like the letter O in MONDAY?" -> Monkey (not Morning)
- Grammar at real G4 level: past tense ("They ___ a new kite last
  weekend" -> made), gerund spelling ("Tom likes ___ in the sea" ->
  swimming), auxiliary negation ("We ___ like watching TV" -> do not),
  date vs day ("What's the ___ today?" -> date), prepositions ("come ___
  my birthday party" -> to), articles ("___ English teacher" -> an),
  nationality adjective ("She is ___" -> Japanese, trap: Britain),
  o'clock, "a lot of stamps" (trap: moneys), error correction ("Choose
  the underlined part that needs correction: ... I going to school" ->
  going), "Which of the following is CORRECT?" sentence selection.
- Word completion is **mid-word masked MCQ**: "G***bye." -> ood (trap
  oos), "cand***" -> les (trap dle), "l*** of cakes" -> ots (trap ost),
  "the ***er" -> wat (trap sea).
- Reorder sentences are long: "It is a picture of our sports day."
  (9 words), "He can't ride a horse."
- Reading T/F uses a **timetable passage** (Minh's weekly schedule,
  ~50 words) requiring inference ("Minh has PE on Wednesdays" -> FALSE,
  PE is on Tuesdays).
- General-knowledge MCQ in English: "Which month has thirty-one days?"
  -> March (trap September), "Is Vietnamese Women's Day in November?"
  -> "No, it isn't. It's in October."

## Audit of current implementation (script-verified)

Pool composition per grade (English program, seed 'audit'):

| grade | words | pool | avg sentence words | image-choice |
|-------|-------|------|--------------------|--------------|
| 1     | 118   | 215  | 4.0                | 40           |
| 2     | 326   | 215  | 3.8                | 40           |
| 3     | 337   | 213  | 3.8                | 40           |
| 4     | 360   | 215  | **4.1**            | **40**       |
| 5     | 321   | 215  | 4.3                | 40           |

Root causes of "grade 4 too easy / not diverse":

1. **Identical slice quotas for all grades** - G4 gets the same
   40-image-question recognition load as G1; real IOE G4 is dominated by
   grammar/reading/spelling, not picture naming.
2. **Sentence templates identical across grades** - word-order,
   missing-letter and listening-fill-blank (140/215 = 65% of the pool)
   are all built on ~4-word sentences ("I have a cat."). G4 averages
   4.1 words vs G1's 4.0 - no difficulty gradient at all.
3. **Authored banks too thin**: GRAMMAR_G45 = 18 items shared by two
   grades; READING_G45 = 6 short passages -> 12 T/F questions.
4. **Missing real IOE types**: reference-letter pronunciation MCQ,
   masked-word spelling MCQ (G***bye -> ood), error correction,
   "Which is CORRECT", calendar/general-knowledge MCQ.
5. Math and Science DO scale by grade already (G1 single-digit ops ->
   G4 three-digit ops) - the problem is concentrated in English.

## Scope

- Expand `GRAMMAR_G45` 18 -> ~48 authored items covering observed IOE
  patterns; modest expansion of `GRAMMAR_G3`.
- New `src/data/ioeBanks.ts`: authored MCQ banks reusing the
  grammar-mcq shape (prompt + 4 options + explanation):
  - `SPELLING_*`: masked-word completion ("G_ _ _bye" -> ood) per band.
  - `PRONUNCIATION_G3/G45`: "pronounced like/differently from the
    letter X in WORD" - phonetically verified items only.
  - `ERROR_G45`, `CORRECT_G45`, `FACTS_G45`: error correction,
    which-is-correct, calendar/general-knowledge.
- New `src/data/reorderBank.ts`: authored longer sentences (up to 10
  tokens) for G3/G45 word-order; template sentences fill the remainder.
- Expand `READING_G45` with a timetable passage + 2 more passages,
  3 statements each (matches observed IOE format).
- Grade-scaled quotas in `buildEnglishPool`: G45 shifts weight from
  image-choice (40 -> ~22) to grammar-shape (20 -> ~50 across banks),
  reading (15 -> 20) and longer reorders; G3 intermediate; G12 mostly
  unchanged.
- Raise word-order `MAX_TOKENS` to 10 for authored sentences.
- Tests: grade pools produce materially different kind distributions;
  G4 reorder sentences longer than G1; new banks have exactly one
  correct option each; all pools still >= 200.

## Implementation status (2026-10-01)

Shipped:
- `GRAMMAR_G45`: 18 -> 48 items (past tense, gerund spelling, aux
  negation, date/day, prepositions, articles, nationality, o'clock,
  "a lot of", comparatives, would-you-like, be going to).
- `src/data/ioeBanks.ts`: SPELLING_G12/G3/G45 (masked-word MCQ),
  PRONUNCIATION_G3/G45 (reference-letter sound MCQ, phonetically
  verified), ERROR_G45, CORRECT_G45, FACTS_G45 - all rendered via the
  grammar-mcq shape, no new UI needed.
- `src/data/reorderBank.ts` + `generateAuthoredWordOrderQuestions`:
  authored 7-10 word reorder sentences for grade 3+, capped at
  AUTHORED_MAX_TOKENS=10; get their own slice so stratification cannot
  starve them.
- `READING_G45`: +3 passages incl. a weekly-timetable passage matching
  the observed IOE format; statements now include inference traps.
- `englishQuotas(gradeId)`: G45 = image 22 / reorder 48 / odd 25 /
  missing-letter 20 / MCQ 50 / T-F 20 / listening 20 / extra-letter 12;
  G3 intermediate; G12 unchanged.
- Verified pool sizes: G1-2 217, G3 214, G4-5 237; G4 word-order now
  mixes authored long sentences (~30 authored in the slice).
- New tests pin: bank validity (4 distinct options, blank-count ==
  answer-chunk length), grade-band unlocking, G4 > G1 difficulty
  (fewer image questions, more MCQ/reading, longer reorders), and
  >=200 pool for every grade x program.

Gates: 758/758 unit tests, tsc clean, vite build pass.

## Out of scope

- Grade 3/5 IOE ground truth (account locked to Khối 4 - inferred from
  curriculum progression instead).
- Competition levels (Trường/Phường/Tỉnh/QG), leaderboard, AI speaking
  exam.
- sentencesForWord signature stays unchanged (avoids regressions in the
  shared listening generator); upper-grade sentence length comes from
  the authored reorder bank.
