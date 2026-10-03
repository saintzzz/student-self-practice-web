# CR-27 - Daily Quest (nhiệm vụ ngày) - Tier-1 retention

## Trigger

Product-owner review (2026-10-01): English Arena has no reason for a
student to come back every day. Streak exists in the engagement store
but nothing consumes it - there is no daily loop. IOE retains users via
sequential self-practice rounds; we need an equivalent daily habit hook.

Human ruling: "lam lan luot tu Tier 1 tro di" - this is the first
Tier-1 item.

## Scope

- A **"Nhiệm vụ ngày" (Daily Quest)** card on the grade home screen
  (`StartBatchScreen`), shown for every grade.
- 3 quests per day, generated deterministically from the date + grade:
  1. Hoan thanh 1 luot "Luyen de" (any program).
  2. Tra loi dung it nhat 10 cau trong ngay (any mode).
  3. Hoan thanh 1 luot "Thi thu" hoac round 4-game (gives a heavier
     option for motivated students).
- Quest progress tracked in the engagement store (localStorage), keyed
  by ISO date - resets at local midnight.
- Completing all 3 quests grants +3 bonus stars and counts as the
  streak-day activity (existing `streak` field continues to work).
- Guest mode works (localStorage only); logged-in students get the same
  behavior now, server sync deferred to a later CR.

## Options considered

| Option | Strengths | Weaknesses | Ruling |
|--------|-----------|------------|--------|
| A. Server-side quest table in Supabase | Cross-device, audit trail | Needs migration + RLS + sync logic; guest mode still needs local fallback anyway | Rejected for now - defer to a "server sync" CR |
| B. Extend localStorage engagement store | Zero schema change, guest-safe, TDD-friendly | Per-device only | **Chosen** - matches existing store design |
| C. Weekly quest only | Simpler | Weaker habit loop | Rejected - daily cadence is the point |

## Impact assessment

| Area | Impact |
|------|--------|
| `src/lib/engagement/store.ts` | Add `dailyQuest` slice (dateISO, per-quest progress, claimed flag) + actions: `recordQuestProgress`, `claimDailyBonus`. Existing fields untouched - additive, backward compatible via merge with EMPTY_STATE. |
| `src/components/StartBatchScreen.tsx` | New DailyQuestCard section above the drill/exam grid. No existing behavior changed. |
| `src/App.tsx` | Hook quest progress recording into existing batch-complete / exam-complete paths (one call site each). |
| `src/lib/exam/examSession.ts` | Read-only - quests reference existing modes, no generator change. |
| Supabase / migrations | None. |
| Tests | New store tests (reset at date change, progress clamping, bonus claim once, streak integration); component test for card states (fresh / partial / complete). |
| Copy | Vietnamese, ASCII hyphens only, no em/en-dash. |

Risk: LOW - additive slice, no schema, no route changes, no RBAC
surface. Rollback = revert card + store slice.

Estimate: M (~1 phase-cycle). No WBS re-run per CR rules.

## Status

- 2026-10-01: **RESOLVED** - deployed `d717ae2`, verified live on
  ea.vieschool.com (quest card renders on grade home; 773/773 tests).
  Cross-model review round 1: 3 findings fixed (round-level correct-answer
  crediting incl. guest-locked path, card auto-refresh at midnight,
  answer-time attribution with per-question dedupe).

## BA artifact

### User stories

- US-1: As a student, when I open my grade page I see 3 quests for today
  so that I know what to do to earn my daily reward.
- US-2: As a student, quest progress fills as I play (any mode counts
  toward "10 correct answers"), so I do not have to do anything special.
- US-3: As a student, when I finish all 3 quests I get bonus stars and
  my day streak continues, so the daily habit feels rewarding.
- US-4: As a returning student, yesterday's quests are gone and a fresh
  set appears, so every day starts clean.

### Acceptance criteria (Gherkin)

- AC-27.1 GIVEN a fresh device WHEN the grade home screen renders
  THEN a "Nhiệm vụ ngày" card lists exactly 3 quests, all at 0 progress.
- AC-27.2 GIVEN quest "Luyen de" incomplete WHEN a drill batch completes
  THEN that quest is marked done and the card re-renders checked.
- AC-27.3 GIVEN a student answers questions in any mode WHEN cumulative
  correct answers today reach 10 THEN the correct-answer quest is done.
- AC-27.4 GIVEN quest state saved under date D WHEN the store loads on
  date D+1 THEN all quests reset to 0 progress and unclaimed bonus.
- AC-27.5 GIVEN all 3 quests done WHEN the bonus is claimed THEN
  totalStars increases by 3 AND claiming again does not double-grant.
- AC-27.6 GIVEN a day with all quests done WHEN the bonus is claimed
  THEN the existing day-streak is recorded for that date (idempotent).
- AC-27.7 GIVEN a guest (no Supabase session) WHEN quests complete THEN
  all behavior works identically with localStorage only.

## Design brief (compact)

- Card placement: `StartBatchScreen`, above the program grid - first
  thing the student sees on the grade page.
- Visual: navy/gold card matching VieSchool surface; each quest = one
  row (icon chip + Vietnamese label + progress bar or check).
- States: fresh (0/3), partial (progress bars), all-done (claim
  button "+3 sao" -> claimed state shows "Hoan thanh! Hen ngay mai.").
- Motion: respects prefers-reduced-motion; no Lottie on this card
  (constitution C5 - max 1 player before answering, reserved for mascot).
- Copy: Vietnamese-first; "Nhiệm vụ ngày", quest labels as in scope.

## Architecture note

- Pure additive slice in `engagement/store.ts`: `DailyQuestState`
  `{ dateISO, drillDone, correctToday, bigModeDone, bonusClaimed }`.
- Store validates date on every read: stale date -> reset slice.
- Recording entry points: `recordDrillComplete()`, `recordCorrectAnswers(n)`,
  `recordBigModeComplete()` - called from App completion paths.
- No new routes, no Supabase, no RBAC surface. Seeded generation of
  quest set is fixed (same 3 quest types daily) - determinism comes
  from the type list itself, so no per-day RNG needed in v1.

