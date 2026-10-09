# CR-62 - Bài ghi âm không dùng được micro trên iPad/điện thoại

Ngày: 09/10/2026 - Báo lỗi: "các bài cần ghi âm khi dùng trên ipad hay
điện thoại đều không dùng được micro".

## 1. Chẩn đoán

Round 3 pronunciation-recording (`usePronunciationRecording` +
`speechRecognition.ts`) nhận diện giọng nói bằng Web Speech API
(`SpeechRecognition`/`webkitSpeechRecognition`) - tức không thu âm thật,
trình duyệt tự xử lý luồng mic nội bộ.

Trên iOS/iPadOS API này tồn tại (iOS 14.5+) nhưng thực tế hầu như không
dùng được:

- Phụ thuộc Siri/Dictation service của Apple - hay trả `network`,
  `service-not-allowed`, `audio-capture`, hoặc `onend` ngay không kết quả.
- Mọi trình duyệt trên iOS đều là WebKit (Chrome iOS cũng vậy) nên đổi
  app không cứu được.
- Silent-retry qua `setTimeout` (CR-17) mất user-gesture - Safari chặn
  `recognizer.start()` gọi trễ, nên retry tự động cũng fail nốt.
- `isSpeechRecognitionSupported()` trả true (constructor tồn tại) nên
  UI không rơi vào nhánh 'unsupported' - em bé bấm ghi âm rồi chỉ thấy
  lỗi.

Android Chrome dùng được SR nhưng hay lỗi `network` (phụ thuộc Google
speech services). Desktop Chrome/Edge ổn nhất.

## 2. Phạm vi

Trong:

- Đường ghi âm thật bằng `MediaRecorder` (iOS Safari 14.3+, Android
  Chrome, desktop đều hỗ trợ) + edge function `practice-transcribe`
  chuyển audio thành transcript bằng AI STT.
- Chọn đường theo thiết bị:
  - iOS/iPadOS (kể cả SR "supported") -> recorder path luôn.
  - SR không supported -> recorder path.
  - SR fail (sau silent-retry hiện có) -> nếu MediaRecorder còn dùng
    được thì rơi về recorder mode, không khóa UI ở màn lỗi.
- UI thêm phase `processing` ("Đang chấm giọng em...") khi upload audio.
- Edge function đọc AI config qua RPC `practice.get_ai_config()`
  (SECURITY DEFINER, grant service_role) từ vault secrets
  `ai_provider`/`ai_api_key`/`ai_model` - cùng pattern vault-RPC đã
  chuẩn hóa cho email config (SCN `get_email_config`).
- Provider linh hoạt theo rule toàn cục: `ai_provider` = gemini |
  openai; mặc định gemini (`gemini-2.5-flash` transcribe audio trực
  tiếp qua inline_data). OpenAI dùng `audio/transcriptions` (whisper).
  Không key -> trả lỗi, client rơi về 'error' có nút Bỏ qua.
- Giới hạn: audio <= 4MB, tối đa ~10s/câu (auto-stop), prompt nêu
  từ mục tiêu để STT bám đúng (trẻ đọc từ đơn SR hay nhận sai).
- Migration 0026: RPC + ghi chú grant service_role only.
- `verify_jwt=false` khi deploy: guest chơi không tài khoản cũng ghi âm
  được. Rủi ro abuse thấp (chỉ transcribe audio nhỏ), ghi nhận trong
  doc - nếu cần siết sau thêm rate-limit.

Ngoài:

- Chấm điểm phát âm từ audio trực tiếp (phoneme-level) - vẫn chấm qua
  transcript như hiện tại, disclosure giữ nguyên.
- Lưu audio/thống kê - không lưu gì, transcript trả về xong là hết.
- Rate-limit per-user cho edge function - phase sau nếu thấy abuse.

## 3. Verify - DONE

- Unit: 5 test mới (`usePronunciationRecording.recorder.test.ts`) - iOS
  route recorder, SR denied -> recorder fallback, happy path, lỗi
  transcribe, transcript rỗng -> no-speech. Tổng 18/18 xanh (cả suite
  cũ SR path không đổi).
- tsc + vite build xanh.
- E2E edge fn: `say "apple"` -> m4a -> POST `/functions/v1/practice-
  transcribe` -> `{"transcript":"apple"}` (Gemini `gemini-flash-latest`,
  vault `gemini_api_key` + `gemini_model`; key lấy từ SCN .env.local,
  đưa vào vault qua `store_vault_secret` RPC - không lộ giá trị).
- Phát hiện khi test: `gemini-2.5-flash` free-tier đã cạn quota trên
  key dùng chung -> vault `gemini_model` trỏ `gemini-flash-latest`
  (alias model mới nhất, quota riêng) + chuỗi fallback per-provider
  trong edge fn (openai key thứ 2 sẵn sàng nếu cần).
- DebugAudioScreen thêm nút "4. Test ghi am + cham diem" + hiển thị
  MediaRecorder mime/iOS detect - mở trang này trên iPad để kiểm nhanh
  toàn pipeline.
- iPhone/iPad thật: chờ user verify trên thiết bị (MediaRecorder trên
  iOS Safari 14.3+ là đường đã chuẩn, qua HTTPs ea.vieschool.com).

## 4. Addendum - multi-key STT fallback (sau khi het credit toan bo provider)

Su co: ca 3 provider deu can cung luc (OpenRouter audio yeu cau balance
>= $0.50, Gemini project prepaid het credit, OpenAI Whisper het credit)
-> edge fn tra 502 -> app bao "chua nghe duoc giong em".

Fix (migration 0029 + edge fn v6):

- `get_ai_configs` emit 1 row per credential: `gemini_api_key`,
  `gemini_api_key_2`, `gemini_api_key_3` (them key moi = them secret,
  khong can doi code). Thu tu key theo ten secret, thu tu provider theo
  `ai_provider` (dang `gemini,openrouter,openai`).
- Edge fn thu tung row den khi co transcript; 4xx/5xx/timeout/transcript
  rong deu roi xuong key/provider tiep theo. Error detail gio la array
  moi provider 1 entry (cat 160 char, khong chua key).
- `openrouter_model` sua ve `google/gemini-2.5-flash` (truoc do tro
  `thinkingmachines/inkling:free` - model khong nhan audio, luon 403).
- `openai` gio cung tra `__ERR_<status>` thay vi null de detail hien
  dung loi.

Verify: poison `gemini_api_key` + `gemini_api_key_2` thanh key rac ->
request roi vao key 3, van tra `{"transcript":"apple"}` HTTP 200.
Restore xong test lai 200 voi key 1.
