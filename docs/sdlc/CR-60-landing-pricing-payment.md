# CR-60: Landing page - bảng giá + thông tin chuyển khoản

> Ngày: 2026-10-04 - Loại: CR (requirement marketing) - Trạng thái: Implemented

## 1. Requirement

Landing `vieschool.com` phải có bảng giá và hướng dẫn thanh toán để phụ
huynh/giáo viên mua được ngay - không chỉ "liên hệ".

## 2. Nội dung

- Bảng giá theo `docs/sales/01-pricing.md` (nguồn chuẩn, KHÔNG bịa số):
  - Gia đình: Dùng thử 0đ - Mùa thi 249k/6 tháng - Năm học 399k/năm -
    anh chị em -50% từ con thứ 2 - Founding Family 299k/năm (300 suất).
  - Lớp học: 199k/HS/năm (từ 15 HS qua mã lớp) hoặc 3.900k/lớp/năm
    (tối đa 35 HS).
  - Trường: 99k/HS/năm (100-299 HS), 79k/HS/năm (300-799), >=800 liên hệ.
- Thanh toán chuyển khoản:
  - STK: 0157 9495 001 - TPBank - Chủ TK: LE DUY LINH
  - Nội dung CK: `VS <sdt> <goi>` hướng dẫn để đối soát.
- Cập nhật số liệu/tính năng mới (CR-58): gợi ý ôn luyện cá nhân hóa theo
  điểm yếu, tầng câu hỏi nâng cao.

## 3. Phạm vi

- Trong: `vieschool-landing/index.html` (section Giá + thanh toán),
  đồng bộ số liệu với proposal khi CR-58/59 xong.
- Ngoài: cổng thanh toán online tự động, xác nhận thanh toán tự động -
  hiện đối soát thủ công.

## 4. Verify

- Playwright: render đúng desktop + mobile 375, số liệu khớp pricing doc.
- Push main -> auto-deploy -> fetch live xác nhận STK + giá.

## 5. Trạng thái triển khai (04/10/2026)

ĐÃ XONG - live trên vieschool.com.

- Section Bảng giá 3 tier (Gia đình 399k/năm + Mùa thi 249k + Founding
  299k; Lớp 199k/HS + trung tâm 3.9tr/lớp; Trường 99k/HS + 79k tier).
- Panel thanh toán: TPBank 0157 9495 001 - LE DUY LINH + QR VietQR
  thật quét được + hướng dẫn nội dung CK `VS <sdt> <goi>`.
- Bullets cá nhân hóa + Nâng cao (CR-58/59) đã thêm vào card gia đình.
- Playwright: QR load OK, mobile 375 không overflow.
- Deploy: push main -> git-linked Vercel auto-deploy đã live.
