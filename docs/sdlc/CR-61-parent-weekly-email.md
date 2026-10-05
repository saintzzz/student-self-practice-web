# CR-61 - Email báo cáo tuần cho phụ huynh (hoàn thiện + hardening)

Ngày: 05/10/2026 - Yêu cầu: "xử lý email báo cáo theo tuần cho phụ huynh -
mỗi tài khoản học sinh phải gắn email bố mẹ thì mới nhận được, không có
thì không nhận được".

## 1. Hiện trạng (khảo sát)

CR-31 đã xây gần hết pipeline:

- `practice.parent_contacts` (1 email/account, opt-in, RLS self+admin) -
  ĐÃ apply, 1 contact thật trong DB.
- `send_weekly_reports()` SECURITY DEFINER + cron `weekly-parent-report`
  Chủ nhật 12:00 UTC (19:00 VN) - ĐÃ chạy thật 04/10, email qua Resend.
- UI opt-in trong `ParentReportScreen` (nhập email + toggle + lưu).
- Resend: `aal.vn` verified (đang gửi bằng `reports@aal.vn`),
  `vieschool.com` FAILED - thiếu 4 DNS records ở Cloudflare.

Khuyết điểm phát hiện khi kiểm chứng:

1. Email viết không dấu tiếng Việt, chỉ có 4 con số tổng - chưa tách
   theo môn/thời gian như yêu cầu "phụ huynh biết con yếu đâu".
2. `last_sent_at` đánh dấu ngay khi queue - pg_net là async nên lỗi
   Resend (key hỏng, rate limit) bị nuốt, không retry, không log.
3. Không có cơ chế phát hiện email gửi thất bại.
4. Sender `reports@aal.vn` sai brand (domain dự án khác) - cần verify
   vieschool.com trong Resend.

## 2. Phạm vi

Trong:

- Migration 0024: nâng cấp `send_weekly_reports` - nội dung có dấu,
  tách theo môn (Tiếng Anh/Toán TA/Khoa học TA), tổng thời gian luyện,
  bảng gửi `parent_report_sends` (account, request_id, sent_at) +
  `reconcile_parent_reports()` + cron 30 phút sau để cờ lỗi và mở lại
  lượt gửi (clear last_sent_at khi response >= 400).
- Đảm bảo E2E: đăng ký email cho tài khoản demo, chạy hàm tay, xác
  nhận trên Resend dashboard (last_event = delivered với địa chỉ
  test `delivered@resend.dev`).
- Tài liệu DNS records cần thêm ở Cloudflare cho vieschool.com.

Ngoài:

- Báo cáo theo kỹ năng chi tiết (skill stats nằm client-side, chưa có
  server-side per-skill aggregate - cần telemetry mở rộng, phase sau).
- Cổng thanh toán, unsubscribe link một-chạm (hiện hướng dẫn tắt trong
  app - chấp nhận được cho MVP).
- Sender `reports@vieschool.com` - chỉ bật sau khi domain verified.

## 3. Verify

- `send_weekly_reports()` chạy tay trên DB thật: contact có email hợp
  lệ -> Resend event `delivered`; contact không email -> không gửi.
- Reconcile: giả lập response 4xx -> `last_sent_at` bị clear.
- Tài khoản không đăng ký email -> không nhận (đúng requirement user).
- HTML render đúng có dấu trên client thư thật (kiểm qua Resend body).

## 4. Kết quả triển khai (05/10/2026)

- Migration 0024 đã apply: send log `parent_report_sends` +
  `send_weekly_reports` v2 (diacritics, bảng theo môn, tổng phút,
  sender từ vault `resend_from` fallback reports@aal.vn) +
  `reconcile_parent_reports` + cron 12:30 UTC Chủ nhật.
- E2E verify trên DB thật: contact demo_hs -> delivered@resend.dev,
  chạy hàm -> Resend last_event=delivered, subject đúng có dấu,
  bảng Tiếng Anh 7 lượt / Toán TA 1 lượt, tổng điểm + phút.
- Reconcile verify: send có response 200 -> ghi status; send không
  response -> resend_error + clear last_sent_at (retry tuần sau).
- Cron gốc chạy Chủ nhật 12:00 UTC = 19:00 VN - đúng lịch.

## 5. Còn lại cho user (cần quyền Cloudflare)

Domain vieschool.com status=failed trong Resend - cần thêm 4 records
ở Cloudflare DNS (bob/tia.ns.cloudflare.com):

  DKIM  TXT    resend._domainkey   p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC5VawxUz2rb4voNB0mwikrJOOaPgdA9hsSfhPaFCPQ6jg6aKaj/R7hLUF+LTaJdaxFj8ouws2CngLtCO+zWAkxMQsEKRi+WA4lJusTQDd8JvuD99WNGwWhahSElIYlFlCXnV96qyc/OlSmgQGablQTjIbpp1pGktX5n2U5WBVlPwIDAQAB
  SPF   MX     send                feedback-smtp.ap-northeast-1.amazonses.com (priority 10)
  SPF   TXT    send                v=spf1 include:amazonses.com ~all
  TRACK CNAME  rsend               send.forge.rmta.net

Sau khi DNS propagate: Resend dashboard -> Domains -> vieschool.com
-> Verify, rồi set vault secret resend_from = 'VieSchool <reports@vieschool.com>'
để chuyển sender sang đúng brand (không cần migration).

## 6. Fallback provider (migration 0025)

Resend free key dùng chung 3 sản phẩm (AAL Fast Track, Sổ Chủ Nhiệm,
English Arena) -> chạm daily quota (verified: response 429
daily_quota_exceeded trên send thật).

- `send_weekly_reports` v3: đọc `email_provider` + `email_api_key` +
  `email_from` từ vault. Hỗ trợ resend (default), brevo, sendgrid,
  mailersend - đổi provider = đổi secret, không deploy.
- Reconcile verify trên lỗi thật: 429 -> ghi resend_error + clear
  last_sent_at (retry tuần sau).
- Interim: cron dời 19:00 -> 07:15 VN Chủ nhật (ngay sau quota reset
  00:00 UTC). Vẫn là vá - fix gốc là key/provider riêng.
- Cloudflare KHÔNG phải option: outbound email qua Workers không còn
  free (MailChannels dừng 08/2024); Email Routing chỉ nhận mail.

Khuyến nghị cho user: tạo Brevo account (300/ngày free) hoặc Resend
account riêng cho VieSchool, set email_provider + email_api_key trong
vault.
