# CR-58: Phân tích điểm yếu theo kỹ năng + gợi ý ôn luyện cá nhân hóa

> Ngày: 2026-10-04 - Loại: CR (requirement mới, business) - Trạng thái: Implemented

## 1. Requirement

Phụ huynh mua *chẩn đoán + lộ trình*, không mua ngân hàng câu hỏi. Sau khi
học sinh làm bài khoảng 1 tuần, app phải tự phân tích kỹ năng yếu và đề
xuất đúng bài ôn cho từng em - cá nhân hóa, không giống nhau giữa các
học sinh.

## 2. Hiện trạng và khoảng trống

- `stats.skills[gradeId][skillKey]` đã đếm correct/total - NHƯNG skillKey
  là bucket UI thô: mọi câu `mcq` (kể cả Toán, Khoa học, Listening,
  Reading) đều map về kind `grammar-mcq` -> key `grammar`. Không thể
  nói "em yếu phần nào" một cách chính xác.
- `qb_questions.skill` chứa skill chuẩn theo môn (`grammar-use-of-english`,
  `mathematical-reasoning`, `scientific-observation`...) và
  `fetch_questions` đã nhận `p_skill` - hạ tầng drill theo skill có sẵn,
  chỉ thiếu dữ liệu đầu vào chính xác.
- Stats theo ngày (`stats.days`) chỉ có tổng correct/total, không tách
  theo skill -> chưa có "điểm yếu 7 ngày gần nhất".
- ParentReport đã hiển thị skill yếu nhất trước, nhưng không có hành động
  nào cho học sinh (đề xuất ôn tập).

## 3. Thiết kế

### 3.1 Ghi skill chuẩn của bank

- `toExamQuestion` gắn `bankSkill = row.skill` vào `ExamQuestion`.
- Tại điểm ghi stats (`ExamScreen` credited `s{index}`), dùng
  `question.bankSkill ?? skillKeyFor(question)` - câu từ bank V6 ghi đúng
  skill chuẩn, câu generator cục bộ (vòng luyện tập) giữ bucket cũ.
- `SKILL_LABELS` bổ sung nhãn tiếng Việt cho toàn bộ qb skill values.
- `SKILL_SUBJECT`: qb skill -> program (english/math/science) để route
  drill đúng môn.

### 3.2 Cửa sổ 7 ngày

- `stats.skillDays[isoDate][gradeId][skillKey]` đếm correct/total theo
  ngày, cap 30 ngày (cùng cơ chế `stats.days`).
- `weakSkillsFor(gradeId)`: gộp 7 ngày gần nhất, yêu cầu >=3 câu đã làm
  mỗi skill, xếp accuracy tăng dần, lấy tối đa 3 skill yếu nhất.
  Fallback: dữ liệu tuần quá ít -> dùng cumulative `stats.skills`.

### 3.3 Card "Gợi ý cho em"

- `CoachCard` trên StartBatchScreen (sau DailyQuestCard): mỗi skill yếu
  một hàng - nhãn, accuracy bar, nút "Ôn ngay" -> drill `fetch_questions`
  với `p_skill` (skill qb) hoặc nhóm qb skills của bucket UI.
- Chỉ hiện khi có dữ liệu đủ tin cậy (>=1 skill vượt ngưỡng câu).

### 3.4 Drill theo skill

- `fetchBankQuestions` nhận opts `{skills?: string[]}` -> RPC
  `p_skill` (mở rộng thành `p_skills text[]` để bucket UI gộp nhiều qb
  skill - xem CR-59 cùng migration).
- ExamScreen nhận `focus?: {label}` hiển thị "Ôn: <kỹ năng>" trên intro.

## 4. Phạm vi / Ngoài phạm vi

- Trong: ghi skill chuẩn, cửa sổ 7 ngày, engine xếp điểm yếu, CoachCard,
  drill theo skill, nhãn skill đầy đủ.
- Ngoài: gợi ý form/đề nguyên bài (phase sau), email phụ huynh, AI
  recommendation - engine hiện tại là rule-based deterministic.

## 5. Verify

- Unit: `skillDays` cập nhật đúng + cap 30 ngày; `weakSkillsFor` xếp đúng,
  bỏ skill <3 câu, fallback cumulative.
- Unit: CoachCard render khi có weak skill, bấm Ôn ngay gọi đúng
  program+skill.
- Playwright: tài khoản có lịch sử sai tập trung -> thấy card gợi ý đúng
  kỹ năng, bấm ôn -> drill chỉ chứa câu skill đó.

## 6. Trạng thái triển khai (04/10/2026)

ĐÃ XONG - verified end-to-end trên dev server + DB thật.

- `bankSkill` trên ExamQuestion + ghi theo qb taxonomy (fix lỗi mọi MCQ
  đều tính vào bucket 'grammar').
- `stats.skillDays` (per-day per-skill counters, optional cho backward
  compat blob cũ) + merge/sanitize trong sync.
- Engine `weakSkillsFor`: cửa sổ 7 ngày, min 3 câu/trả lời, lọc skill
  >= 80% đúng (chỉ gợi ý chỗ thật sự yếu), fallback cumulative, top-3.
- CoachCard trên StartBatchScreen: label VN, thanh accuracy, nút Ôn ngay.
- Drill: `onStartExam(..., focus)` -> `fetch_questions`/`_public` với
  `p_skills` - Playwright xác nhận payload
  `{"p_skills":["grammar-use-of-english"]}` và câu serve đúng skill.
- 10 unit tests coach + 941/941 suite xanh, tsc sạch.
- Marketing: landing + proposal + one-pager đã thêm copy cá nhân hóa.
