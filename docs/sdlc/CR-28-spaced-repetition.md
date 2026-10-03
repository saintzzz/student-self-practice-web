# CR-28 - On lai cau sai (spaced repetition 1/3/7 ngay) - Tier-1

## Trigger

Product-owner review (2026-10-01): wrong answers are never seen again.
The single most valuable learning loop - re-asking what the student got
wrong at increasing intervals - is missing. Second Tier-1 item under the
standing "lam lan luot tu Tier 1" ruling.

## Scope

- Wrong answers from **Luyen de (drill) and Thi thu (exam)** are stored
  locally with a spaced-repetition stage: +1 day, +3 days, +7 days,
  then mastered and removed.
- A **"Ôn lại câu sai"** card on the grade home screen appears only
  when due items exist; starting it launches a practice-style session
  built from the due questions (instant verdicts, explanations - reuses
  the ExamScreen practice path).
- Answering a review question correctly advances its stage; answering
  it wrong resets to stage 0 (due tomorrow).
- A review session completion counts as the daily "Luyen de" quest and
  its correct answers count toward the daily target (existing CR-27
  wiring - free synergy).
- Guest mode works (localStorage). Logged-in same behavior; server sync
  deferred to a future sync CR (same ruling as CR-27 option B).

## Options considered

| Option | Strengths | Weaknesses | Ruling |
|--------|-----------|------------|--------|
| A. Store question key + regenerate by seed | Small storage | Only works for seeded generators; IOE real bank items have no stable seed path; fragile across bank updates | Rejected |
| B. Serialize the ExamQuestion itself | Robust, renders identically, kind-agnostic | ~1-2KB per item | **Chosen** - cap 60 items/grade, evict oldest |
| C. Server-side wrong_queue table | Cross-device | Needs migration + RLS + sync; guest impossible | Deferred (same as CR-27) |

## Impact assessment

| Area | Impact |
|------|--------|
| `src/lib/engagement/store.ts` | New `review` slice: `ReviewItem[]` keyed under grade; actions `recordWrongExamQuestion`, `getDueReviewItems`, `recordReviewOutcome`. Additive; backward compatible. |
| `src/components/ExamScreen.tsx` | `mode` gains `'review'` (behaves as practice: instant verdict, no countdown); optional `presetQuestions` bypasses `createExam`; per-answer hook records review outcomes + wrong-question capture (practice mode); exam mode captures wrongs at result time from `computeExamResult().review`. |
| `src/App.tsx` | `handleStartExam` gains `'review'` mode; StartBatchScreen gets the review card with due count. |
| `src/components/StartBatchScreen.tsx` | New ReviewCard (below DailyQuestCard) rendered only when `dueCount > 0`. |
| `src/lib/exam/examSession.ts` | Read-only; `ExamState` is constructed manually for review sessions (same shape). |
| Supabase / migrations | None. |
| Tests | Store: stage progression, due filtering, reset-on-wrong, cap eviction, date reset. Component: review card visibility, session wiring. |

Risk: LOW-MEDIUM - touches ExamScreen's answer path (shared with real
exam). Mitigation: review-mode branches are additive; exam/practice
flows unchanged; full suite re-run.

Estimate: M. No WBS re-run per CR rules.

## BA artifact

- US-1: As a student, questions I answered wrong come back tomorrow so
  I can fix my mistakes.
- US-2: As a student, if I get a review question right three times
  (spaced out) it graduates and stops coming back.
- US-3: As a student, if I get a review question wrong again it comes
  back sooner (tomorrow), not later.
- US-4: As a parent, I know the app re-teaches what my child misses.

### Acceptance criteria

- AC-28.1 GIVEN a wrong answer in a drill WHEN it is recorded THEN a
  review item exists with stage 0 and due date = tomorrow.
- AC-28.2 GIVEN a review item due today WHEN the grade home renders
  THEN the "Ôn lại câu sai" card shows the due count and starts a
  session with those questions.
- AC-28.3 GIVEN a correct answer on a stage-0/1/2 item WHEN recorded
  THEN the item advances to stage 1/2/3 with due +3/+7/mastered.
- AC-28.4 GIVEN a wrong answer on any review item WHEN recorded THEN
  its stage resets to 0 and due = tomorrow.
- AC-28.5 GIVEN >60 items for a grade WHEN a new wrong is recorded
  THEN the oldest item is evicted (queue stays <=60).
- AC-28.6 GIVEN an exam-mode finish WHEN results compute THEN every
  wrong answered question is captured into the review queue.
- AC-28.7 GIVEN a completed review session WHEN it finishes THEN the
  daily drill quest is marked done (CR-27 integration).

## Design brief (compact)

- ReviewCard sits directly below DailyQuestCard on StartBatchScreen;
  renders only when due count > 0. Label: "Ôn lại câu sai" + count +
  primary CTA "Ôn ngay - N câu".
- Inside the session: identical to Luyen de practice (verdict,
  explanation, phonetic) - no new question UI.
- No new Lottie; respects reduced-motion via existing verdict path.

## Architecture note

- `ReviewItem`: `{ id, question, stage (0|1|2|3), addedAtISO, dueISO }`;
  `question` is the serialized `ExamQuestion` (union is JSON-safe -
  checked: all kinds are plain data + emoji strings, no functions).
- Stage -> interval map: `0:+1d, 1:+3d, 2:+7d, 3: mastered(remove)`.
- ExamScreen gains `presetQuestions?: readonly ExamQuestion[]`; when
  set, `begin()` builds `ExamState` directly (same shape, timeLimitSec
  unused in practice) instead of `createExam`.
- In review mode, per-answer hook calls `recordReviewOutcome(question.id,
  isCorrect)` instead of wrong-capture (item already in queue). In
  practice mode, wrong verdicts call `recordWrongExamQuestion`. In exam
  mode, wrongs are captured once at result time.
