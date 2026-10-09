# CR-66 - Tang ngan hang + khong lap qua 20% moi de (moi level)

## Yeu cau

User: "increase ngan hang cau hoi len cho da dang va khong bao gio bi lap
qua 20% moi de (tat ca level)".

## Cach dat duoc

Guarantee `repeat <= 20%` can pool >= 80 (seen cap) + 0.8 x drillCount.
Voi drillCount 10-30 theo lop: pool can >= 88-104.

1. **Recency exclusion mo rong** (bank.ts): truoc chi ap dung cho tier
   nang cao; gio ap dung cho MOI fetch khong phai form co dinh (luyen de,
   thi thu, nang cao, coach skill drill). Seen key tach theo
   `program:grade:mode:tier`. Tier nang cao fetch 250 row (phu gan het
   pool) thay vi sample x4 - dam bao nhin thay moi cau chua gap.

2. **Nguong "Nang cao" thong nhat difficulty >= 3** (StartBatchScreen):
   - English G1/G2 khong co d3 trong bank V6 -> thuc te van la d4+.
   - Math/science G1-5 co nhieu d3 goc -> pool nhan ngay.
   - Y nghia "nang cao" = top do kho cua bank lop do.

3. **Noi dung authored moi** (pipeline CR-59, --push PostgREST):
   - English G1: +51 cau (pool 40 -> 91), G2: +61 (40 -> 101)
   - Science G1: +28 (64 -> 92), G2: +31 (64 -> 95), G3: +32 (65 -> 97)
   - Bam chu de Global Success tung lop + KHTN: living things, materials,
     forces, light/shadow, water cycle, skeletons, food chain, weather...
   - Moi cau co explanation_vi + learning_objective; mixed
     mcq/tf/reorder/text-answer.

## Ket qua verify (DB thuc te, canonical + d>=3)

| Subject | G1 | G2 | G3 | G4 | G5 | Nguong can |
|---------|---:|---:|---:|---:|---:|-----------:|
| english | 91 | 101 | 132 | 159 | 177 | 88-104 |
| math    | 114 | 112 | 223 | 238 | 396 | 88-104 |
| science | 92 | 95 | 97 | 147 | 145 | 88-104 |

Tat ca 15 o deu >= nguong -> moi buoi drill/dề khong lap qua 20% ca khi
lich su da day 80 cau.

## Gioi han

- De thi form co dinh (`fetchBankForm`) khong bi anh huong - dung danh
  sach san.
- De thi thu (mock) so cau lon (50-200) van uu tien cau chua gap nhung
  khong the dam bao 20% khi pool < examCount - do la gioi han du lieu,
  khong phai loi logic.
