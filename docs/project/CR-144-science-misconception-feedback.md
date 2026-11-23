# CR-144: science misconception distractors + why-wrong feedback

Research: `docs/research/edu-apps/2026-W48.md` G1 - POE meta-analysis
g=1.015 (elementary band): learning happens when a plausible wrong
belief is committed to and corrected. Our science distractors are junk
fillers ("candy, toys, shoes" for "what do plants need") that
discriminate nothing and teach nothing on a miss. CR-137 proved the
per-option "tai sao sai" feedback slot on the EN bank; science is where
documented K-5 misconceptions are richest.

## Problem

Every khoa-hoc MCQ pairs a real fact with implausible distractors, so a
wrong tap is noise, not signal - no misconception is surfaced, no
correction lands. The verdict layer can already show "Goi y:" feedback
but only bank-oracle rows populate it; locally generated science items
never do.

## Scope (proposal)

- `scienceBank.ts`: each distractor becomes a documented child
  misconception (or genuinely plausible confusion) carrying a short
  Vietnamese "why it is wrong" note. Where the bank has no classic
  misconception for a fact, distractors still get a truthful
  one-line correction. Misconception-first fact growth: add authored
  facts for the canonical K-5 set (moon emits light, plants eat food
  from soil, heavier falls faster, seasons = Earth closer to sun,
  whales are fish, steam/ice are not water, etc.) up to a modest bump
  per band.
- `GrammarMcqQuestion`: optional `optionFeedback` map option-text ->
  feedback string, populated by the science generator (keyed by text so
  it survives the seeded option shuffle).
- Classification items: generated feedback from existing members /
  nonMembers data ("X la Y, khong phai Z").
- `ExamScreen` non-bank verdict path: resolve picked option's
  `optionFeedback` into `verdict.feedback` on a wrong answer.
- TrueFalse / fill-in variants unchanged (explanation already covers
  the miss); no new UI surface.
- `scripts/gen-template-math-sci.mjs`: every science `mcq()` call site
  emits `fb` (option-text -> Vietnamese "tai sao sai"); `toRow` writes
  `answer.distractor_feedback` so the existing CR-137 oracle returns it
  through `score_bank_attempts` with zero schema change.
- Production backfill (`--patch`): live tpl rows were seeded by older
  generator versions so ids/choice-order drifted - rows are matched by
  CONTENT (normalized prompt + correct-text -> full fb pool), then a
  shape parser (`liveFb`) covers legacy prompts the current script no
  longer emits, and a `explanation_vi` fallback covers the rest. Only
  `answer` + `content_hash` are PATCHed per row - editorial columns
  (review_status, publication_policy) are never touched.
- Content defect quarantined in the same pass: the "Too much candy is
  good for us ... correct action: keep doing it" rows (5, one per
  grade) were rejected (`review_status='rejected'`); the generator's
  HEALTH frame now keys candy as harmful and HEALTH_BAD adds
  skipping-breakfast/screens items appended LAST so no rng draw shifts
  and live template ids stay stable.

## Acceptance

- Every generated science MCQ carries feedback for every wrong option;
  a wrong tap shows the "Goi y:" line in practice and mock sittings.
- No junk distractor remains where a documented misconception exists.
- Vietnamese copy: hyphen only, no em/en-dash.
- `generateScienceQuestions` tests extended: every MCQ wrong option
  resolves feedback; article/grammar invariants keep passing.
- lint + typecheck + build green; Playwright-verify a science sitting.
- Every live science MCQ row carries `answer.distractor_feedback`
  (verified by DB count, not by trusting generator output).

## Status (2026-11-23)

- Local generator + `scienceBank.ts` + `ExamScreen` verdict path:
  implemented, unit-tested (every wrong option resolves a non-empty
  hint), `tsc -b` + vite build + full suite (216 files / 1862 tests)
  green.
- Production backfill executed: all 23,741 live science MCQ rows
  (5 grades) now carry `answer.distractor_feedback` - DB-verified.
  5 defective "candy is good" rows rejected.
- Playwright-verified the real flow (demo_hs login, Lop 1 Luyen de
  Khoa hoc): wrong pick on an odd-one-out MCQ renders
  "Goi y: shark LA fish (ca) - cau hoi tim con KHONG thuoc nhom nay.";
  a second wrong pick on a nutrition MCQ renders the explanation-
  fallback hint. Both surfaces confirmed end-to-end through the oracle.
