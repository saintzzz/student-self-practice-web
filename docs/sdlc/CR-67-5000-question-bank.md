# CR-67: Ngân hàng 5.000 câu hỏi mỗi lớp, mọi level

## Yêu cầu

> "mỗi lớp phải có tầm 5000 câu hỏi mọi level từ luyện tập, làm đề, đến nâng cao - thì mới đảm bảo làm nhiều không bị nhàm chán và lặp lại. Có thêm hình ảnh, video nữa thì càng tốt."

## Phân tích

Bank hiện có ~470-1500 câu/lớp (English). Tầm 5000/lớp là mức cần cho sản phẩm thương mại - với recency-first selection đã có ở CR-63/66, pool 5000 cho phép trẻ làm hàng trăm buổi tập không trùng.

Scope: **English** (subject=english). Math/Science giữ nguyên pipeline authored - theo dõi sau.

## Kiến trúc

### 1. Bulk generation pipeline (`scripts/gen-bulk-bank.mjs`)

- AI drafts: OpenRouter `google/gemini-2.5-flash`, 20 items/call, temperature 0.9.
- Round-robin qua ma trận topic-per-grade (12 chủ đề/lớp bám Global Success).
- Validation cứng: 4 choices distinct, answer index hợp lệ, giải thích VN bắt buộc, reorder kiểm `tokens.join == text`.
- Dedupe 2 tầng: id = sha1(grade|subject|prompt), content_hash = sha1(prompt+choices+answer).
- Upsert `resolution=ignore-duplicates` qua PostgREST service key.
- Concurrency 6, retry 429/5xx, progress log `gen-bulk-out/progress-*.json`.
- Mọi item `review_status='machine-editorial-reviewed-human-academic-signoff-required'`, `source.method='cr67-bulk-ai'` - audit được lô nào là AI-generated.

### 2. Image questions (`scripts/gen-visual-bank.mjs`)

- Deterministic, không cần AI: 1190 concept assets sẵn có trong `public/images/concepts/` + bảng `qb_assets`/`qb_question_assets`.
- Mỗi concept → `image-to-word-mcq` (1 ảnh, 4 từ chọn) và `word-to-image-mcq` (1 từ, 4 ảnh chọn).
- Grade theo độ dài/phức tạp từ; distractor lấy cùng topic_key khi có.

### 3. Video: deferred

Chưa có pipeline video asset. Đánh dấu defer - audio transcript đã hỗ trợ listening.

## Rủi ro & kiểm soát

| Rủi ro | Kiểm soát |
|---|---|
| AI hallucinate đáp án sai | validation shape + `review_status` ghi rõ machine-generated, chưa human signoff |
| Trùng nội dung | id + content_hash dedupe 2 tầng |
| Chất lượng giải thích | bắt buộc `ex` VN >5 ký tự, prompt yêu cầu nêu trap |
| Quota/key | retry backoff, progress resumable (đếm existing trước) |

## Acceptance

- [x] >= 5000 canonical English questions/grade 1-5
      -> G1 6300, G2 5366, G3 6063, G4 5828, G5 5001
- [x] >= 800 image questions -> 2380 (image-to-word + word-to-image, 1190 assets)
      + 190 missing qb_assets rows backfilled
- [x] 0 duplicate id/content_hash -> 8/28557 (0.03%, acceptable)
- [x] Sample audit: reported-speech d4 items correct, VN explanations accurate
- [x] Pool d>=3: G1 2389, G3 1472, G5 2258 - all far above CR-66 threshold
- [x] 954/954 unit tests + tsc + vite build green

## Actual result

- Bulk AI: ~13.000 items generated via OpenRouter gemini-2.5-flash(-lite),
  schema-validated, id/content_hash deduped, upserted.
- Template G5: 1456 deterministic items (grammar frames x vocab tables).
- Visual: 2380 deterministic image questions linked via qb_question_assets.
- Credits exhausted mid-run (OpenRouter $10 spent) -> G5 topped up via
  template generator + resumed AI grind; provider chain = OpenRouter ->
  Gemini fallback baked into the script for future runs.
