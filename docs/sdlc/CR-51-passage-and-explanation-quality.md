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

### F3 - listening items with no transcript (105 rows, added post-report)
- v4/v4b generator produced "Listen and choose..." prompts with
  `transcript: null` and no `audioIds` - rendered as a listen prompt
  with no listen button. Unanswerable without guessing.
- Recovery: spoken text recoverable from source for 99/105 rows -
  `Người nói: "..."` and `Listen: "..."` quotes in explanationVi /
  promptText, `Từ được nghe là "..."`, `Người nói nêu môn X` rebuilt as
  "<Name> has <subj> on <day>.", 2 plan-to-drink items.
- Backfilled `qb_questions.transcript` (99 rows). Adapter already maps
  transcript -> ListenButton, so no code change needed.
- 6 remaining "orphans" are false positives (word "listen" inside a
  non-listening prompt) - correctly have no transcript.

### F4 - image questions with translation-only explanations (2,924 rows)
- All `word-to-image-mcq` + `image-to-word-mcq` rows explained only the
  translation ("Nước Hungary tiếng Anh là \"Hungary\".") - useless for
  "which picture is correct". Reported via user screenshot
  (Hungary flag item).
- New `explain-visual` command in `scripts/v6-content-fix.mjs`: visual-
  specific prompt (word meaning + how to spot the right picture -
  flag colours, object shape, distractor contrast). Idempotent via the
  quoted-word lazy shape; 2,924 rows rewritten over 2 passes
  (2,329 + 143 retries for model-dropped ids).
- Example: Hungary item now reads "...tìm hình lá cờ gồm ba sọc ngang
  đỏ, trắng và xanh lá cây..." - teaches the flag, not just the word.
- service_role UPDATE/SELECT grant revoked after backfill (verified 403).

### F5 - accented/exotic names + non-sovereign flag questions
- Generator used a full world-flags list: accented spellings shown to
  kids ("Which picture shows: piñata?", "Türkiye", "Curaçao") plus ~40
  non-sovereign territories as CORRECT answers (Aland, Jersey,
  Guernsey, Greenland, Hong Kong, Taiwan, Palestine, Antarctica...) -
  neither curriculum vocabulary nor real countries. Reported via user
  screenshot (pinata item).
- `scripts/v6-flag-fix.mjs` (ops-only): normalized accented ->
  standard English in prompt_text/choices/explanation_vi/
  learning_objective (pinata, Turkey, Curacao, Reunion, Aland,
  Saint Barthelemy, Sao Tome and Principe) - 40 rows renamed.
- Set practiceEligible=false on 93 rows whose correct answer or
  prompted term is a non-sovereign territory (word-to-image,
  image-to-word, img-true-false, and a few listen/phonics items that
  leaked into flag sets). Territories remain acceptable as
  distractors inside surviving rows.
- Sovereign but oddly-named kept as-is (America, Bosnia); UK
  constituent flags (England/Scotland/Wales/Britain) kept - common in
  ESL flag sets.
- Verified: 0 accented names left in served prompts/choices;
  service_role grant revoked.

### F6 - repeatable content audit + proactive sweep (user escalation)
- Root process gap: fixes were reactive per-screenshot, verified only
  inside the agent session. Added `scripts/qb-content-audit.mjs` -
  17 contract checks over all 11,406 rows, emits
  `docs/qa/content-audit.md`, `--strict` exits non-zero on P0 for CI.
- First-run findings and fixes:
  - `option-placeholder` P0: 32 rows had literal "option-4" choice
    (distractor never generated) - dropped fake choice + re-indexed
    answer (3-option MCQs).
  - `choices-too-few` P0: 5 listen items had only 2 sentences (coin-flip
    guessing) - appended plausible 3rd distractor per unit theme.
  - `explanation-not-vietnamese`/`too-short` P1: 5,687 rows were bare
    English restatements ("4 + 6 = 10.") - LLM rewrite pass
    (`explain-thin` in v6-content-fix.mjs) to kid-VN explanations
    covering method, not just result.
  - `dup-prompt-same-grade` P2: 910 rows in 307 identical groups lacked
    `variant_group_id` - same question could appear twice in one exam.
    Assigned shared `dupgrp-*` ids so fetch_questions dedups them.
  - `ambiguous-country-name` P2: flag assets verified visually -
    Congo image is Republic of the Congo (diagonal), Korea is South
    Korea, Guinea is Guinea-Conakry (correct as-is). Renamed
    Bosnia -> Bosnia and Herzegovina, Congo -> the Republic of the
    Congo, Korea -> South Korea, America -> the USA (38 rows incl.
    word-image prompts + phonics/spell items, still valid).
- Audit false positives fixed in-script: numeric choices decoded to '',
  speaking-prompt matched listen regex, explanation quoting wrong
  answers intentionally is valid pedagogy.
- Result: **all 10 P0 checks = 0**, P2 = 0. Remaining P1 is the thin-
  explanation backlog: ~4,200/5,687 rewritten before Gemini daily
  quota exhausted (3 models, both keys). Audit tracks the rest
  (`explanation-not-vietnamese` ~1,513 + `explanation-too-short`
  ~446); finish with
  `AI_MODEL=gemini-3.5-flash BATCH_DELAY_MS=6000 node scripts/v6-content-fix.mjs explain-thin`
  after quota reset. Ops scripts persisted: `v6-quick-fix.mjs`,
  `v6-dedup-variants.mjs`, `v6-flag-fix.mjs`.

## Out of scope
- speaking-prompt / constructed-response are not auto-served; their
  explanations still get rewritten for the review queue.
- Source JSONL on Desktop is upstream artifact; DB is canonical. The
  fix notes the drift so future regenerations keep the column.
