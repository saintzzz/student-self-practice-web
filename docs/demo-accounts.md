# VieSchool - Tài khoản demo theo role

Dùng cho demo bán hàng / pilot. Tất cả đều là tài khoản demo - không chứa
dữ liệu thật. Không commit file này ra nơi public.

## English Arena - ea.vieschool.com (username + PIN)

| Role | Username | PIN | Scope |
|---|---|---|---|
| Quản trị (admin console, tạo acc, gán scope) | `demo_admin` | `demo2026` | full admin |
| Học sinh | `demo_hs` | `demo2026` | Lớp Demo VieSchool - đủ 5 khối (grade-1..5) |
| Guest (không cần acc) | - | - | 1 vòng miễn phí mỗi lớp, vòng 2+ khóa |

## TVC360 Công cụ số Giáo viên - congcuso.vieschool.com (email + password)

| Role | Email | Password |
|---|---|---|
| Quản trị | `admin@demo.tvc` | `demo1234` |
| Giáo viên | `gv@demo.tvc` | `demo1234` |
| Kiểm định | `kd@demo.tvc` | `demo1234` |

## Sổ Chủ Nhiệm Số - sochunhiem.vieschool.com (email + password, `demo1234`)

| Role | Email |
|---|---|
| Ban giám hiệu | `bgh@demo.scn` |
| Ban giám hiệu (trường TH) | `bgh-th@demo.scn` |
| Phó hiệu trưởng | `pht@demo.scn` |
| Giáo viên chủ nhiệm | `gvcn@demo.scn` / `gvcn-th@demo.scn` |
| Giáo viên bộ môn | `gvbm@demo.scn` |
| Tổ trưởng chuyên môn | `totruong@demo.scn` |
| Kế toán | `ketoan@demo.scn` |
| Học sinh | `hocsinh@demo.scn` / `hocsinh-th@demo.scn` |
| Phụ huynh | `phuhuynh@demo.scn` / `phuhuynh2@demo.scn` / `phuhuynh-th@demo.scn` |
| Sở GD&ĐT | `sogd@demo.scn` |
| UBND | `ubnd@demo.scn` |

## Kịch bản demo bán hàng gợi ý

1. `vieschool.com` - mở đầu: 3 sản phẩm / 1 nền tảng / hỗ trợ lớp 1-12.
2. Guest vào `ea.vieschool.com` - chơi thử vòng 1 → hit lock → "đây là điểm
   chuyển đổi trả phí".
3. `demo_hs` - full 4 vòng, 5 vùng đất, sao/huy hiệu.
4. `demo_admin` - console tạo tài khoản + gán lớp (show quy trình bán cho
   trường: admin cấp acc, không cần self-signup).
5. `congcuso` với `gv@demo.tvc` - soạn đề / ngân hàng câu hỏi.
6. `sochunhiem` với `gvcn@demo.scn` - điểm danh / sổ chủ nhiệm;
   `bgh@demo.scn` - dashboard ban giám hiệu.

## Lưu ý

- Mật khẩu demo nằm trong repo private - không paste vào tài liệu public.
- Nếu demo acc bị lộ/dùng sai: EA → admin reset-pin qua console;
  TVC360/SCN → đổi password trong Supabase Auth.
- SSO chung (1 tài khoản xuyên 3 app) chưa có - đang là roadmap.
