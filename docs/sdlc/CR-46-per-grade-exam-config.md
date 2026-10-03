# CR-46: Bo exam/drill config theo khoi lop + seed du lieu leaderboard demo

## What / Why

1. **Per-grade exam config** (user request): moi khoi lop dung CUNG bo
   tinh nang (Luyen tap / Luyen de / Thi thu, 3 chuong trinh) - chi khac
   do kho (da co san qua bank/quotas) va SO CAU + THOI GIAN. Hien nay
   Thi thu = 200 cau/30 phut cho ca lop 1 - tre 6 tuoi khong the hoan
   thanh, va tao cam giac "che do thi chi danh cho lop lon".
2. **Leaderboard demo data** (user request): `practice.results` chi co
   9 row test rac (points=0, drill lap) cua socxinh/demo_hs -> bang xep
   hang trong rong/rac khi demo ban hang. Don het, seed 1 lop demo voi
   ten Viet Nam that va ket qua tuan nay da dang.

## Impact assessment

- `examSession.ts`: them `examConfigForGrade(gradeId)` ->
  `{ drillCount, examCount, examTimeSec }`. `createExam` mac dinh lay
  theo config cua lop (tham so `count` giu lam override - arena/review
  khong doi).
- `ExamScreen.tsx`: doc config theo gradeId - so cau tren intro card,
  time limit, copy "N cau - M phut".
- `StartBatchScreen.tsx`: label dong "Luyen de - X cau",
  "Thi thu - Y cau" theo lop.
- Gia tri chon (thang do thoi gian/cau tang dan ~18s -> 9s):

| Lop | Luyen de | Thi thu | Thoi gian |
|---|---|---|---|
| 1 | 10 cau | 50 cau | 15 phut |
| 2 | 15 cau | 80 cau | 20 phut |
| 3 | 20 cau | 120 cau | 25 phut |
| 4 | 25 cau | 160 cau | 30 phut |
| 5 | 30 cau | 200 cau | 30 phut |

- G5 giu format chuan IOE (200/30). Pool nho hon target thi van cap
  theo pool (logic san co).
- Arena 10 cau / review queue khong doi (khong phai exam).
- `practice.results`: xoa 9 row test; seed ~30 tai khoan demo
  (6/khoi) + results trong tuan hien tai qua service-level insert.
  Tai khoan tao qua edge function `practice-admin` (dung quy trinh
  that, khong insert auth.users bang tay).

## Risks

- Test cu assert 200 cho moi lop -> cap nhat theo config.
- Pool khoa hoc G1-2 (~60 cau) < 80 cau exam G2? Cap theo pool - da
  co san, them test cho phep.
- Seed accounts phai di qua edge function that de dong bo auth.users +
  practice.accounts.
