# CR-38: Fix câu True/False thiếu đoạn văn (report từ prod)

## Bug
PO chụp prod `ea.vieschool.com`: câu T/F chỉ hiện statement
("Lucy is ten years old.") + 2 nút True/False, không có passage -
học sinh không thể trả lời. Nhiều câu cùng lỗi.

## Nguyên nhân
Converter `ioe-convert-all.mjs` cố định `passage: ''` cho mọi item
type-1 (giả định ban đầu là câu T/F dạng nghe). Thực tế passage text
nằm trong `Description.content` của raw harvest - bị bỏ sót.

## Sửa
- Converter: `passage = Description.content`; drop item khi passage là
  media URL hoặc < 20 ký tự (đúng câu T/F nghe, không cứu được).
- Bonus: +26 câu T/F G5 trước đây bị bỏ vì không có answer key - giờ
  đã giải tay bằng chính passage đã harvest (TF_ANSWERS mở rộng).
- Guard phòng thủ trong `generateIoeRealTfQuestions`: lọc
  `passage.length >= 20` để data lỗi không lọt vào đề nữa.

## Verify
- 0 câu `passage: ''` trong bank sau regenerate.
- Audit toàn bank: 243 masked đủ blank, 41 tf đủ passage, 277 mcq hợp lệ.
- UI render `question.passage` đã có sẵn - không cần đổi component.

## Impact
- `scripts/ioe-convert-all.mjs` + regenerate `ioeRealBank.ts`.
- `englishGenerators.ts` +1 filter line.
