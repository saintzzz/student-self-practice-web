# CR-88 — Game Zone: levels, timing, richer art (Monkey Junior direction)

## Request (user, verbatim)

"logo trò chơi cần đẹp hơn, game play cần có level mới hứng thú, ngày càng khó hơn, có tính thời gian, tính điểm.
hình ảnh trò chơi cũng cần đầu tư nhiều cho đa dạng, chuẩn với thực tế.
monkey junior là ứng dụng đầu tư hình ảnh và game play rất tốt."

## Scope

1. **Levels**: every game offers Màn 1/2/3 before a run (GameScreen level
   picker, per-level best stars). Difficulty ramps via `levelSpec()`:
   L1 = current tuning, L2 = +2 rounds / faster / fewer retries,
   L3 = +4 rounds / fastest / 2 lives.
2. **Timing + scoring**: GameScreen shows a live run clock and awards a
   separate "+điểm nhanh" time bonus (displayed, not folded into star
   accuracy - clean-play star doctrine preserved).
3. **Art**: `GameDef.art` = composed emoji scene per game (replaces the
   single bare emoji on cards/hero/header). No external assets; the emoji
   vocabulary stays, composed into mini-scenes (balloons+clouds, sea+fish,
   racetrack, maze+ghost...).
4. **Stars per level**: `gameBest["<id>:L<n>"]` tracked; shelf star row =
   best across levels.

## Impact

- `GameProps` gains optional `level` (default 1 = current tuning - all 15
  existing game tests keep their round counts).
- `recordGameResult` gains optional `level` - best-star keyed
  `game:L<level>`; overall best unchanged.
- `GameZoneShelf` star row reads max(levels 1-3).

## Acceptance

- [x] Level picker with per-level stars on all 15 games
- [x] L2/L3 measurably harder (rounds/speed/lives)
- [x] Live clock + time bonus on end screen
- [x] Composed-scene card art everywhere the bare emoji showed
- [x] tsc + vitest + build + Playwright 390px + external review clean

## Implementation (shipped)

- `src/games/levels.ts` - `GameLevel` 1-3, `specFor(level, baseRounds)` =>
  `{ rounds, speedScale, lives, missLimit, parSec }`; `timeBonusFor()` pays
  up to 20% of maxPoints for beating par; `LEVEL_META` = child-facing
  labels ("Làm quen" / "Nhanh hơn" / "Thử thách").
- All 15 games consume the spec: rounds scaling everywhere plus
  per-mechanic knobs - QuizShow shrinks the per-question clock
  (20s/16s/13s), TicTacToe CPU goes random -> blocks -> strategic,
  MazeChase adds +2 walls/level and a double-step ghost at L3,
  WordWorm grows distractors 3->5, CastleGuard speeds the creep and
  cuts hearts to 2, PictureReveal grows the grid 9->12->15 tiles.
- `GameScreen` owns the level picker (`game-level-picker`,
  `game-level-N`), the live header clock (`game-timer`), the seeded
  run (`<seed>-L<level>`), and the end screen (score + elapsed +
  "+điểm nhanh" bonus).
- `recordGameResult(..., level)` - objective id `game:<id>:L<n>:<seed>`
  (per-level idempotence); `gameLevelStars()` backs the picker's
  per-rung stars; `gameBestStars()` stays the shelf aggregate.
- `GameArt` composes each `GameDef.art` emoji list into a mini diorama
  (hero emoji largest, scenery staggered) - used on shelf cards, the
  daily hero, and the GameScreen header. No new binary assets.

## Verification

- tsc -b clean; vitest 202 files / 1,678 tests (new: levels.test.ts,
  GameScreen.test.tsx, store level-scoped describes)
- vite build clean (GameScreen lazy chunk ~50.6 kB)
- Playwright 390px (`scripts/_cr88-levels-verify.mjs`): shelf 15 cards,
  level picker mounts, Màn 2 run shows 7 round-dots + ticking clock,
  Màn 3 maze shows 2 hearts + denser walls

## External review loop

- r39 (codex-cli): 3 findings, all fixed in bbbb566 - seed rotation on
  "Chọn màn" (replay at same level silently re-hit the granted
  objective), omitted-level callers now update the L1 picker stars,
  speed bonus gated on >=1 star.
- r40 (codex-cli): CLEAN - loop closed.

## Deferred

- Real illustrated/Lottie art per game (currently composed emoji
  dioramas); speech-quality art assets belong to the planned art pass
  once asset sources are approved.
