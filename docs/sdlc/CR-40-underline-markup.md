# CR-40: Render markup `<u>` trong câu IOE "underlined part"

## Yêu cầu (PO - user report)
Screenshot prod: câu "underlined part pronounced like the letter E in
EXCITING" hiện option dạng `h<u>i</u>gh` - tag HTML thô, không có gạch
chân thật -> câu hỏi không trả lời được (không thấy "underlined part"
là chữ nào), user tưởng sai đáp án.

## Nguyên nhân
Bank `ioeRealBank.ts` giữ nguyên markup `<u>...</u>` từ đề IOE gốc (59
vị trí trong prompt/options/explanation), còn `OptionButtons`,
`PromptLine`, `examCorrectAnswerText`, review list đều render chuỗi raw.

## Kiểm tra answer key
Đã audit tay toàn bộ ~42 câu "underlined part" trong bank - mọi đáp án
đúng phát âm (chicken /ɪ/ = E trong exciting /ɪkˈsaɪtɪŋ/ là đúng).
Lỗi duy nhất là hiển thị.

## Fix
`MarkupText` component mới trong ExamScreen: split theo `<u>...</u>`,
render `<u>` thật, text còn lại giữ nguyên. Áp cho:
- option buttons (grammar-mcq + odd-pronunciation)
- prompt line (`ST<u>A</u>MP` trong câu hỏi)
- "Đáp án đúng" + explanation ở feedback từng câu
- review list: reviewPrompt, answerText, correct answer, explanation

## Acceptance criteria
- AC-40.1: option `h<u>i</u>gh` hiện "high" với chữ i gạch chân.
- AC-40.2: không còn chuỗi `<u>` lộ ra UI (prompt/option/explanation/
  review).
- AC-40.3: chuỗi không có markup render y hệt trước.

## Impact
- `ExamScreen.tsx`: + `MarkupText`, wire vào 7 chỗ render.
- Test mới `ExamScreen.markup.test.tsx` (2 ca).
