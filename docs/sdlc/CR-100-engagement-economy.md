# CR-100 - Engagement economy wave 2 (A1' streak freeze + A2' player XP ladder + B5 hearts)

## Driver

PO directive: continue the gamification backlog. Scope chosen by code-reality
check - most of A1 (streak, daily quest, server sync via `engagement_state`
blob, CR-45) already ships; XP exists only as pet XP. This CR fills the real
gaps without inventing parallel systems.

## Scope

| Item | What ships |
|---|---|
| **A1' streak freeze** | `touchStreak`: 1 missed day per ISO week does not break the streak (Duolingo-proven rage-quit guard). State field `streak.freezeUsedWeek`; no UI beyond existing streak chip this round |
| **A2' player XP + level ladder** | New `xp` field on EngagementState (optional, backward-compat). `recordCorrectAnswers` accrues `PLAYER_XP_PER_CORRECT` per correct - effort-based, uncapped, same honesty contract as pet XP. Level ladder Newbie -> Star -> Hero -> Legend (`playerLevel()` + `xpProgress()` helpers). Visible: `LevelRing` component (progress ring + level name) on the home/map header next to the streak chip |
| **B5 Game Zone hearts** | Shared `src/games/lives.tsx`: `useGameLives(3)` hook + `HeartMeter` component. Adopted in games with an unambiguous wrong-answer event (memory-match mismatches, quiz-show/whack-a-mole style misses). 0 hearts -> the game ends its run early, still reports GameEnd with accrued points, end screen keeps the gentle retry copy. Hearts are per-run ephemeral - no persistence |

## Explicitly NOT in scope

- No new DB tables: `xp`/freeze fields live in the existing engagement blob,
  which already syncs for signed-in students (CR-45). Guests stay local.
- No XP-for-luck mechanics (no XP from streaks/login - effort only).
- Hearts are per-run, NOT per-day lives. No punishment for absence (backlog F).
- Game adoption is incremental: games without a clean wrong-event keep their
  current loop; each adoption is one line + one meter render.

## Design constraints

- Vietnamese copy: hyphen `-` only.
- `prefers-reduced-motion` respected on new animation (ring fill, heart loss).
- Reuse existing tokens (amber = reward/progress), sfx.ts, mascot moods.
- Zero new dependencies.

## Acceptance

- `playerLevel`/`xpProgress`/freeze logic unit-tested.
- HeartMeter renders 3->0, losing all hearts ends the run with accrued score.
- lint-equiv (tsc) + build + npm test green; Playwright on a real game run.
- External review round after implementation.
