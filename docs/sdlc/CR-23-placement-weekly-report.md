# CR-23: Placement diagnostic + bao cao tuan (admin)

**Date:** 2026-10-01
**Status:** Implemented
**Driver:** PO ecosystem review - doi thu (Monkey, Babilala, Duolingo) deu co bai kiem tra dau vao de xep hoc sinh dung trinh do; EA hien bat chon lop thu cong. Digest phu huynh bang email khong kha thi vi EA khong co email PH (username+PIN) - thay bang bao cao tuan trong admin console de GV/nha truong nam duoc tien do, va PH xem qua GV.

## What changed

1. **`src/lib/placement.ts`** - bai placement 15 cau (3 cau image-choice/lop x 5 lop, lay tu generator + vocab bank co san, seeded deterministic). `recommendGrade()`: lop dau tien dat <2/3 cau dung; pass het -> grade-5.
2. **`src/components/PlacementScreen.tsx`** - tai dung `ActiveRoundQuestion`/`QuestionCard`; ket qua hien bar dung/sai theo lop + lop goi y + CTA "Bat dau lop X".
3. **`App.tsx`** - screen `placement`; `GradeSelect` them nut "Lam bai kiem tra dau vao".
4. **`supabase/migrations/0003_placement.sql`** - `accounts.placement_grade` + RPC `practice.set_my_placement` (security definer, chi update 1 cot - khong mo self-update toan row). HS dang nhap xong bai -> luu `placement_grade` + 1 row `practice.results` (grade = lop goi y) de admin thay trong Tien do.
5. **AdminScreen tab Tien do**: them block "Bao cao tuan" - 7 ngay gan nhat: so luot luyen, HS active, % dung, breakdown theo lop hoc; ProgressTable them cot "Lop goi y" (placement).

## Impact assessment

- Placement la flow moi doc lap - khong cham batch hien co; guest cung lam duoc (khong luu).
- `set_my_placement` gioi han dung 1 cot + whitelist grade_id - khong mo RLS update accounts.
- Migration khong pha vo bang cu.

## Estimate

~1 ngay.

## Verification

- Unit test `placement.test.ts` (recommend logic + build session 15 cau, dung lop tung cau).
- Typecheck + full Vitest + build xanh; migration applied tren Supabase.

## Follow-ups

- Adaptive placement (thay do kho theo dap an) khi co du lieu that.
- Neu sau nay co kenh PH (email/Zalo OA), day bao cao tuan tu admin -> PH.
