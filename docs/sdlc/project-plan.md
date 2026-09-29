# Project Plan + WBS - Visual Content Upgrade (P0+P1+P2 + vocab)

**Project:** Nâng cấp "hình ảnh" của app từ native emoji -> asset chất lượng
(SVG nhất quán + emoji động Lottie + ảnh curated), đồng thời bổ sung từ vựng
bám SGK Tiếng Anh 2. Ngày: 2026-09-29.

## Scope (đã duyệt tại intake)

| In scope | Out of scope (CR riêng) |
|----------|-------------------------|
| Component `EmojiVisual` chung + swap 6 render sites | Phonics round mới (P3) |
| Twemoji SVG static layer (bundle local) | GIPHY reward GIFs |
| Noto Animated Emoji (Lottie) cho single-image contexts | Backend/user accounts |
| Curated image bank qua Openverse + `imageUrl` + attribution.json | Mobile app / offline PWA |
| ~40-60 từ vựng mới theo gap SGK lớp 2 | |
| Màn/link Credits cho attribution CC-BY | |
| Deploy Vercel | |

## Success criteria

- Emoji render nhất quán pixel trên mọi trình duyệt (không phụ thuộc OS font).
- Emoji động hiển thị ở prompt đơn + mascot/reward contexts; option grids tĩnh.
- Mỗi asset có license record trong `attribution.json`; UI có link Credits.
- Từ mới pass `index.test.ts` invariants (emoji non-empty, unique, countable đúng).
- `npm test`, `npm run build`, e2e hiện có xanh; e2e mới cho visual layer.
- Deploy Vercel thành công, health-check 200.

## WBS

1. P0 - EmojiVisual component + Twemoji SVG pipeline (render contract giữ nguyên)
2. P1 - dotLottie player + Noto animated bundle cho emoji đang dùng + swap single-image sites
3. P1b - Mascot/celebration animation nâng cấp (animated 🐷 Lottie hoặc accent)
4. P2a - `VocabWord.imageUrl?` field + module `wordId -> imageUrl` build 1 lần từ ALL_WORDS (A-06 AMENDED per PRD r2: emoji assets resolve by emoji key; photos cần word identity qua additive payload fields `wordId`/`optionWordIds` - distractor đến từ toàn bank nên (topicId,emoji) không đủ)
5. P2b - Fetch script `scripts/fetch-vocab-images.mjs`: Openverse query per word -> staging `image-staging/` (git-ignored, NGOÀI public/ - ảnh chưa review không được ship) -> `candidates.json` reviewStatus pending
6. P2c - **Curation gate (bắt buộc)**: review từng ảnh theo checklist (1 đối tượng rõ nghĩa / đúng từ / an toàn trẻ em / license ok), ghi `reviewStatus` per entry; publish script chỉ copy `approved` sang `public/images/vocab/` + `public/attribution.json`
7. P2d - Render integration: EmojiVisual nhận `imageUrl?` prop; photos ở single-image contexts (image-choice prompt) + listening-image-choice options all-or-nothing (D-1). Pair-matching tiles và FeedbackPanel picture KHÔNG dùng photo (D-9: tile ~24px quá nhỏ; D-11: feedback inline 16-20px) - vẫn được consistency fix qua Twemoji SVG
8. Vocab - thêm 43 từ theo PRD 7.1 (party, seaside, kitchen, camping, actions, feelings); cơ hội fix `g2-places` thin-topic (thêm từ hợp lệ để đủ >=4 cho image-choice)
8b. Round 1 pool mở rộng: extra-letter + image-choice ở q8-10 (D-10, theo PRD US-9) - đưa single-image prompt vào live batch
8c. FeedbackPanel hiện EmojiVisual của từ đúng (D-1 option C, PRD US-10)
8d. Topic-aware sentence templates (D-6 fix in-run, PRD US-11) - 71 từ cũ đổi câu, snapshot test giữ phần còn lại byte-identical
8e. Fix stale mic-permission test (WBS 10b) - mock SpeechRecognition onerror 'not-allowed'
9. Credits screen/section
10. Test - unit mới cho EmojiVisual/registry/fallback + cập nhật e2e + Playwright verify thật
11. Deploy Vercel + registry + health check
12. Final report + convergence pass

## Risks

- R1: Openverse không có ảnh phù hợp cho mọi từ -> fallback chain imageUrl ->
  animated -> twemoji đảm bảo không từ nào "mất hình". Script xuất coverage
  report (word -> found/reviewed/rejected) làm deliverable của P2b/P2c.
- R2: ~300 file lottie/json + svg làm nặng bundle -> assets trong `public/`
  (không bundle), lazy-load, chỉ fetch khi render.
- R3: jsdom không render canvas/lottie thật -> unit test mock player; e2e
  Playwright verify thật.
- R4: Thời gian tải ~340 assets từ Openverse + Google Fonts CDN - script có
  retry + resume + report fail.
- R5: Ảnh Openverse không pass curation (mơ hồ nghĩa/không an toàn) -> từ đó
  giữ emoji visual; không force ảnh kém chất lượng vào bank.

## Pre-existing defect - in scope vì là test-only fix

- `PronunciationRecordingQuestion.test.tsx` mic-permission-denied test FAIL
  trên baseline sạch. Root cause xác nhận: test mock `getUserMedia` reject,
  nhưng commit 66e2a2c đã bỏ pre-flight getUserMedia - permission denial giờ
  đi qua SpeechRecognition `onerror` code 'not-allowed' (speechRecognition.ts
  PERMISSION_ERROR_CODES). Test là stale drift, sản phẩm không lỗi.
- **WBS 10b (test-only fix):** sửa test mock `window.SpeechRecognition` fire
  `onerror({error:'not-allowed'})` khi `start()` - khôi phục gate "npm test
  xanh hoàn toàn". Không đụng production code.

## Phase mapping (framework)

PM (doc này) -> BA (PRD + AC) -> Designer (spec visual states) -> Tech Lead
(ADR: asset pipeline, fallback chain, dep choice) -> Dev (SWE-2 inline, TDD)
-> Tester (unit+e2e+perf) -> Deployer (Vercel) -> PM finalization.
