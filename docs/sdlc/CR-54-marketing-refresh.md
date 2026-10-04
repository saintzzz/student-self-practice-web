# CR-54: Cập nhật landing page và proposal theo trạng thái sản phẩm hiện tại

> Ngày: 2026-10-04 - Loại: CR (nội dung marketing/tài liệu bán hàng) - Trạng thái: Implemented

## 1. Vấn đề

Landing page (`vieschool.com`, static `vieschool-landing/index.html`) và proposal
khách hàng (`proposal-vieschool-khach-hang.docx/.pptx` + `04-one-pager.md`)
đang mô tả sản phẩm ở trạng thái trước CR-46/48/51/52/53:

| Claim cũ | Thực tế hiện tại |
|---|---|
| "1100+ từ vựng bám SGK" | 11.406 câu hỏi (TA 5.836 + Toán TA 3.560 + KH TA 2.010) |
| "Luyện đề + Thi thử theo format IOE" chung chung | 270 đề thi chuẩn theo blueprint từng khối + luyện đề không giới hạn |
| Không nhắc Toán/KH tiếng Anh trên landing | 3 chương trình: Tiếng Anh, Toán tiếng Anh, Khoa học tiếng Anh |
| Không nhắc tính giờ | Ôn luyện có đồng hồ đo thời gian (CR-52), lưu `time_used_sec` |
| "Điểm yếu: chỉ tiếng Anh" | Đã có 3 môn; điểm yếu thật còn lại: mới phủ lớp 1-5 |
| Docx giá gia đình 249k/năm, trường 30-50k | Sai so với `01-pricing.md`: gia đình 249k/6T - 399k/năm, trường 99k/79k |
| One-pager "376 câu", "200 câu/30 phút" | Stale từ trước V6 bank và CR-46 |

## 2. Phạm vi

- `vieschool-landing/index.html`: stats + mô tả English Arena.
- `scripts/gen-customer-proposal-deck.py` -> regen `proposal-vieschool-khach-hang.pptx`.
- Mới: `scripts/gen-customer-proposal-doc.py` -> regen `proposal-vieschool-khach-hang.docx`
  từ cùng nội dung deck (trước docx viết tay nên lệch giá với pricing chuẩn).
- `docs/sales/04-one-pager.md`: sửa số liệu stale.

## 3. Số liệu chuẩn dùng trong tài liệu (verify DB 2026-10-04)

- 11.400+ câu hỏi có đáp án kèm giải thích tiếng Việt (tổng 11.406).
- 270 đề thi chuẩn theo blueprint riêng từng khối (câu trắc nghiệm, điền từ,
  đúng/sai, sắp xếp câu, nghe, đọc hiểu).
- 1.455 hình minh họa có bản quyền khai báo rõ (Twemoji CC-BY-4.0,
  Noto Apache-2.0, asset tự dựng) - không vi phạm bản quyền bên thứ ba.
- 470 bài nghe có transcript.
- 3 chương trình: Tiếng Anh (Global Success), Toán tiếng Anh, Khoa học tiếng Anh.
- Thời gian làm bài được ghi trong ôn luyện lẫn thi thử.

## 4. Không đổi

- Giá niêm yết (giữ nguyên `01-pricing.md`).
- Claims "theo format đề IOE" (không nói "đề IOE thật") - giữ nguyên quy ước pháp lý.
- Design landing (navy/gold VieSchool) - chỉ đổi copy/số liệu.

## 5. Verify

- Landing: deploy lên vieschool-landing Vercel project, kiểm tra render.
- Deck/docx: regen, mở kiểm tra số liệu khớp bảng trên.
- Không đụng code app -> không cần test suite.
