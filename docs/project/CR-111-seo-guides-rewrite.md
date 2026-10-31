# CR-111: SEO guides trên ea.vieschool.com/guides qua rewrite

## Thay đổi
Thêm `rewrites` vào `vercel.json`:
- `/guides/:path*` → `https://vieschool-content.vercel.app/ea/guides/:path*`
- `/guides-indexnow-key.txt` → key file cho IndexNow

## Lý do
Chương trình SEO-marketing VieSchool (theo mô hình fasttrack.vieschool.com): content
editorial tiếng Việt serve trên chính domain sản phẩm để SEO equity cộng vào
ea.vieschool.com. Code content nằm ở repo riêng `saintzzz/vieschool-content` -
marketing churn không bao giờ chạm build app.

## Impact assessment
- **Routes app:** không đổi - `/guides/*` chưa tồn tại trong SPA, rewrite chỉ bắt
  path mới. App là screen-state SPA không có URL routes xung đột.
- **Build:** không đổi framework, chỉ thêm key `rewrites` trong vercel.json.
- **Security:** destination là project Vercel cùng team, static HTML, không proxy
  auth/data. Header `X-Robots-Tag: noai` hiện áp cho `/(.*)` - cũng áp lên guides
  (chỉ chặn AI-training crawler, không chặn Google index - giữ nguyên).
- **Rollback:** xóa 2 dòng rewrite, push → guides 404 ngay.

## Estimate
1 commit, không chạm src/.
