# CR-87 — Hub menu + Game Zone shelf redesign

## Request (user, verbatim)

"đánh vầm hay đánh vần? nhìn ảnh này, menu thực sự tệ :("

## Scope

1. **Copy fix**: `Rắn đánh vầm` -> `Rắn đánh vần` (orthography) in `src/games/defs.ts`.
2. **Hub destination tiles**: `ModeHub` tiles move from identical pale-paper
   rows (`TRAIL_TILE*` sky-50 washes) to per-destination gradient cards
   (`hubTileClass(tone, minH)`) - sky = learn, orange = arena (keeps the VS
   emblem), emerald = game zone, amber = rewards, rose = math/review accents.
   Frosted icon chip, white label/sub, emoji watermark per tile. 96/76px
   density contract, aria-expanded/aria-controls and accordion unchanged.
3. **Game Zone shelf redesign** (`GameZoneShelf`):
   - Daily deterministic featured hero ("Trò chơi hôm nay") via
     `hashString(local date) % visibleDefs` - curates the 15-game catalog.
   - Per-game `tone` on `GameDef` (5 hues x 3 games), `fresh` flag renders
     a "Mới" badge on the CR-85 five.
   - Grade filter enforced: defs carrying `grades` are hidden when the
     viewer's grade is not listed (previously declared but never applied -
     quiz-show leaked onto G1-2 shelves).
4. Token additions: `hubTileClass`, `HUB_TILE_EXPANDED`, `HUB_CHIP`,
   `gameCardClass`, `gameHeroClass`, `HubTone`. `HUB_ICON_TINTS` deprecated;
   `TRAIL_TILE*` removed (ModeHub was the only caller).

## Impact

- `GameZoneShelf` gains optional `grade` prop; both hub call sites pass
  `grade.id`. Tests unchanged (no grade = no filter).
- Palette guard: sky/orange/emerald/amber/rose only - violet stays land-
  reserved.
- No bundle growth: shelf/def metadata stays component-free.

## Acceptance

- [x] typo corrected, no `vầm` left
- [x] hub tiles carry per-destination hue + watermark on 390px
- [x] shelf shows 1 hero + 14 grid cards (g3-5), all `game-card-*` ids
- [x] quiz-show absent on grade-1 shelf
- [x] tsc + vitest (200 files / 1,664) + build green
- [x] Playwright 390px shots verify collapsed hub + expanded shelf
