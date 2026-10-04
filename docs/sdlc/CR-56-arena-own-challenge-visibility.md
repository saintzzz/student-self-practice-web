# CR-56: Thử thách Arena của chính mình phải hiển thị "đang chờ"

> Ngày: 2026-10-04 - Loại: CR (thay đổi requirement UX) - Trạng thái: Implemented

## 1. Vấn đề

Minh LD tạo thử thách xong không thấy thông tin gì. DB confirm challenge
đã insert đúng (`arena_challenges` row open) - nhưng:

- `arena_open` lọc `creator_id <> auth.uid()` -> thử thách của chính mình
  không bao giờ xuất hiện trong "Thử thách đang mở".
- `arena_recent` chỉ lấy `status='done'` -> thử thách đang chờ cũng không
  xuất hiện trong "Trận gần đây".
- Kết quả: người tạo thấy "Chưa có thử thách nào" - trông như tạo thất bại.

## 2. Thiết kế

- Migration `0022`: drop + recreate `practice.arena_open` bỏ filter
  `creator_id <> auth.uid()`, thêm cột `i_created boolean`.
  Giữ nguyên: status='open', cùng khối, 7 ngày, desc, limit 20.
  (Bạn bè vẫn thấy thử thách của mình như cũ với `i_created=false`.)
- `ArenaOpenChallenge.i_created`; ArenaCard tách 2 nhóm:
  - "Thử thách của em - đang chờ bạn nhận": score + thời gian + chip
    "⏳ Đang chờ" (không nút Nhận kèo - không thể tự nhận kèo mình).
  - "Thử thách đang mở": của bạn bè, nút Nhận kèo như cũ.

## 3. Verify

- Unit: ArenaCard render nhóm riêng cho own challenge, không nút accept.
- Playwright: login minhld -> Lớp 2 -> thấy thử thách 100đ/0:54 đang chờ.
