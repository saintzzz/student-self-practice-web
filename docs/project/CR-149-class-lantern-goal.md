# CR-149 - Class co-op weekly lantern goal (P1-8)

Nguồn: `GAMEFI-DESIGN-po.md` mục P1-8 (defer từ CR-148 vì cần rpc).

Spec: "Lớp mình thắp N đèn tuần này" - tổng số batch-completed của cả
lớp trong tuần so với mục tiêu chung (mặc định 5 × số thành viên).
Đạt mục tiêu -> mọi thành viên nhận sticker `class-lantern`.
Aggregate-only rpc, không lộ dữ liệu cá nhân.

## Thiết kế

- **Migration 0083** `practice.class_week_lanterns()` - SECURITY
  DEFINER, cùng trust-shape với `weekly_leaderboard` (0004). Trả 1 row:
  `class_name, members, lanterns, goal (members*5), met`. Caller không
  enroll -> 0 row -> client render nothing. `revoke` public/anon/
  service_role, `grant` authenticated.
- **`src/lib/classLanterns.ts`** - `fetchClassLanterns()` wrapper
  (getSession -> rpc -> null on guest/no-class/error) + `isoWeekKey()`
  (`YYYY-Www`, scope grant 1 lần/tuần).
- **Store** - sticker `class-lantern` (category `luyen`), objective key
  `classlantern:<isoWeek>`; `claimClassLantern(weekKey)` idempotent per
  week (sticker tự idempotent nên tuần sau chỉ thêm key mới).
  `OBJECTIVE_RE` + sync allowlist thêm prefix `classlantern`.
- **`ClassLanternCard`** - card cạnh `LeaderboardCard` trong hub
  (sections + fallback layout): "Lớp mình thắp đèn" + progress
  `N/M bài luyện` + 5 chấm đèn; `met` -> text "Đạt rồi" + claim sticker.
  Guest / chưa có lớp / lỗi -> return null (không render).

## Impact

- `supabase/migrations/0083_class_week_lanterns.sql` (đã apply remote).
- `src/lib/classLanterns.ts` + test (isoWeekKey boundaries).
- `src/lib/engagement/store.ts` (+sticker, +claim fn, +regex), sync.ts
  allowlist, `StartBatchScreen` mount, `ClassLanternCard.tsx` mới.
- `scripts/artgen/manifest-p18.mjs` - sticker art queue sau manifest2.

## Test

- store.test.ts: grant 1 lần/tuần, tuần sau grant lại, sticker catalog.
- classLanterns.test.ts: ISO week boundaries (Mon/Sun, year boundary).
- rpc: SECURITY DEFINER verified post-apply; aggregate-only (không join
  accounts/per-student row).

## Còn lại

- `sticker-class-lantern.webp` - artgen (manifest-p18.mjs, chạy sau
  queue manifest2); tới đó UI fallback emoji 🏮.
- P2-5 seasonal trail variants (artgen-dependent).

## External review r250 - 5 findings, đã sửa hết

1. grape override + vocab image share 1 webp -> art-failure rơi về
   native 🍇 bunch -> `COUNTING_UNIT_EXCLUDE` khôi phục `grape`
   (imageSemantics.ts) cho tới khi có fallback độc lập.
2. run-flow.mjs: `continue` khi no-image nhảy qua circuit-breaker +
   pacing -> đường fail giờ cũng chạy qua breaker.
3. `savePlacementResult` insert thiếu `program` -> inherit 'batch'
   -> bài placement bị đếm nhầm là batch-completed. Migration 0084:
   label `program='placement'` (constraint + backfill + client insert),
   rpc filter `program='batch'` giữ nguyên semantics đúng.
4. Week key: client tính ISO week local có thể lệch boundary của
   aggregate quanh nửa đêm Thứ Hai -> rpc trả `iso_week` server-side
   (`to_char(date_trunc('week', now()), 'IYYY-"W"IW')`), card claim
   theo key đó; `isoWeekKey()` local bỏ.
5. `aria-hidden` bọc cả achievement text -> dots vẫn ẩn, met text
   chuyển `role="status"`.
