# CR-34: Arena mode - thách đấu 1v1 bất đồng bộ

## Yêu cầu (PO)
Tier-2 roadmap: "English Arena" hiện chưa có arena thật. IOE/Violympic giữ
người dùng nhờ thi đua; cần cơ chế đấu 1v1 khả thi mà không cần realtime infra.

## Thiết kế
Đấu bất đồng bộ (async ghost), cùng bộ câu hỏi:

- Người tạo thử thách chơi một đề 10 câu (practice pacing, có bấm giờ) với
  `seed` ngẫu nhiên. Đề được generate deterministic từ seed - ai nhận thách
  đấu sẽ gặp **đúng cùng bộ câu**.
- Người nhận chọn 1 thử thách đang mở (cùng khối, không phải của mình), chơi
  xong thì hệ thống so: **điểm cao hơn thắng; hòa điểm thì nhanh hơn thắng**.
- Guest (chưa login): "Đấu với máy" - đối thủ bot sinh deterministic từ seed,
  không cần DB, không claim vị trí thật.

## DB (schema `practice`, không expose qua Data API)
- Bảng `arena_challenges`: id, seed, grade_id, program_id, creator_id/name/
  score/time_ms, opponent_id/name/score/time_ms, status open|done, timestamps.
- RPCs SECURITY DEFINER (theo pattern `weekly_leaderboard`):
  - `arena_create(p_seed, p_grade_id, p_program_id, p_score, p_time_ms)` -> id
  - `arena_open(p_grade_id)` -> danh sách thử thách mở (tên + điểm + giờ tạo,
    loại trừ chính mình, limit 20)
  - `arena_accept(p_id, p_score, p_time_ms)` -> claim nguyên tử (chỉ khi open
    và creator != caller), trả về kết quả 2 phía
  - `arena_recent(p_grade_id)` -> 10 trận gần nhất của mình
- RLS: bảng trong schema riêng, chỉ qua RPC; guest không gọi được (auth.uid()
  null -> return empty/error).

## UI
- `ArenaCard` trên màn khối (StartBatchScreen): nút "Tạo thử thách", danh sách
  thử thách đang mở, lịch sử trận của mình, lock prompt cho guest -> vẫn cho
  "Đấu với máy".
- ExamScreen mode 'arena': 10 câu cùng seed; sau khi nộp -> màn so kè tỉ số
  2 bên + tuyên bố thắng/thua/hòa.

## Acceptance criteria
- AC-34.1: tạo thử thách lưu đúng seed/score/time vào `arena_challenges`.
- AC-34.2: `arena_open` chỉ trả thử thách open, cùng khối, loại trừ của mình.
- AC-34.3: `arena_accept` nguyên tử - hai người nhận cùng lúc thì chỉ 1 win;
  creator không tự nhận kèo của mình.
- AC-34.4: cùng seed -> cùng bộ câu hỏi (deterministic, có test).
- AC-34.5: guest "Đấu với máy" hoạt động hoàn toàn offline, không gọi RPC.
- AC-34.6: kết quả hiển thị 2 bên (tên, điểm, thời gian) + kết luận.
- AC-34.7: không lộ dữ liệu cá nhân ngoài display_name + điểm trận.

## Impact
- Bảng + 4 RPC mới trong `practice` (không đụng bảng cũ).
- ExamScreen thêm mode + seed injection; StartBatchScreen thêm card.
- Không ảnh hưởng leaderboard/daily quest/review.
- Estimate: M-L (DB + RPC + UI + tests).

## Trạng thái
APPROVED-BY-PO (user: "làm Tier 2")
