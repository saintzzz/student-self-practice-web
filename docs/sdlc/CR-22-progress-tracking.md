# CR-22: Student progress tracking + admin "Tiến độ" report

**Date:** 2026-10-01
**Status:** Implemented, verified on production
**Driver:** PO gap analysis - moi doi thu (Monkey Junior, Babilala, IXL) deu co bao cao tien do cho truong/phu huynh; truoc day session chi ton tai client-side nen admin khong thay duoc hoc sinh da lam gi.

## What changed

1. **`supabase/migrations/0002_practice_results.sql`** - bang `practice.results`:
   - `account_id`, `grade_id`, `points`/`max_points`, `correct_count`/`total_questions`, `rounds_completed`, `created_at`.
   - RLS default-deny dung convention hien co: `results_admin_all` (admin full), `results_self_read`, `results_self_insert` (`account_id = auth.uid()`).
2. **`src/lib/practiceResults.ts`** (moi) - `savePracticeResult()` (no-op voi guest, never throws - luu ket qua la nen) + `fetchRecentResults()` join `accounts` cho admin.
3. **`BatchSummary`** - goi `savePracticeResult(gradeId, result)` khi hoan thanh batch.
4. **`AdminScreen`** - tab "Tiến độ" moi: bang tong hop theo hoc sinh (so bai, so cau dung, ti le % mau theo nguong 80/50, vung dat da choi, lan choi cuoi).

## Authorization model

- Student chi insert/select ket qua cua chinh minh (RLS `auth.uid()`).
- Admin doc toan bo qua `practice.is_admin()`.
- Guest khong ghi gi - giu nguyen trial flow.

## Verification (production Supabase)

- Login JWT `demo_hs` -> insert ket qua: OK.
- Insert gia mao `account_id` nguoi khac: **bi RLS chan** (`row-level security policy`).
- Student self-read: OK. Admin read + join `accounts(username, display_name)`: OK.
- `BatchSummary` tests: 6/6 pass, khong unhandled error.
- `tsc -b` clean; CI moi lint/test/build.

## Follow-ups

- Trang "Ket qua cua em" cho hoc sinh tu xem (RLS da mo san).
- Bao cao theo lop (join enrollments) + xuat PDF/email phu huynh.
