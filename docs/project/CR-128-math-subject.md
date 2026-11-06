# CR-128 - Math as an additional service (scope + feasibility)

## Why

PO direction: extend the platform beyond English with a math subject,
positioned as an additional service - the Cupimath playbook applied to
our own infra (see `docs/research/competitive-cupimath.md`).

## What the audit found (reuse map)

Already multi-subject-ready:

- `practice.qb_questions.subject` exists: `check (subject in
  ('english','math','science'))` + `(grade, subject)` indexes -
  the bank was partitioned for this from day one.
- `qb_exam_forms.subject`, `qb_exam_blueprints`, `qb_review_queue`,
  `qb_item_stats` (SRS) - all content-agnostic.
- Attempts/assignments/classes/reports (trouble groups!) are
  skill-tagged records - a math skill is just a new skill string.
- Engagement (stars, streak, mascot, games shell), auth, parent gate,
  guest mode - subject-agnostic.

English-specific (what math does NOT reuse):

- Question renderers: all 14 kinds are word/phonics/listening-shaped.
- Vocabulary data layer, TTS/speech, pronunciation scoring.
- Content: 99k English questions mean nothing for math - the bank for
  math starts at zero. Content authoring is the real cost (~70%+ of
  the work), code is the minority.

## Structure decision (PO call)

Same repo, same app, subject dimension - NOT a separate app/fork:

- DB already partitioned; a fork would duplicate every future fix.
- Auth/parent/teacher/class/report infra serves both subjects for free.
- Student entry gets a subject picker alongside the grade/land picker
  ("Tiếng Anh" | "Toán"); each subject keeps its own world/progress.
- Brand: surface reads "VieSchool" family; English Arena becomes the
  English track. (`ea.vieschool.com` can later host a subject picker or
  a `toan.` alias pointing at the same deployment.)

## MVP cut (phase M1)

- 3 question renderers only: MCQ (text/image), number-input, true-false.
  No geometry drawing, no KaTeX (fractions as `a/b`, figures as SVG/img
  assets reusing the existing exhibit frame + EmojiVisual pipeline).
- Grade band: lớp 1-5 first (EA's core audience; skip mầm non/THCS).
- Curriculum: SGK Toán topic tree + tư duy types (Cupimath-style
  "dạng"), original content only - never their questions.
- Surfaces: practice rounds + "Luyện đề" only. No games, no competition
  mocks, no listening/TTS for v1.
- Teacher side comes free: assignments + trouble groups already work on
  any skill-tagged attempt once questions carry math skills.

## Later phases

- M2: exam-structure mocks for math competitions (TIMO/Kangaroo/SASMO
  scoring fidelity) - same engine, blueprint rows only.
- M3: math game mechanics (counting/sort/compare already exist in EA
  game kit), seasonal events.
- M4: bilingual math (Cupimath's differentiator) trivially available
  since EN text is our home turf.

## Content pipeline (the actual bottleneck)

- Build the topic tree first (~40-60 types/grade from SGK + olympiad
  formats), each with a worked-example card.
- Bulk question generation via browser automation of paid ChatGPT/
  Gemini web subscriptions (global rule - API keys stay for in-app AI),
  then scripted validation + human spot-check + in-app "báo lỗi" loop.
- Target M1: ~20 types x ~30 questions per grade = ~3k questions -
  enough to sell; grow on the same pipeline.

## Risks

- Content quality is the product here; ship with a review gate, not
  volume. "Báo lỗi câu này" from day one (cheap, see Cupimath).
- Brand dilution: keep the subject picker child-friendly (two worlds,
  same pig mascot can stay neutral - "Bé Heo học toán").
- Legal: original content only; "not affiliated with competition
  organizers" disclaimer on any competition-structure exam.

## Status

M1 pilot shipped (grade-scoped Vietnamese math track).

### Architecture decision (resolved)

Separate subject discriminator `math-vi` - NOT a locale flag on `math`:
- `'math'` stays math-in-English (English exam ecosystem, 54k rows).
- `'math-vi'` is the SGK Vietnamese track - clean separation at the
  bank, RPC, results, and UI layers with zero ambiguity on every join.
- Migration `0074_math_vi_subject.sql` extended
  `qb_questions_subject_check` and `results_program_check` to include
  `'math-vi'`. Arena tables intentionally unchanged (duels are
  English-only by design).

### Shipped

- DB: constraints migrated; `fetch_questions`/`_public`/`_adaptive`
  serve `math-vi` unchanged (`p_subject` is free-text).
- Content: `scripts/gen-template-mathvi.mjs` - deterministic VI
  templates per SGK ranges (G1 ≤20, G2 ≤1000/nhân chia 2-5, G3 ≤1000/
  chu vi, G4 lớp nghìn/phân số/góc, G5 thập phân/%/diện tích/thể tích/
  v-t-s). 939 items seeded: g1:150 g2:168 g3:320 g4:173 g5:128, all
  `rights_status='owned-original-generated'`, `review_status='approved'`,
  practice+mock eligible, exam-gated off.
- App: `ExamProgramId += 'math-vi'`; SUBJECTS/PROGRAM_LABEL/
  PROGRAM_VOICE_HINT/PROGRAM_STYLE/EXAM_PROGRAMS/ClassShow extended;
  `IconAbacus` added; 'Toán' card (amber, 🧮) sits after 'Tiếng Anh',
  before 'Toán tiếng Anh'. Assignment + challenge pid mapping updated.
  `buildExamPool` math-vi falls back to the bundled math generator for
  the offline/arena path only (canonical delivery is the bank).
- Tests: `bank.test.ts` math-vi subject-mapping + VI-row scoring (53
  tests green).

### Verified

- RPC returns VI prompts/choices with keyless wire shape (server-side
  scoring preserved); 8-row random sample all mathematically correct.

### Remaining for full M1

- Browser-verified prod flow (card -> practice -> result).
- True-false / number-input VI items (pilot is mcq-only; types exist in
  the engine, need VI content).
- Topic tree expansion toward ~3k items; "Báo lỗi câu này" already live
  on every bank row including math-vi.
- External review round pending after deploy.
