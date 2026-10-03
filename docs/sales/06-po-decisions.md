# 06 - PO Decisions (rulings tren sales package v1)

> Ngay 03/10/2026 - PO ruling cho 3 cau hoi cua sales agent.
> Cac file 00-05 la draft da duoc duyet theo cac quyet dinh duoi day.

## D1. Pricing - DUYET theo de xuat v1

| Tier | Gia chot |
|---|---|
| Gia dinh nam hoc | **399.000d/HS/nam** - founding 299.000d toi 31/12/2026 |
| Mua thi 6 thang | **249.000d/HS** |
| Nhom lop (PH tu tra) | **199.000d/HS/nam** tu 15 HS |
| Lop (GV/don vi tra) | **3.900.000d/lop/nam** toi da 35 HS |
| Truong/trung tam | **99.000d/HS/nam**, min 100 HS; 300+ gia 79.000d |

Logic: neo duoi ~450k la tong chi phi PH dang tra cho IOE + Violympic
rieng le - ta gop ca hai trong mot app nen 399k la "de quyet dinh".

## D2. Mo hinh giao vien + wording - DUYET

- **Giao vien truong cong KHONG thu tien**. PH tra truc tiep cho
  VieSchool qua ma lop (rui ro TT 29/2024 - day them thu phi trai phep).
  GV duoc quyen xem lop mien phi, dong vai tro referrer.
- **Wording**: moi tai lieu dung "theo format de IOE/Violympic", TUYET
  DOI khong viet "de IOE that" / "ngan hang de thi that" cho toi khi co
  y kien phap ly ve bao mat de thi thuoc so huu VTC/FPT.
- App UI hien tai da sach (khong quang cao "de that" - da kiem chung).

## D3. Product priorities - RULING

**Khong lam payment integration trong 90 ngay dau.** Thu ngan thu cong:
KH chuyen khoan -> admin kich hoat tai khoan bang tay (quy trinh da co
trong AdminScreen). Mo CR payment gateway chi khi co >= 20 khach tra
tien hoac churn do thu tuc thu cong.

**CR san pham chan doanh thu (uu tien theo thu tu):**

1. **Ma lop / class code join** - PH va HS nhap ma lop de tu dong vao
   lop cua GV; can cho Tier 2a (gia nhom 199k). Hien enroll chi co qua
   admin thu cong.
2. **Teacher role read-only** - GV xem tien do lop ma khong can quyen
   admin toan he thong. Hien AdminScreen la admin-only; tach role
   'teacher' khi pilot lop dau tien yeu cau.
3. **Paid tier flag** - gate "Goi tra phi" tren account; chi build khi
   co khach hang tra tien dau tien can han che guest/expire.

**Dinh chinh du lieu**: leaderboard KHONG phai gap - CR-30 da ship
(LeaderboardCard weekly, RPC server-side, hien trong StartBatchScreen).
Cap nhat sales materials: liet ke "Bang xep hang tuan" nhu feature co
san, khong danh dau roadmap.

## Rui ro PO ghi nhan (khong chan sale, nhung can lich xu ly)

- Ban quyen ngan hang de IOE/Violympic: ngung harvest them den khi co
  tu van phap ly; wording da mien nhiem.
- Content G1/G3 con mong - sales khong hua "du noi dung 5 khoi ngay
  nhau nhu nhau"; positioning pilot o G2/G4/G5 (bank day nhat).
- Khoa hoc TA = 0 cau hoi - go bo khoi moi sales material cho toi khi
  co content (pricing doc da viet dung: "tieng Anh + Toan TA").
