# CR-36: Bạn đồng hành (pet/avatar) - XP nuôi pet theo câu đúng

## Yêu cầu (PO)
Tier-2 roadmap: giữ chân lớp 1-3 bằng cơ chế nuôi pet kiểu Duolingo ABC -
học đúng thì pet lớn lên, tạo vòng lặp cảm xúc ngoài điểm số.

## Thiết kế
- Pet sống trong engagement store (localStorage) - guest dùng được ngay,
  không cần tài khoản, sync server để CR sau.
- 3 loài: Mèo Mun 🐱, Rồng Con 🐲, Thỏ Trắng 🐰. Chọn 1 lần trên trang
  chủ khối; chưa chọn vẫn tích XP (không mất công học trước đó).
- 4 giai đoạn: Trứng -> Bé -> Nhỏ -> Trưởng thành ở 0/50/250/600 XP.
  Mỗi câu đúng = +10 XP (= đúng thang điểm thi), tích qua
  `recordCorrectAnswers` nên mọi mode đều nuôi pet; Arena không (isolation
  CR-34 review).
- Emoji chain theo loài: 🥚->🐱->🐈->🐯 | 🥚->🦎->🐲->🐉 | 🥚->🐰->🐇->🦄.
- Tiến hóa hiện banner chúc mừng 1 lần (`seenStage`), dismiss là tắt.

## UI
`PetCard` trên StartBatchScreen (sau ReviewCard): picker 3 loài khi chưa
chọn; sau đó là emoji theo giai đoạn + tên + thanh XP + "còn N XP".

## Acceptance criteria
- AC-36.1: mỗi câu đúng +10 XP kể cả trước khi chọn pet, không cap theo
  quest ngày.
- AC-36.2: stage map đúng ngưỡng 0/50/250/600; chọn loài giữ nguyên XP.
- AC-36.3: banner tiến hóa chỉ hiện 1 lần mỗi giai đoạn mới.
- AC-36.4: chưa chọn -> hiện picker 3 loài; chọn xong -> card trạng thái.
- AC-36.5: không lệ thuộc Supabase - hoạt động cho guest.

## Impact
- `store.ts`: `pet` slice + 4 API mới; hook 1 dòng vào
  `recordCorrectAnswers` (không đổi signature).
- `PetCard` + tests; StartBatchScreen thêm 1 card.
