# CR-115 — Game Zone: wire generated art + gameplay juice

> Trạng thái: APPROVED (PO-tự-quyết, 01/11/2026)
> Driver: yêu cầu "game play xịn hơn, giống trò chơi hơn; nội dung tuyệt vời hơn" sau khi so Questora.

## 1. Vấn đề

15 game ở Khu trò chơi hiện là "trả lời câu hỏi với skin emoji":

- `EmojiChoiceField`/`WordChoiceField` render emoji/svg — trong khi **1.190+ ảnh minh họa bespoke đã ship** (`public/images/concepts`, `counting`) mà vocab bank chưa được wire `imageUrl` (0 entry).
- Pick feedback phẳng: không burst khi đúng, không shake khi sai, không khoảnh khắc "skill".
- Whack-a-mole là 4 emoji tĩnh — không có timing mechanic như tên gọi của nó.

Questora dạy bài học: câu đúng = "vé", gameplay là skill/luck có anticipation. Mình không clone 3D, nhưng nâng ngay 2 trục khả thi: **nghệ thuật thật + juice + 1 mechanic có timing**.

## 2. Phạm vi

### A. Wire ảnh generate vào vocab (đòn bẩy nội dung lớn nhất)

- `scripts/artgen/build-vocab-images.mjs` → `src/data/vocabImages.ts`: map `wordId -> /images/concepts/concept-<id>-<hash>.webp` (dup slug chọn tên file đầu theo sort, deterministic).
- `vocabulary/index.ts`: enrich `imageUrl` khi trả `ALL_WORDS`/`getWordsByTopic`/`getWordsByGrade` (không overwrite `imageUrl` đã set thủ công).
- `EmojiChoiceField`: prop mới `optionWordIds` → resolve `getWordVisual(id).imageUrl` per option. 5 caller listening rounds truyền `q.optionWordIds` (BalloonPop, FeedThePig, FishingCatch, WhackMole; MazeChase kiểm tra sau).
- Prompt path đã tự nâng (`RacingCars` đã resolve `visual.imageUrl`).

### B. Juice (motion-reduce safe)

- Correct pick: scale-pop + ring burst.
- Wrong pick: horizontal shake.
- Tất cả là CSS transform/opacity, `motion-reduce` vẫn giữ behavior hiện tại.

### C. WhackMole timing mechanic

- Mole pop lên/ngụp theo nhịp seeded (~1.2-1.6s window), chỉ mole đang "up" mới tap được.
- Đập mole sai mất mạng như cũ; để mole đúng ngụp = miss opportunity (không mất mạng, mole sẽ pop lại - giữ nhịp cho trẻ nhỏ).
- Score giữ nguyên contract (đúng lần 1 = 2 điểm, lần 2 = 1).

## 3. Không làm (scope guard)

- Không viết game 3D/canvas mới; không đổi scoring/star contract; không đụng `counting-image` (phase sau - generated counting webps map `slug:count`, cần wiring riêng).
- Không đổi `GAME_DEFS` (không thêm game mới).

## 4. Acceptance

- `image-choice`/flashcard/tracing prompt hiển thị ảnh generated cho word có concept art (fallback emoji y hệt cũ khi thiếu ảnh).
- BalloonPop/FishingCatch/FeedThePig/WhackMole options render ảnh generated khi `optionWordIds` resolve được; game không-khớp (thiếu id) render emoji như trước.
- WhackMole: mole bob lên/ngụp, tap khi down không ăn điểm; tests cập nhật.
- `vitest` xanh; typecheck sạch; build xanh.
- External review round mới cho diff (mechanism theo AGENTS.md).

## 5b. Governance (phát sinh khi implement)

ADR-5/AC-4.9 bắt `word.imageUrl` phải là `/images/vocab/{id}.webp` kèm record approved trong `public/attribution.json`. Vì vậy thay vì trỏ thẳng `concepts/`, pipeline copy file → `public/images/vocab/{wordId}.webp` (1.134 files) + ghi 1.134 attribution records (`provider: openai-chatgpt-image`, `reviewedBy: devin-cr115`) và manifest trỏ path `vocab/`. File `concepts/` giữ nguyên vì bank questions đang reference trực tiếp. `scripts/check-attribution.mjs` cũng được sửa để đọc ALL_WORDS thật (esbuild bundle) thay vì grep `id:` literal - trước đây nó miss toàn bộ word dạng tuple trong g*/xp.

## 5. Impact

- Tất cả render path dùng `EmojiVisual` (games, flashcards, letter-tracing, image-choice prompt) tự hưởng ảnh thật - nội dung nhìn "xịn" toàn app, không chỉ game zone.
- Giữ nguyên perf contract: ảnh là static webp lazy/eager theo prop hiện có; không tăng bundle JS (map ~60KB trong vocabulary chunk đã lazy).
