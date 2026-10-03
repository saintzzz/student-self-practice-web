# CR-47: Class code join (ma lop) - hoc sinh tu tham gia lop cua GV

## What / Why

Blocker doanh thu so 1 tu sales package (docs/sales/00-gtm-strategy.md):
Tier 2a "gia nhom lop" (199k/HS, PH tu tra) can co cach de HS/PH nhap ma
lop va tu dong vao lop cua giao vien - khong qua admin thu cong. Hien
nay enroll chi co the qua AdminScreen bang tay, khong scale duoc cho
ban hang.

## Scope

1. **DB (migration 0010 + 0011):**
   - `practice.classes.join_code text unique` - ma 6 ky tu tu bang chu
     khong gay nham (bo 0/O/1/I/L; alphabet 31 ky tu ~ 887 trieu to hop),
     backfill cho lop hien co.
   - `practice.gen_join_code()` - SECURITY DEFINER, grant `authenticated`
     (la column DEFAULT nen caller phai co execute; definer de collision
     check thay duoc moi lop ke ca duoi RLS), loop toi da 20 lan.
   - `practice.join_class_by_code(p_code text)` SECURITY DEFINER:
     caller phai la student; lookup class theo upper(code); idempotent
     cho cung lop; **chan khi da o lop khac (ruling: 1 HS = 1 lop,
     doi lop la viec cua admin)**; tra ve class_name.
2. **Student UI (JoinClassCard):** card tren **GradeSelect** (journey
   map) cho hoc sinh da login - vi HS chua enroll la nguoi can no nhat
   va ho chi nhin thay empty-state "chua mo noi dung". Input ma ->
   goi RPC -> hien "Em dang hoc trong lop: X" + onJoined refetch
   allowedGrades (lop moi mo ngay, khong can reload). Input strip
   ky tu mo ho I/L/O/0/1.
3. **Admin UI:** hien join_code trong tab classes de GV/admin chia se.

## Impact assessment

- `supabase/migrations/0010_class_join_code.sql`, `0011_class_join_fixes.sql`
- `src/components/JoinClassCard.tsx` (moi) + test
- `src/components/GradeSelect.tsx` (joinClassSlot prop + render)
- `src/App.tsx` (wire slot + onJoined refetch allowedGrades)
- `src/components/AdminScreen.tsx` (hien ma trong tab classes)
- `src/lib/classJoin.ts` (fetch own enrollment + call RPC)
- RLS san ho tro: `enrollments_self_read`, `classes_student_read` -
  khong can policy moi (RPC definer lo phan join).

## Review round 1 - findings da fix

- [BLOCKER] `gen_join_code` revoke authenticated nhung la column
  DEFAULT -> admin tao lop bi permission denied. Fix: SECURITY DEFINER
  + grant authenticated. Verify live: admin insert tra `8J792J`.
- [BLOCKER] HS chua enroll (empty allowedGrades) khong bao gio thay
  card o StartBatchScreen. Fix: chuyen len GradeSelect qua
  `joinClassSlot`, hien ca trong empty-state. Verify live: hs_uicheck
  join R6R9AD -> "Lớp 4", grade-4 + grade-5 mo ngay.
- [MAJOR] allowedGrades khong refetch sau join. Fix: onJoined ->
  fetchMyAllowedGrades. Verify: cards hien ngay tren UI.
- [MAJOR] Join khong gioi han -> leaked code cho stack classes. Ruling
  PO: **1 HS = 1 lop** (RPC raise `already enrolled in a class`;
  re-enter cung ma van idempotent). Doi lop = admin action.
- [MINOR] Check constraint theo alphabet that; loop cap 20; order
  enrollments `assigned_at` cho fetchMyClassName on dinh; input strip
  ky tu mo ho.

## Review round 2 - findings da fix (migration 0012)

- [MAJOR] Race: 2 join dong thoi (2 tab) deu qua duoc check "no
  enrollment" -> HS o 2 lop. Fix: `for update` tren accounts row
  serialize joins cung 1 HS (khong dung unique index vi admin van
  multi-enroll hop le).
- [MINOR] Oracle: enrolled student probe code that/gia qua error khac
  nhau. Fix: HS da enroll nhan cung `already enrolled` cho moi code
  khong phai lop minh - ke ca code fake.
- [MINOR] `limit 1` enrollment check co the sai lop khi admin
  multi-enroll. Fix: exists-based check.
- [MINOR] classJoin map `already enrolled` -> "nho co chuyen lop";
  JoinClassCard reset state khi doi user; onJoined catch.

## Risks (accepted)

- Code bi doan: ~887M to hop, khong rate-limit - enrollment-only risk
  thap. Ghi nhan, co the them sau.
- Test gap (non-blocking): AdminScreen join_code render test can mock
  harness rieng - follow-up.
