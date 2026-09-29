# Project Constitution - student-self-practice-web visual upgrade

Ghi một lần tại intake; mọi phase gate check lại. Vi phạm = block gate.

## Non-negotiables

1. **Đối tượng**: học sinh lớp 2 Việt Nam (~7-8 tuổi), tự luyện từ vựng tiếng Anh.
   Mọi quyết định UI/nội dung phải phù hợp lứa tuổi (an toàn nội dung, chữ lớn,
   hình rõ nghĩa, không quảng cáo/link ra ngoài không kiểm soát).
2. **Không phá DOM-text contract hiện có** mà không cập nhật test: emoji char
   đang là phần của DOM (`getByText('🐱')`, `toHaveTextContent('🐱🐱🐱')`).
   Lớp visual mới phải giữ text layer ẩn hoặc test được cập nhật có chủ đích.
3. **License sạch**: mọi asset mới phải có license cho phép redistribute trong
   app (CC0 / CC-BY / OFL / MIT). Attribution bắt buộc được lưu trong
   `public/attribution.json` + link Credits trong UI. Cấm: asset license
   "personal use only" (ví dụ Animated Fluent Emoji repo).
4. **Same-origin assets, zero runtime CDN**: mọi asset visual (svg, lottie json,
   ảnh) của feature này nằm trong `public/` (cấm `src/assets` cho visual asset
   - giữ inventory check đơn giản, Ruling A-07) và được serve same-origin từ
   bundle deploy. Không component nào fetch hình/animation từ domain thứ 3 lúc
   runtime. (Ruling A-05: thay cho hứa "offline sau load" không kiểm chứng
   được - tiêu chí thực sự là không phụ thuộc CDN bên ngoài.)
5. **Performance**: ảnh động Lottie chỉ cho context 1-hình (prompt, mascot,
   reward). Không animate hàng loạt emoji trong counting-image / option grids
   (nhiễu + nặng). Player phải lazy-load. Giới hạn: tối đa 2 player trên 1 màn
   hình (cho phép FeedbackPanel picture + mascot accent cùng động SAU khi trả
   lời - moment reward, không tranh chú ý trong lúc làm bài); trước khi trả
   lời tối đa 1 (prompt). (Ruling A-09: nới từ 1 -> 2 vì reward moment hợp lý.)
6. **`prefers-reduced-motion`**: mọi animation mới tôn trọng media query này,
   theo convention mascot hiện có (`motion-reduce:animate-none` hoặc pause).
7. **TDD**: test infra sẵn có (vitest + testing-library + Playwright). RED →
   GREEN cho mọi thay đổi hành vi. Không xóa test cũ để pass.
8. **Không em-dash/en-dash** trong UI copy tiếng Việt (CONVENTIONS.md).
9. **Vietnamese-first UI**: copy UI tiếng Việt, từ vựng học là tiếng Anh -
   giữ nguyên quy ước `explanation` tiếng Việt hiện có.

## Phase-gate checks (mỗi non-negotiable có evidence check cụ thể)

