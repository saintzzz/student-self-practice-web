# CR-63 - Tang nang cao lap cau giua cac buoi luyen

## Van de

Nguoi dung bao: "bai nang cao bi lap di lap lai giua cac lan nhieu qua".

Nguyen nhan do duoc (khong phai random sai - RPC `fetch_questions` da
`order by random()`): pool canonical English `difficulty >= 4` qua nho so
voi `drillCount` moi buoi:

| Lop | drillCount | Pool d>=4 | Ti le lap moi buoi |
|-----|-----------:|----------:|-------------------:|
| 1   |         10 |        20 | ~50%               |
| 2   |         15 |        20 | ~75%               |
| 3   |         20 |        32 | ~63%               |
| 4   |         25 |        32 | ~78%               |
| 5   |         30 |        36 | ~83%               |

## Pham vi

1. Client-side recency exclusion trong `createExamFromBank`:
   - Luu id cau da gap (localStorage, cap 80) theo key
     `ea-seen:<program>:<grade>:<tier>`.
   - Khi co `focus.minDifficulty`: overfetch x4, uu tien cau chua gap,
     chi dung lai cau da gap khi pool can.
   - Sau khi chon xong, ghi nhan id vao lich su.
   - Khong doi RPC/migration - guest va user deu huong loi.

2. Morong ngan hang authored advanced (pipeline CR-59
   `scripts/gen-advanced-bank.mjs`): +~20-25 item English difficulty 4-5
   moi lop, bam chu de Global Success tung lop, dang mcq + true-false +
   reorder + text-answer, moi item co `explanation_vi` +
   `learning_objective`.

3. Khong doi `minDifficulty: 4` - giu nghia "nang cao" trung thuc.

## Tieu chi nghiem thu

- Pool d>=4 English sau push: G1>=40, G2>=40, G3>=52, G4>=52, G5>=56.
- 2 buoi drill lien tiep khong lap cau khi pool >= 2x drillCount.
- Cau da gap chi tai xuat khi pool khong du cho buoi moi.
- `gen-advanced-bank.mjs --check` 0 loi; `--push` upsert idempotent
  (on conflict do nothing).
