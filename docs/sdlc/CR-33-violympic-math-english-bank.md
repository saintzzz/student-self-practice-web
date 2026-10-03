# CR-33 - Violympic Math-English question bank + image support

## Trigger

Owner provided a real Violympic account (grade 2) and asked to harvest
reputable external questions the same way IOE was harvested. The math
program currently generates synthetic arithmetic only; real Violympic
"Toan Tieng Anh" items raise content credibility for B2B demos.

## Scope

- Harvest the free practice rounds ("Thi thu") of the grade-2
  Math-English subject via Playwright + the site's own practice API
  (load-exam / submit-single-answer / submit-exam / begin-round).
- Persist raw payloads + question/answer images self-hosted under
  `public/images/vio/` with attribution recorded in
  `public/attribution.json`.
- Convert harvested items into exam questions:
  - `MULTI_CHOICE` -> `grammar-mcq` (text options) or with
    `optionImages` when options are images.
  - `TEXT` -> `text-answer` with the solved numeric/word answer in
    `accept`.
  - `ORDERING`, `MATCHING` - recorded raw, not shipped this CR.
- Extend `GrammarMcqQuestion` and `TextAnswerQuestion` with optional
  `imageUrl`; `GrammarMcqQuestion` gains optional `optionImages`
  (rendered in place of option text).
- Wire the grade-2 real bank into the math-English generator with the
  existing synthetic generator as fallback/top-up for other grades.
- Answer keys come from two channels: the submit-single-answer oracle
  (`isCorrect`) plus hand-solved grade-2 math reviewed against the
  rendered images. Wrong/unverifiable items are dropped, not guessed.

## Impact assessment

| Area | Impact |
|------|--------|
| `src/data/vioMathBank.ts` (new) | harvested grade-2 items |
| `src/types/exam.ts` | optional `imageUrl`, `optionImages` |
| `src/components/ExamScreen.tsx` | render question image + option images |
| `src/lib/exam/mathEnglish.ts` | prefer real bank for grade-2, keep synthetic fallback |
| `public/images/vio/` | ~1000 self-hosted question images |
| `public/attribution.json` | Violympic attribution entry |
| `scripts/_vio-*` | harvester/verification tooling (dev-only) |

Risk: MEDIUM - new render surface (images in exam player) is additive
and optional; generator change is gated behind bank lookup so other
grades are unaffected.

## AC

- AC-33.1 Math-English exam for grade 2 draws from the harvested bank.
- AC-33.2 Image questions render correctly inside the exam player.
- AC-33.3 Other grades still work via the synthetic generator.
- AC-33.4 Every shipped question has a verified correct answer.
- AC-33.5 Attribution present; no hotlinked images at runtime.
