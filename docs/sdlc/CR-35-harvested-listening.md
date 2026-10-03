# CR-35: Render câu listening từ bank IOE đã harvest

## Yêu cầu (PO)
Tier-2 roadmap: bank IOE thật (`ioeRealBank.listen`) chứa 10-20 transcript
câu nghe mỗi khối đã harvest nhưng chưa render - chúng nằm trong data mà
không xuất hiện trong đề nào.

## Thiết kế
Convert transcript thành 2 kind đã có sẵn renderer + chấm điểm:

- Transcript <= 2 từ ("cup", "Thank you") -> `listening-fill-blank`:
  nghe từ, gõ lại (dictation).
- Transcript >= 3 từ ("I like pizza.") -> `listening-sentence-fill-blank`:
  nghe cả câu, nhìn câu bị khuyết, gõ từ thiếu. Từ bị khuyết là token
  alpha cuối cùng có độ dài >= 3 (từ mang nội dung nằm cuối câu), không
  bao giờ chọn "I"/"I'm". Dấu câu của token được giữ lại ("pizza." ->
  "___.").

Audio dùng TTS của app (ListenButton + playSlow đã ship ở CR-32) - không
cần file media ngoài. Grade 5 fallback bank grade-4 như các loại khác.

## Wire
- `generateIoeRealListenQuestions(gradeId)` mới trong englishGenerators.
- `buildEnglishPool`: slice `real.listen` (G1-2: 10, G3: 12, G4-5: 15) lấy
  từ bank thật; template `listening-sentence-fill-blank` giảm tương ứng
  để tổng quota listening không phình.

## Acceptance criteria
- AC-35.1: mọi khối có bank.listen sinh ra >= 10 câu listening hợp lệ.
- AC-35.2: câu >= 3 từ -> displaySentence chứa "___", word khớp đúng token
  bị khuyết, không bao giờ khuyết "I".
- AC-35.3: pool english của mọi khối chứa câu `q-ioe-l*` (harvested).
- AC-35.4: chấm điểm dùng `isExamAnswerCorrect` hiện có (text normalize).

## Impact
- Chỉ generator + quota trong examSession; không đụng DB/UI mới.
- Renderer `listening-fill-blank`/`listening-sentence-fill-blank` đã tồn
  tại trong ExamScreen (kế thừa nút Nghe/Nghe chậm của CR-32).
