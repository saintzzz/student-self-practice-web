# CR-42: Content-contract tests - tại sao 3 lỗi lọt lên prod

## Post-mortem: tại sao tester không bắt được

3 bug content liên tiếp lọt lên production (CR-38/39/40) dù suite 839
tests xanh. Nguyên nhân gốc chung: **mọi test đều verify code logic bằng
fixture tổng hợp, còn dữ liệu thật ship ra prod không bao giờ đi qua
validation hay UI trong test.**

| Bug | Tại sao lọt |
|---|---|
| CR-38 passage rỗng | Generator test chỉ check `kind`/count; không test nào assert passage non-empty. Record `passage: ''` hợp lệ về type nên tsc cũng im. |
| CR-39 cờ thu nhỏ | `isLiteralImageWord` là blocklist thủ công - từ cờ không có trong list. Không có rule "emoji phải nhận diện được" nào được test. |
| CR-40 `<u>` leak | Mọi component test dùng fixture sạch `options: ['right','w1',...]`. Bank thật chứa markup `<u>` nhưng không test nào render bank thật qua component thật. |

Pattern: code đúng, data sai, và contract data↔render không ai kiểm.

## Guard layer mới (2 file test)

### 1. `src/data/ioeRealBank.quality.test.ts` - data invariants
Assert trực tiếp trên bank thật, mọi record:
- `tf.passage` >= 20 ký tự (CR-38 regression)
- `masked.displaySentence` có blank, `missing` non-empty
- `mcq`: 4 option distinct, answer trong bounds, prompt + explanation non-empty
- `reorder`/`listen` non-empty
- `makeWord`: word ghép được từ subsequence của chunks (có distractor)
- **Whitelist markup**: chỉ `<u>` được phép - tag khác (`<b>`, `<i>`,
  `<img>`...) fail CI ngay (CR-40 class)
- **Junk detector**: không `undefined`/`null`/`NaN`/`[object`/braces
- Bank mỗi khối phải có >20 items tổng (converter drop trắng -> fail)

### 2. `src/components/ExamScreen.realBank.test.tsx` - render contract
- `ExamQuestionView` giờ export; test sinh **400 câu thật** (80 câu ×
  5 khối) qua `createExam` thật, render từng câu qua production
  component
- Assert mọi câu: không raw markup trong textContent, không junk
  (`undefined`, `[object Object]`), có ít nhất 1 element tương tác
  (button/input) - câu render ra markup chết là bug
- TF riêng: phải có đoạn passage >= 20 ký tự hiển thị (CR-38)

## Bài học cho dự án sau (reusable pattern)

Khi nào cần content-contract tests: **mọi data bank/harvested/generated
content ship vào UI**. Checklist:

1. Data invariants phải là test chạy CI: non-empty, in-bounds, distinct,
   whitelist markup - không chỉ type-check.
2. Render contract: ít nhất 1 test render **real data qua real
   component** - fixture không thay thế được data thật.
3. Mọi escape hình/media phải có semantic guard (như
   `isLiteralImageWord` + flag detection) chứ không chỉ blocklist tay.
4. Khi user report 1 bug content -> viết test assert chính invariant đó
   (như tf-passage-20-chars), không chỉ sửa điểm lỗi.
