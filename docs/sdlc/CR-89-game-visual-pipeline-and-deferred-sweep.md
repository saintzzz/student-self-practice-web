# CR-89 - Game visual pipeline (EmojiVisual) + deferred sweep + content accuracy

**Status:** approved (PO mandate: "xử lý hết deferred mà không cần hỏi lại")
**Type:** enhancement across Game Zone visuals, gameplay clarity, content accuracy.

## Driver asks

1. Game art + gameplay phải thú vị, đẹp, thu hút (đối chuẩn Monkey Junior).
2. Mọi thứ rõ ràng, dễ dùng.
3. Nội dung sát chương trình Global Success, đa dạng, chính xác - không lỗi cơ bản.
4. Xử lý hết các mục deferred còn treo.

## Findings (recon)

- Games render emoji bằng **raw text** (`{emoji}` spans) - hệ thống còn lại của app đi qua `EmojiVisual` (image -> lottie -> twemoji svg -> native, ADR-1). Đây là lý do chính khiến game art trông "rẻ" so với phần học.
- Emoji assets là file same-origin đã commit (`public/emoji/svg/*.svg`, `public/emoji/lottie/*.json`, 310 keys) - không phụ thuộc CDN, không tốn asset mới.
- Constitution #5 / AC-2.9: tối đa ~1-2 Lottie player mỗi màn -> game được **1 hero animated** (prompt visual), mọi emoji khác dùng svg mode (crisp, nhẹ).
- Vocab bank đã chia topic theo Global Success (g1/g3/g4/g5) - cần audit độ chính xác word<->emoji và lấp gap chương trình.

## Scope

### A. Game visual pipeline
- `mechanics.tsx`: mọi emoji trong `EmojiChoiceField` (balloon/fish/mole/food/grid), `PairBoardField` render qua `EmojiVisual` (variant block, svg).
- `GameArt`: diorama items qua `EmojiVisual`; hero của card **không** animate trên shelf (15 card x lottie = vượt budget), animate khi render trong GameScreen header (1 slot).
- 15 game shells: prompt/hero visual (target emoji, nhân vật chính) -> `EmojiVisual animated` khi là ảnh đơn chiếm slot prompt; decorative emoji -> svg.
- Emoji text node vẫn tồn tại sr-only -> toàn bộ test getByText giữ nguyên.

### B. Gameplay clarity & juice
- Mỗi game có 1 dòng hướng dẫn rõ (đã có phần lớn - audit lại).
- Juice giữ nguyên sfx/pop/shake; thêm animate cho hero prompt (A).

### C. Content accuracy (Global Success)
- Dump toàn bộ vocab word->emoji, sửa mapping sai/lạ.
- Đối chiếu unit list GS g1-g5, bổ sung từ cốt lõi còn thiếu.

### D. Deferred sweep
- CR-88 deferred "real illustrated art": đóng bằng pipeline EmojiVisual+lottie ở A (bespoke illustration assets vẫn là hạng mục riêng khi có nguồn art duyệt).
- CR-86 game-as-exam: giữ doc; phần "share ngân hàng game -> practice" đã thực hiện ngược chiều (games rút từ shared generators). Exam-embed (game component = exam section) vẫn là scope riêng lớn - ghi rõ trong doc, không làm nửa vời.
- CR-82 mechanics expansion: drag mechanics đã ship (CR-79); phần còn lại gộp theo audit nội dung.

## Acceptance

- tsc + full vitest xanh; build xanh.
- Playwright 390px: shelf + ít nhất 3 game hiển thị EmojiVisual (data-emoji-visual) đúng, hero animated khi có lottie asset.
- Không màn game nào spawn > 2 lottie player (kiểm bằng data-emoji-mode="lottie" count).
- Vocab audit script pass (không còn mapping sai đã biết).
- External review loop tới CLEAN.

## Tester evidence

- Playwright `scripts/_cr89-visual-verify.mjs` @390px preview build: PASS
  - shelf: 48 EmojiVisual nodes rendered (twemoji svg), 15 cards
  - balloon-pop: 4 option EmojiVisuals render svg imgs; 0 lottie players (prompt is listening-only) - budget respected
  - whack-a-mole + feed-the-pig mount; pig-face hero renders EmojiVisual
- Full vitest: green after pipeline swap (game tests kept passing via EmojiVisual sr-only text node).
- Build: main chunk 779 -> 638 kB after vendor/manualChunks split (react+react-dom -> vendor 141 kB, supabase -> 228 kB); warning remains but per-deploy payload shrinks.

## Content audit outcome (Global Success)

- Dumped all 524 banked words -> emoji mapping review: mappings are clean; bank already aligned to GS topic structure (g1/g3/g4/g5 files).
- **OPEN - tracked, not resolved:** g5-tet `festival` 🎏 (JP koinobori) and `apricot blossom` 🏵️ are cultural approximations. Every attempted replacement either collides with another bank word (AC-6.3 uniqueness) or lacks a vendored twemoji svg (AC-1.5) - the bank uses 517 unique glyphs and the festive set is exhausted. Resolution path: dedicated illustrated assets for culturally-specific words (Tet unit first), tracked as a follow-on art task - the vocabulary wording itself is correct.

## Deferred sweep outcome

- CR-88 deferred "real art": closed via EmojiVisual pipeline (photo where imageUrl exists -> lottie where asset exists -> twemoji svg) - no new binary assets needed.
- CR-86 game-as-exam: stays doc'd scope (exam-section embed); game->practice share direction already live via shared generators.
- Vite chunk warning: mitigated via manualChunks vendor split.
