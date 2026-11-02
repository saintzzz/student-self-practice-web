# CR-118: Launchpad day-register sync

**Status:** implemented, in external-review loop
**Type:** UI synchronization (no gameplay/flow requirement change)
**Trigger:** user feedback - "Xử lý đồng bộ các màn hình với nhau chứ sao mỗi màn 1 style được?" + "Học hỏi thêm đối thủ về màn hình launchpad"

## Problem

CR-116/117 moved the kid world (map, login, loading) to the sunny day
register, but the post-grade-selection launchpad still rendered a navy
`CARD` around a day vignette, a dark navy hub tray, and seven navy inner
feature cards. Result: three registers on one screen - day art, navy
surfaces, light candy tiles.

## Scope

In (visual register only):
- `StartBatchScreen` - `CARD_DAY`, `H1_DAY`, `PROMPT_DAY`, `NAV_PILL_DAY`,
  light `Sân khấu lớp` tile, card pulled `-mt-[12vh]` into the compact
  band seam; mobile vignette `h-28 sm:h-40` so the gold CTA reaches the
  667px fold.
- `ModeHub` / `hubTrayClass` - dark recessed tray becomes a light paper
  well (`sky-50` + inner shade); tone top-edge idiom kept.
- Inner cards retuned to day ink on paper: `ArenaCard`,
  `LeaderboardCard`, `ReviewCard`, `CoachCard`, `DailyQuestCard`,
  `PetCard`, `HomeShelf`.
- `App.tsx` - `shell()` gradeId path honors `tone`/`hero` overrides;
  start-batch mounts `{ land: <grade land>, tone: 'day', hero: 'compact' }`.
- New named tokens: `ROW_DAY` (sky-50 row on CARD_DAY), day chip
  pairings (`sky-100/sky-700`, `amber-100/amber-800`, `orange-100/orange-800`).

Out (explicit decision):
- Batch play boards, exams, reports keep navy/dusk `desk` register -
  deliberate focus surface, documented in DESIGN_SYSTEM.md, not an
  inconsistency.
- Gameplay changes - none. CR-119 (skill-gap games) is a separate CR.

## Impact

- Components touched are launchpad-only (verified: no other screen
  imports the seven cards); `hubTrayClass` has one call site.
- `shell()` change is additive - existing gradeId callers unaffected.
- No data/flow/route changes; guest + student + admin paths preserved.

## Acceptance criteria

- Launchpad renders entirely in day register: light card, light tray,
  dark ink text, candy tiles unchanged.
- Gold `Chơi` CTA remains dominant; mobile 375x667 shows its top edge
  at the fold (measured y=624, height 80).
- All text/surface pairs pass rendered contrast (target AA).
- `aria-expanded`/accordion behavior, voice hints, one-open-group logic
  unchanged.
- Guest flow, G1-2 and G3-5 tile sets unchanged.

## Estimate

S - token additions + class retunes + shell override + docs + gates.
