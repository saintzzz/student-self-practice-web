# CR-55: Nút kết thúc giữa chừng cho bài luyện tập 4 vòng

> Ngày: 2026-10-04 - Loại: CR (thay đổi requirement UX) - Trạng thái: Implemented

## 1. Vấn đề

Bài ôn luyện 4 vòng (StartBatchScreen -> BatchScreen, nút "Bắt đầu luyện tập")
không có cách nào kết thúc giữa chừng: trong phase `active`, `stub` và
`round-summary` (user đã login) đều không có nút thoát - bắt buộc làm hết
4 vòng. Trong khi Luyện đề có "KẾT THÚC" và Thi thử có "NỘP BÀI" nộp bất cứ lúc nào.

## 2. Thiết kế

- `endBatchEarly(state)` trong `batchSession.ts`:
  - `active` + `roundSession`: chấm phần đã làm của vòng hiện tại
    (`buildRoundOutcome` - câu chưa trả lời không tính sai, cùng cơ chế
    `endRoundEarly` đang dùng cho hết giờ 5:00) rồi `phase='batch-summary'`.
  - `stub` / `round-summary`: `phase='batch-summary'` (outcome đã ghi).
  - `batch-summary`: no-op.
- BatchScreen: nút "Kết thúc" nhỏ trong chrome strip, hiện ở mọi phase trừ
  `batch-summary`, `data-testid="batch-end-early"`.
- Kết quả giữa chừng vẫn đi qua BatchSummary: sao/huy hiệu/streak cho phần
  đã làm + `savePracticeResult` ghi `time_used_sec` đúng thời gian thực
  (startedAtMs đã có từ CR-52) - không thưởng phạt gì thêm so với làm hết.

## 3. Verify

- Unit: endBatchEarly từng phase, outcome vòng dở chấm đúng phần đã trả lời.
- Playwright: vào bài 4 vòng -> trả lời vài câu -> Kết thúc -> thấy
  BatchSummary với số câu/điểm/thời gian đúng phần đã làm.
