# CR-39: Loại câu hỏi ảnh dùng emoji lá cờ

## Yêu cầu (PO - user report)
Screenshot prod: câu "Hình này là gì?" Lớp 5 hiện lá cờ Guam thu nhỏ,
đáp án Mayotte / Western Sahara / Fiji / Guam - không thể nhận ra hình.

## Nguyên nhân
Bank `g5-xp-flags-*` (và `g4-xp-flags-europe`) dùng emoji cờ quốc gia làm
visual. Các generator câu hỏi ảnh đã lọc qua `isLiteralImageWord`
(CR-24) nhưng bộ lọc chỉ là blocklist id thủ công - từ quốc gia không
nằm trong list nên vẫn lọt vào image-choice. Dù render to, "nhận diện
cờ Guam/Mayotte" cũng không phải câu hỏi trả lời được từ hình ảnh với
học sinh tiểu học.

## Fix
`isLiteralImageWord` giờ reject thêm mọi emoji lá cờ theo codepoint:
- regional indicator U+1F1E6-1F1FF (🇦-🇿 pairs)
- tag sequence char U+E0020-E007F (cờ phân vùng kiểu 🏴󠁧󠁢󠁥󠁮󠁧󠁿)

Một chỗ sửa phủ cả 5 generator dùng ảnh (image-choice,
describe-and-choose-image, listening-image-choice, counting-image,
picture-pair-matching) và mọi từ cờ tương lai. Từ quốc gia vẫn xuất
hiện bình thường ở các dạng text/audio (mcq nghĩa, extra-letter,
nghe điền từ...).

## Acceptance criteria
- AC-39.1: không câu hỏi ảnh nào dùng emoji cờ (mọi khối, mọi topic cờ).
- AC-39.2: từ quốc gia vẫn ra câu hỏi text/audio bình thường.
- AC-39.3: emoji không phải cờ (🏳️, ☠️) không bị loại nhầm.

## Impact
- `src/lib/content/imageSemantics.ts`: + `isFlagEmoji`, dùng trong
  `isLiteralImageWord`.
- Test: `imageSemantics.test.ts` thêm ca cờ G4/G5 + non-flag giữ nguyên.