| # | Check tại gate Dev/Tester | Pass khi |
|---|---------------------------|----------|
| C2 | `grep -r "question.emoji"` components không còn render text trực tiếp; test suite không xóa mà vẫn xanh | EmojiVisual hoặc text layer ẩn giữ char; `npm test` xanh |
| C3 | Script `scripts/check-attribution.mjs` đối chiếu inventory file trong `public/emoji/svg/`, `public/emoji/lottie/`, `public/images/vocab/` với entries trong `public/attribution.json` (cả 2 chiều: file không có entry, entry trỏ file không tồn tại). Visual asset chỉ được phép ở 3 thư mục trên (cấm `src/assets` - A-07). Chạy được bằng `node scripts/check-attribution.mjs` | Script exit 0; 100% asset file có record |
| C4 | **Runtime-level check là gate chính** (URL data trong attribution.json không tính): e2e ghi mọi request trong full flow (GradeSelect -> Credits -> Batch 4 rounds -> summaries); assert mọi request URL same-origin (AC-8.2, AC-2.6). Static support check: `grep -rE "https?://" src/` - mọi hit phải là (a) comment, (b) string literal trong attribution/copy data, hoặc (c) file đã allowlist rõ; không hit nào là src/href/fetch/import trỏ ra ngoài | E2E pass + static grep sạch/allowlist |
| C5 | `grep animated` các component option/counting render `animated={false}`; Lottie player chỉ import qua lazy boundary | Tối đa 2 player/màn hình (A-09); ≤1 trước khi trả lời; 0 trong option grid/repeated context |
| C6 | Mọi CSS animation mới có `motion-reduce:` pair; Lottie player nhận reduced-motion -> render static | Unit test hoặc code check per site |
| C9 | `index.test.ts` xanh sau khi thêm từ mới (invariants sẵn có) | Không vi phạm |
| SAFE | Mỗi ảnh vào image bank phải qua curation checklist (mục review P2 trong plan): 1 đối tượng rõ nghĩa, đúng từ, an toàn trẻ em, license hợp lệ - record quyết định trong attribution.json (`reviewStatus: approved|rejected`) | Không ảnh nào vào `public/images/vocab/` mà chưa review |

## Intake rulings (đã được human duyệt 2026-09-29)

- Phạm vi run: P0 (emoji nhất quán) + P1 (emoji động Lottie) + P2 (curated image
  bank) + bổ sung từ vựng thiếu theo SGK lớp 2. Phonics (P3) và GIPHY reward -
  ngoài phạm vi, để CR riêng.
- Emoji static set: do human delegate ("cái nào free thì dùng") → Ruling:
  **Twemoji (CC-BY 4.0)** làm static set; **Noto Animated Emoji (CC-BY 4.0)**
  làm lớp động. Cả hai free + redistribute được; một mục credit bao trọn.
- P2 image source: **Openverse API** (không cần key, lọc cc0/by) là chính;
  Pixabay API là nguồn bổ sung khi user cung cấp key sau.
- Deploy: **Vercel** cuối pipeline (vẫn confirm go-live tại gate theo strict mode).
- Review mode: `ai` (mặc định config). Fidelity level: `reference-only`
  (không có Figma source; design spec theo domain UX benchmark làm chuẩn).

## Domain Pack (edtech / children vocabulary)

- **Standards**: Cambridge Pre-A1 Starters wordlist (495 từ / 19 chủ đề);
  SGK Tiếng Anh 2 GDPT-2018 (16 unit). Tham chiếu đầy đủ:
  `docs/research-visual-content.md`.
- **Fault catalog (đã biết trong repo)**:
  - Nội dung phải an toàn tuyệt đối cho trẻ (image curation: không ảnh mơ hồ
    nghĩa, không nội dung nhạy cảm - luôn lọc license + safesearch).
  - Đếm được/không đếm được (`countable`) gate counting generator - từ mới
    phải gán đúng, sai sẽ sinh câu hỏi vô lý.
  - Emoji phải "1 hình 1 nghĩa" - emoji mơ hồ (🦫 vs beaver) đã từng là bug
    class; asset thay thế phải giữ nguyên tắc này.
  - TTS/SpeechRecognition khác nhau theo trình duyệt - không được phụ thuộc
    vào asset mạng mới làm hỏng round listening.
- **Domain UX anchor**: Khan Academy Kids / Duolingo ABC pattern - 1 hành động
  rõ ràng mỗi màn, reward animation có chủ đích, hình lớn ít chữ.
- **Glossary (ubiquitous language)**: `VocabWord` = 1 từ trong ngân hàng từ;
  `Batch` = phiên luyện 4 round; `Round` = 1 dạng bài; `EmojiVisual` = component
  render hình cho 1 emoji char; `image bank` = tập ảnh curated trong `public/`.
