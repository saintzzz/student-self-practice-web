# CR-138: Streak + daily goal retention loop

Research: `docs/research/edu-apps/2026-W46.md` G4 - Duolingo: learners
at a 7-day streak are 2.4x more likely to return next day; separating
streak from daily goal lifted D14 retention; weekend amulet +4%.

## Problem

Self-practice is episodic - no habit loop. Schools renew on sustained
usage; a child who does 5 questions daily beats one who crams monthly.

## Scope (proposal)

- **Daily goal**: "Hoàn thành N câu mỗi ngày" (default 5, configurable).
  One completed practice round = goal met. Lightweight, one number.
- **Streak**: consecutive days meeting the goal, shown on the hub
  (flame + count). Streak is SEPARATE from goal progress per the
  Duolingo finding (lower the barrier: any 1 completed round extends).
- **Weekend amulet analog**: "Bùa cuối tuần" - streak survives one
  missed weekend day per week (weekend DAU naturally dips; don't
  punish rest).
- Server-side truth: derive streak from attempt history
  (score_bank_attempts already logs per-day activity) - not local
  storage, so it survives devices and is teacher-visible later.
- Surface: hub card + end-of-round streak toast. No push
  notifications in v1 (no FCM infra) - in-app only.

## Acceptance

- Streak increments once/day on first completed round, resets on a
  full missed day except the weekly amulet slot.
- Hub shows current streak + today's goal progress.
- Data verified via attempt-table queries, not client state.
- VN copy review (streak = "chuỗi ngày" or "ngày liên tiếp" - pick in
  design), full SDLC + external review.
