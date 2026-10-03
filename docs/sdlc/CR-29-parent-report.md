# CR-29 - Bao cao cho ba me (in-app progress + skill breakdown) - Tier-1

## Trigger

Product-owner review (2026-10-01): parents pay but see nothing. There is
no surface showing what the child practised, how accurate they are, or
which skills are weak. Third Tier-1 item under the standing ruling.

## Scope

- A **"Báo cáo cho ba mẹ"** screen reachable from the grade-select
  screen (top-level, always visible - it is the payer's proof of value).
- Data, all from the local engagement store (guest-safe, same ruling as
  CR-27/28 - server sync deferred):
  - Streak (ngày liên tiếp), tổng sao, huy hiệu đã mở.
  - Activity last 7 days: câu đã làm + câu đúng per day.
  - Per-grade progress: batches completed, stars earned.
  - **Skill breakdown**: correct/total per skill (ngữ pháp, chính tả,
    đọc hiểu, phát âm, sắp câu, nghe, toán TA, khoa học, nói...) sorted
    weakest first, with accuracy bar.
  - Review queue count (câu đang chờ ôn lại - CR-28 link).
- Recording: extend the store with a per-skill + per-day stats slice
  written at the existing answer/round boundaries (ExamScreen answer,
  exam-result capture, RoundSummary round outcome).
- Privacy note: this is a per-device report, no account needed in v1.
  Multi-device/server reports belong to the deferred sync CR.

## Options considered

| Option | Strengths | Weaknesses | Ruling |
|--------|-----------|------------|--------|
| A. Report built from Supabase results | Cross-device, real account data | results table stores only aggregate rows (no per-skill); needs migration + session; guest invisible | Deferred to sync CR |
| B. Local store stats slice | Works for guest + logged-in today; per-skill granularity | Per-device only | **Chosen** |

## Impact assessment

| Area | Impact |
|------|--------|
| `src/lib/engagement/store.ts` | New `stats` slice: `days: Record<dateISO,{correct,total}>`, `skills: Record<gradeId, Record<skillKey,{correct,total}>>`. Actions: `recordSkillAnswer`, `recordSkillAnswers`, `getReportSnapshot`. Additive, backward compatible. |
| `src/components/ExamScreen.tsx` | Call `recordSkillAnswer(gradeId, skillKey(question), isCorrect)` at answer time (already computed). |
| `src/components/RoundSummary.tsx` | Call `recordSkillAnswers(gradeId, roundSkillKey(outcome.roundType), correctCount, totalCount)`. |
| `src/App.tsx` + `GradeSelect.tsx` | New 'report' screen + entry button "Báo cáo cho ba mẹ". |
| New `ParentReportScreen.tsx` | Read-only dashboard: streak/stars/badges, 7-day activity rows, per-grade progress, weakest-first skill bars, review-queue count. |
| Supabase / migrations | None. |
| Tests | Store: day/skill accumulation, oldest-day retention. Component: report renders all sections with seeded stats. |

Skill key mapping (kind/roundType -> Vietnamese group):
grammar-mcq->Ngữ pháp, word-order->Sắp xếp câu, missing-letter +
extra-letter->Chính tả, odd-pronunciation->Phát âm, true-false-reading->
Đọc hiểu, text-answer->Điền đáp số, image-choice->Từ vựng, listening-*->
Nghe, pair-matching->Ghép cặp, describe-and-choose-image->Mô tả hình,
pronunciation-recording->Nói, phonics-*->Phonics.

Risk: LOW - additive stats + a read-only screen. No behavior change to
play flows beyond two one-line record calls.

Estimate: M. No WBS re-run.

## BA artifact

- US-1: As a parent, I open "Báo cáo cho ba mẹ" and see whether my child
  practised this week and how accurate they were.
- US-2: As a parent, I see which skill is weakest so I can encourage
  the right practice.
- US-3: As a student, my stats accumulate silently as I play - no extra
  steps.

### Acceptance criteria

- AC-29.1 GIVEN answers were recorded WHEN the report renders THEN the
  7-day section shows per-day correct/total for days with activity.
- AC-29.2 GIVEN answers across >=2 skills WHEN the report renders THEN
  skills are listed weakest-first with correct accuracy percentages.
- AC-29.3 GIVEN a fresh device WHEN the report renders THEN empty
  states show friendly text instead of zeros/NaN.
- AC-29.4 GIVEN any mode (drill, exam, batch round) WHEN an answer is
  recorded THEN day + skill counters increment once per answer.
- AC-29.5 GIVEN 60+ days of activity WHEN the store persists THEN only
  the most recent 30 day-entries are retained (bounded storage).

## Design brief (compact)

- Entry: a navy/gold "Báo cáo cho ba mẹ" button on GradeSelect header
  row (next to huy hiệu), icon 📊.
- Screen: same dark card language as BatchSummary; sections stacked:
  header (streak chip + stars), "7 ngày qua" activity list, "Theo lớp"
  progress, "Kỹ năng cần ôn" bars (emerald>=80%, amber 50-79%, rose<50%),
  "Đang chờ ôn lại" count.
- No charts library - simple bars (divs) keep bundle light; reduced-
  motion safe (no animation needed).
