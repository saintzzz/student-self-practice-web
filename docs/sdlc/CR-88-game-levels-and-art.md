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

- [ ] Level picker with per-level stars on all 15 games
- [ ] L2/L3 measurably harder (rounds/speed/lives)
- [ ] Live clock + time bonus on end screen
- [ ] Composed-scene card art everywhere the bare emoji showed
- [ ] tsc + vitest + build + Playwright 390px + external review clean
