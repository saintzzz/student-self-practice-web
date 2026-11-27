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
- `GameScreen.handleEnd`: gọi `checkGameMaster()` sau
  `recordGameResult` (run vừa xong đã tính sao).
- `manifest-p18.mjs`: + `sticker-game-master` (trophy + controller +
  3 sao).

## Bug bắt được trong test

- Objective key đầu tiên là `gamemaster` (không colon) -> OBJECTIVE_RE
  từ chối, grant mất -> không idempotent. Đổi `game:master` - cùng
  class silent-drop của r222/r250.
