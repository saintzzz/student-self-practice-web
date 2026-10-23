# CR-106 - "Teach me" pre-answer lessons (status: APPROVED - cheap scope, PO ruling 2026-01)

Deferred out of CR-104 (M3 idea). Student taps "Dạy tôi" before
answering a bank question; a short per-skill lesson explains the
concept, then the question is answered UNGRADED (it is disclosed).

## The moat constraint (why this is a CR, not a flag)

CR-102's scoring moat grades only via `score_bank_attempts` - the oracle
holds the key. A taught question must NEVER submit a scored attempt for
that row again, or teaching becomes a score-laundering surface (teach ->
see key -> score). Design must therefore be disclosure-aware:

- `teach_bank_question(p_question_id)` RPC (new, rate-limited like
  fetch): returns the row's `explanation_vi` + lesson payload AND marks
  `(account_id, question_id)` as taught in a new `taught_marks` table
  (or a flag on `learning_events`).
- `score_bank_attempts` rejects (or grades-as-taught/no-score) any
  attempt on a taught row for that account.
- `fetch_questions` variants should prefer NOT re-serving taught rows
  for grading contexts; they may still appear in review decks where
  disclosure is free.

## Content dependency (the real cost)

`explanation_vi` exists on canonical rows but is a post-hoc rationale,
not a teaching script. Per-skill lesson content (G1-G5 x ~skill
taxonomy) is authoring work - either human-authored snippets keyed by
`skill`, or an LLM generation wave with the existing review/quarantine
pipeline. Scope decision needed: skill-level generic lessons (cheap,
~30-60 items) vs per-question lessons (expensive, thousands).

## Open questions for BA

- Which grades first? (Suggest G1-2 where "teach me" has highest value
  and content is smallest.)
- Does a taught question still count toward daily-quest/progress
  counters? (Recommend: counts as attempted-not-scored.)
- Lesson UI surface: QuestionCard popover vs full-screen interstitial.

## BA answers (PO ruling - autonomous mandate)

- **Grades:** all grades G1-G5 get the mechanism. Content is keyed by
  `(skill, band)` - band 1 = lớp 1-2, band 2 = lớp 3-5 - so authoring is
  ~20 snippets (10 English skills x 2 bands), not per-grade or
  per-question work. Band-agnostic fallback row per skill covers misses;
  `explanation_vi` is the last resort.
- **Counters:** attempted-not-scored. The taught question is EXCLUDED
  from both correct numerator and total denominator in
  `computeExamResult` - it is a learning moment, not an assessment item.
  It still counts as answered for navigation/progress.
- **UI surface:** inline panel on the exam-sheet paper (practice mode),
  not a popover or a separate route - G1-2 kids lose popover state; the
  sheet already scrolls. One dismiss button "Mình đã hiểu - làm tiếp".

## Approved scope (what ships)

- **Surface:** practice mode only (`ExamScreen` isPractice). Mock, exam,
  assignment, arena and review sittings NEVER show "Dạy tôi" -
  assessment integrity outranks helpfulness there.
- **Auth only:** `taught_marks` keys on `account_id`; guests have no
  account, so the button is hidden for guests (guest trial keeps its
  current shape). Teach RPC rejects anon with a distinct error.
- **DB (migration 0052):**
  - `practice.taught_marks(account_id uuid, question_id text,
    taught_at timestamptz, pk(account_id, question_id))` - RLS
    deny-all; only the definer RPC writes/reads it.
  - `practice.skill_lessons(skill text, band smallint, title_vi,
    body_vi, pk(skill, band))` - SELECT to authenticated; seed ~20
    English rows (band 1/2 + band 0 fallback per skill).
  - `teach_bank_question(p_question_id text)` - security definer,
    authenticated-only (anon -> `PT401`), `tbq_uid` cap 60/hr
    (teaching never exceeds ~10 legit calls/day), upserts the mark,
    returns `{question_id, taught, title_vi, body_vi, explanation_vi,
    skill}` - NEVER `answer`/key material.
  - `score_bank_attempts` guard: a taught `(account_id, question_id)`
    still grades (fixed-form sittings must not lose scored items) but
    the row returns with `'taught': true` so the client marks the item
    ungraded. Key material is NOT withheld - per 0048 economics a
    typed attempt already discloses `correct_answer_text`, so a
    teach->score drain gains nothing beyond what plain scoring leaks;
    the binding defenses stay `tbq_uid`/`sba_*` caps plus the fetch
    exclusion below (taught rows never re-serve to that account).
  - `fetch_questions__impl` + `fetch_questions_adaptive__impl`: add
    `not exists (select 1 from practice.taught_marks tm where
    tm.account_id = auth.uid() and tm.question_id = q.id)` to every
    eligibility query - authenticated grading pulls never re-serve a
    disclosed row; anon pulls are unaffected (`auth.uid()` null).
- **Client:**
  - `teachBankQuestion(bankId)` in `bank.ts` (kid-friendly error reuse).
  - `ExamQuestion.bankTaught?: boolean`; `BankScore.taught?: boolean`
    -> `hydrateBankQuestion` maps it (belt, for any stray verdict).
  - ExamScreen practice: "Dạy tôi" button on the sheet header for bank
    questions before the answer lands; lesson panel with
    "Mình đã hiểu - làm tiếp"; taught questions get a "đã học - không
    tính điểm" verdict panel instead of correct/wrong; no oracle call
    for taught rows.
  - `computeExamResult`: `bankTaught` items excluded from
    `correctCount` and `totalCount` (score reflects graded items only).
- **Not in scope:** math/science lessons (bank rows exist but English
  is the shipped program surface), per-question lessons, guest teach,
  review-deck re-serving (fetch exclusion is uniform - a taught row is
  simply never re-served to that account).
- **Estimate:** 1 migration + ~20 lesson rows, ~150 LOC client,
  ~80 LOC tests. One deploy + ExtRev round.

## Acceptance criteria (AC-106.*)

- **AC-106.1:** `teach_bank_question(p_question_id)` is authenticated-
  only (anon -> `PT401`), uid-capped (`tbq_uid` 60/hr), inserts the
  `taught_marks` row idempotently, and returns ONLY lesson payload +
  `explanation_vi` - never `answer`/`choices` key material. Unknown
  question ids return `{taught:false}` without marking.
- **AC-106.2:** `score_bank_attempts` keeps grading every attempt but
  tags caller-taught rows with `'taught': true` so clients mark them
  ungraded; no key fields are added or removed for taught rows.
- **AC-106.3:** `fetch_questions__impl` and
  `fetch_questions_adaptive__impl` exclude caller-taught rows in EVERY
  eligibility query (main + backfill + adaptive pool); anon pulls are
  unaffected.
- **AC-106.4:** practice sittings render "Dạy tôi" on bank questions
  before the first answer, for authenticated learners only; tapping it
  shows the skill lesson panel (title + body) with a dismiss action,
  and the button never renders in mock/exam/assignment/arena or for
  non-bank/guest sittings.
- **AC-106.5:** a taught question is attempted-not-scored: no oracle
  call on its answer, no telemetry/skill/quest counters, excluded from
  `computeExamResult`'s `correctCount` and `totalCount`, and the
  verdict panel shows the taught state instead of correct/wrong.
