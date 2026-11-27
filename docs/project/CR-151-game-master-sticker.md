# CR-151 - Game-master completionist sticker

Nợ cuối cùng của CR-146 sticker shelf: `game-master` trong spec
GAMEFI-DESIGN-po (sticker sources) - "3 sao cả 3 màn của 10 game".

## Spec

- Điều kiện: `gameBest[<id>:L<l>] >= 3` với mọi level 1/2/3 của >= 10
  game bất kỳ (GAME_DEFS hiện 23 - spec viết khi shelf có 10).
- `starsForScore` 3 sao = 100% perfect run - đúng nghĩa completionist,
  khớp badge level picker.
- Objective key `game:master` (OBJECTIVE_RE + sync allowlist đã cover
  prefix `game:`), grant 1 lần, idempotent.

## gameBest audit (gate của spec)

- `recordGameResult` ghi cả `gameId` lẫn `gameId:L<level>` cho mọi run
  (level mặc định 1 cho legacy caller) - audit sạch.
- gameBest merge max qua sync.ts - không mất khi đổi máy.

## Thay đổi

- `store.ts`: sticker entry `game-master` (category luyen, art
  `sticker-game-master.webp` chờ artgen manifest-p18) +
  `checkGameMaster()` đếm mastered games.
- `manifest-p18.mjs`: + `sticker-game-master` (trophy + controller +
  3 sao).

## External review

- **r260** (commit 1227c5d): 1 major - check chỉ chạy ở GameScreen
  standalone; GameSection embedded + merge cross-device bỏ lỡ.
  Fix: `checkGameMaster()` chuyển vào TRONG `recordGameResult`
  (single funnel cho mọi gameBest write) + gọi sau merge trong
  `bindEngagement`. Tests: grant ngay khi 10th game hoàn thành +
  sync-merge 5+5 games -> sticker.
- **r261** (commit 18da126): 1 major - background `runCycle()` cũng
  merge gameBest mà không check (stars earn ở device khác sau bind).
  Fix: gọi `checkGameMaster()` sau writeStateSilently(merged) trong
  runCycle. Test: already-bound device merge 5 remote games -> sticker.

## Bug bắt được trong test

- Objective key đầu tiên là `gamemaster` (không colon) -> OBJECTIVE_RE
  từ chối, grant mất -> không idempotent. Đổi `game:master` - cùng
  class silent-drop của r222/r250.
