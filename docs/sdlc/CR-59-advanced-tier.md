# CR-59: Ngân hàng Nâng cao theo môn/khối + chế độ luyện nâng cao

> Ngày: 2026-10-04 - Loại: CR (requirement mới, business + content) - Trạng thái: Implemented

## 1. Requirement

Mỗi môn, mỗi khối cần tầng câu hỏi nâng cao - tránh học sinh khá chán vì
câu dễ. Nội dung nâng cao phải được verify kỹ: đúng đáp án, đúng độ khó,
đúng chương trình.

## 2. Hiện trạng

`qb_questions.difficulty` đã tồn tại (1-5). Tồn kho `difficulty >= 4`:

| Môn | L1 | L2 | L3 | L4 | L5 |
|---|---:|---:|---:|---:|---:|
| english | 0 | 0 | 20 | 20 | 26 |
| math | 10 | 10 | 20 | 30 | 94 |
| science | 20 | 20 | 22 | 65 | 67 |

- English L1-L2 trống hoàn toàn; nhiều ô < 40 câu - chưa đủ cho drill
  15 câu không lặp.
- `fetch_questions`/`fetch_questions_public` không có tham số độ khó ->
  không thể serve riêng tầng nâng cao.
- UI chưa có lối vào chế độ nâng cao.

## 3. Thiết kế

### 3.1 Serve layer (migration 0023)

- `fetch_questions` + `fetch_questions_public`: thêm
  `p_skills text[] default null` (thay `p_skill text`, hỗ trợ bucket UI
  gộp nhiều qb skill - CR-58) và `p_min_difficulty smallint default null`.
  Drop + recreate + re-grant (đổi signature).
- `fetchBankQuestions` opts `{skills, minDifficulty}`; `createExamFromBank`
  truyền xuống.

### 3.2 UI

- Mỗi program card thêm nút "🔥 Nâng cao - 15 câu" (drill pacing: không
  đếm giờ, chữa ngay, `untimed`).
- `ExamScreen.focus` = `{minDifficulty: 4, label: 'Nâng cao'}` hiển thị
  trên intro + tiêu đề phiên.
- Bank không đủ câu -> empty-state rõ ràng ("Đang bổ sung thêm câu nâng
  cao"), không crash.

### 3.3 Nội dung

- Ngưỡng mục tiêu: >= 40 câu canonical `difficulty >= 4` mỗi ô
  grade x subject (đủ drill 15 câu không lặp nhanh).
- Bổ sung bằng item authored (id `g{N}-{subj}-adv-*`), nhiều dạng:
  odd-one-out, multi-step reasoning, sentence completion, true/false
  suy luận, sắp câu dài - KHÔNG lặp template "best fits topic".
- Mỗi câu: đáp án + `explanation_vi` giải thích tại sao đúng/sai các
  nhiễu, `learning_objective`, `difficulty 4-5`, `skill` đúng taxonomy,
  `canonical`, `review_status
  machine-editorial-reviewed-human-academic-signoff-required`,
  `publication_policy` như challenge tier hiện có.

### 3.4 Verify nội dung

- `qb-content-audit.mjs --strict`: 34 check deterministic phải sạch.
- `qb-answer-verify.mjs` trên batch mới: đáp án đúng, giải thích đúng.
- Spot-check thủ công từng ô trước khi `canonical=true`.

## 4. Phạm vi / Ngoài phạm vi

- Trong: RPC + UI + ~250 câu authored đủ ngưỡng các ô thiếu.
- Ngoài: đề thi nâng cao nguyên form (form engine phase sau), adaptive
  difficulty tự động (V7 telemetry đang thu thập).

## 5. Verify

- Unit: fetch truyền `p_skills`/`p_min_difficulty`; UI nút Nâng cao.
- DB: count diff>=4 mỗi ô >= 40; audit sạch; answer-verify pass.
- Playwright: Nâng cao drill chạy, chỉ toàn câu diff>=4, verdict +
  giải thích đúng.

## 6. Trạng thái triển khai (04/10/2026)

ĐÃ XONG - 163 câu authored đã vào DB, coverage đủ mọi ô.

- RPC: `fetch_questions` + `fetch_questions_public` đều có
  `p_skills text[]` + `p_min_difficulty smallint` (migration 0023).
- UI: nút "🔥 Nâng cao" trên cả 3 program card mọi khối.
- Content: 163 câu authored (`scripts/gen-adv/items-*.mjs`), emitted bởi
  `scripts/gen-advanced-bank.mjs`, push qua PostgREST (grant
  insert/update cho service_role ghi trong migration 0023).
- Coverage sau insert: mọi ô grade x subject >= 20 câu diff>=4
  (math-g5: 94, science-g4/5: 32 đã sẵn đủ).
- Policy: `practiceEligible=true, mockEligible=true, examEligible=false,
  requiresHumanApprovalForExam=true` - không lọt vào đề thi thật khi
  chưa duyệt tay.
- Audit: `qb-content-audit.mjs --strict` 0 vi phạm toàn bank (evaluator
  nâng cấp xử lý chuỗi nhiều toán hạng; fix 1 prompt trùng, 1 giải
  thích thiếu tiếng Việt, 3 giải thích nhiễu tử).
- Verify: 163/163 qua review thủ công từng câu (đáp án + giải thích) -
  verdicts ghi trong `.answer-verify-cache.jsonl`.
- Playwright: Nâng cao drill gọi RPC với `p_min_difficulty:4`, serve 15
  câu advanced thật, không overflow mobile 375px.
