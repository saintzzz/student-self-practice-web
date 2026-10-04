# CR-51: Reading passages dropped in V6 import + lazy template explanations

## Reported
Screenshot: G5 cloze "My brother likes ___." -> explanation
"Đáp án phù hợp với ngữ cảnh của Unit 4: playing sports." - lặp lại đáp
án, không giải thích tại sao (likes + V-ing). User: "cực kỳ ngớ ngẩn".

## Investigation findings

### F1 - passage dropped (352 questions, P0 content bug)
- Source `questions-v6.jsonl` carries `passage` on 352 rows
  (mcq english 242, true-false english 60, true-false science 50).
- `schema-v6.sql` has no `passage` column; import dropped the field.
- DB rows prompt "Read the passage..." but no passage anywhere:
  `transcript` is NULL on all 194 "passage" prompts; `true-false`
  adapter mapped transcript (NULL) into `passage` -> empty string.
- Impact: reading-comprehension questions are unanswerable - students
  guess. MCQ reading questions show no passage at all
  (GrammarMcqQuestion has no passage field).

### F2 - lazy template explanations (~934 rows)
Source `build_v6.py` generated placeholder explanations that repeat the
answer or give no reason:
- "Đáp án phù hợp với ngữ cảnh của Unit X: <answer>" (180) - worst:
  grammar cloze explained as "context" when the real rule is grammar.
- "Chọn câu phù hợp nhất với chủ đề của Unit." (~330 mcq)
- "Chọn câu trả lời phù hợp với tình huống giao tiếp." (60)
- "Thông tin này xuất hiện trong đoạn đọc." /
  "Câu đúng được nêu trực tiếp trong đoạn đọc." (120, thin)
- "Sắp xếp các từ..." (84 reorder), "Quan sát sơ đồ..." (60 science
  visual-mcq), "Thông tin phù hợp với kiến thức khoa học" (50 science
  true-false), "Nội dung nghe trùng..." (30), speaking/constructed (110,
  not auto-served anyway).

## Scope

1. Migration: `qb_questions.passage text` + backfill 352 rows from
   source JSONL (id -> passage).
2. Adapter: `QbRow.passage`; `true-false` uses passage (fallback
   transcript); GrammarMcqQuestion gains optional `passage` rendered
   above prompt in exam screen.
3. Explanation rewrite pass: LLM (Gemini via env, local script only,
   never shipped to client) rewrites lazy explanations to kid-VN,
   1-2 sentences, explain WHY correct. Verified by spot checks + SQL.
4. Regression gates: tsc, tests, build, Playwright on a real
   "Read the passage" item.

## Out of scope
- speaking-prompt / constructed-response are not auto-served; their
  explanations still get rewritten for the review queue.
- Source JSONL on Desktop is upstream artifact; DB is canonical. The
  fix notes the drift so future regenerations keep the column.
