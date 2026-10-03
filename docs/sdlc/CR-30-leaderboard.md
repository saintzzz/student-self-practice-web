# CR-30 - Bang xep hang tuan (weekly leaderboard) - Tier-1

## Trigger

Product-owner review: IOE's retention engine is competition. English
Arena has zero social/comparison surface. Fourth Tier-1 item under the
standing ruling.

## Scope

- **Weekly leaderboard per grade**: top 10 students by total points in
  the current ISO week, sourced from `practice.results` (all programs).
- A "Bảng xếp hạng tuần" section on the grade home screen: rank list
  with own row highlighted; caller's rank shown even outside top 10.
- Guests see a lock prompt ("Đăng nhập để xem bảng xếp hạng") - the
  leaderboard only exists server-side for accounts.
- **Results coverage fix**: exam/drill completions now also save to
  `practice.results` with a new `program` column ('batch' | 'english' |
  'math' | 'science') so leaderboard reflects all practice, not only
  4-round batches.

## Options considered

| Option | Strengths | Weaknesses | Ruling |
|--------|-----------|------------|--------|
| A. Relax RLS: students read all results | Simple | Leaks every student's full history - privacy fail for minors | Rejected |
| B. View with aggregation | Simple | Views bypass RLS (all-or-nothing); security_invoker would still cap at own rows | Rejected |
| C. SECURITY DEFINER RPC in `practice` schema returning aggregates only | Exposes only name + weekly totals; auditable auth check inside | Needs careful grants | **Chosen** |

## Security design (per Supabase checklist)

- Function `practice.weekly_leaderboard(p_grade_id, p_limit)`:
  - `security definer`, `stable`, `set search_path = ''` (pinned).
  - Body guards `auth.uid() is not null` -> returns empty otherwise.
  - Returns only: rank, display_name, weekly_points, weekly_correct,
    is_me - never account ids, never full history.
  - Lives in non-exposed `practice` schema; `revoke all` from
    anon/authenticated, `grant execute` to authenticated only.
- `results.program` column: check-constrained enum, default 'batch' -
  existing rows keep working.

## Impact assessment

| Area | Impact |
|------|--------|
| `supabase/migrations/0004_leaderboard.sql` | alter results add program; create weekly_leaderboard rpc; grants |
| `src/lib/practiceResults.ts` | savePracticeResult gains program param; new saveExamResult for drill/exam completions |
| `src/lib/leaderboard.ts` (new) | fetchLeaderboard(gradeId) via rpc; graceful empty/error |
| `src/components/LeaderboardCard.tsx` + StartBatchScreen | rank list, own-row highlight, guest lock state |
| `src/components/ExamScreen.tsx` | save result on completion (drill + exam) |
| Tests | UI states (top list, is_me highlight, guest lock, empty); saveExamResult insert shape |

Risk: MEDIUM - new RPC surface on prod DB (mitigated: non-exposed
schema, aggregate-only output, execute grant scoped). App code additive.

Estimate: M. No WBS re-run.

## BA artifact / AC

- AC-30.1 GIVEN students with results this week WHEN a student opens a
  grade page THEN the leaderboard shows top 10 ranked by weekly points.
- AC-30.2 GIVEN the caller outside top 10 WHEN the list renders THEN
  their own row appends with real rank and is_me highlight.
- AC-30.3 GIVEN a guest WHEN the section renders THEN a lock prompt
  shows instead of names (no names leaked client-side).
- AC-30.4 GIVEN a finished drill or exam WHEN result completes THEN a
  results row is saved with the correct program value.
- AC-30.5 GIVEN no activity this week WHEN the list renders THEN a
  friendly empty state shows ("Chưa có ai lên bảng - bé hãy là người
  đầu tiên!").
