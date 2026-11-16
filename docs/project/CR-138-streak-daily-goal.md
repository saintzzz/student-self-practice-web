# CR-138: Streak + daily goal retention loop

## Status: IN-SDLC (implementation started cycle W47)

Research: `docs/research/edu-apps/2026-W46.md` G4 - Duolingo: learners
at a 7-day streak are 2.4x more likely to return next day; separating
streak from daily goal lifted D14 retention; weekend amulet +4%.
W47 report (`2026-W47.md`) reaffirmed + added two spec refinements:

- R1: streak extends on ANY 1 completed round - never gate it behind
  the daily-goal count (Duolingo measured +3.3% D14 retention from
  decoupling exactly this).
- R2: milestone moment at day 3 and day 7 (loss-aversion window) -
  reuse existing StreakBurst FX, no new assets.
- R3 (schema correction): `score_bank_attempts` is a stateless scoring
  oracle - it logs nothing. Derivation source is `practice.results`
  (completed rounds) + `qb_attempt_events` (per-question goal count),
  both already persisted and RLS self-readable.

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
