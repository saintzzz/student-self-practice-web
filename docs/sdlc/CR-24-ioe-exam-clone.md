# CR-24: IOE-style exam mode, new question types, subject programs, IPA

## Request (user)

"hãy clone y như IOE" + 5 requirements:
1. Tự luyện hiện tại khác thi thật - cần chế độ thi thật 200 câu / 30 phút.
2. Bổ sung dạng đề IOE: sắp xếp lại câu, tìm từ phát âm khác, và các
   dạng khác (deep research).
3. Thêm 2 chương trình riêng: Toán tiếng Anh và Khoa học (không phải
   topic của chương trình tiếng Anh).
4. Sửa câu hình tượng hình không nhận biết được (camera -> "vlog").
5. Hiển thị phiên âm IPA + sửa câu đọc sai ("full moon" nghe thành
   "phom mơ").

## IOE field research (authenticated account, 2026-10-01)

Site structure: ioe.vn -> /trang-chu, /hoc-sinh/tu-luyen,
/hoc-sinh/thi-thu, leaderboard, My IOE account menu.

### Tự luyện page
- Weekly rounds: "Vòng Tự luyện 1-35", each opens on a fixed date
  (15/08/2026 ... 03/05/2027), status Hoàn thành / Chưa mở.
- Each round: 4 mandatory tests ("Bài thi số 1-4") + 1 optional speaking
  test using AI speech recognition ("Bài số 5").
- Result table per test: Lần thi / Điểm (max 100) / Thời gian / Trạng
  thái / Hành động; totals row + "Kết quả cao nhất" row.
- Actions: Làm lại, Ghi lại kết quả, Lịch sử tự luyện, Xem bảng xếp
  hạng, Hướng dẫn.

### Thi thử page
- 4 exam levels: Cấp Trường, Cấp Phường/Xã, Cấp Tỉnh/Thành, Cấp Quốc
  gia; each shows "Kết quả gần nhất / Kết quả cao nhất / Vào thi ngay /
  Xem kết quả bài thi gần nhất / Xem lịch sử làm bài".
- Sidebar: Top 10 nationwide leaderboard (điểm + thời gian làm bài).
- Grade selector ("Khối lớp 4").

### Exam player (thi-thu-web, fullscreen game shell)
- Enters via token URL /lam-bai/thi-thu-web/?...&level=4&round=3.
- "Học sinh KHÔNG thoát khỏi chế độ toàn màn hình" warning -> "Bắt đầu
  làm bài".
- Visual: dark chalkboard (near-black navy) inside a wooden picture
  frame; pixel-style numerals; IOE logo top-left; title top-center
  ("Thi thử cấp Tỉnh/Thành phố, năm học 2026 - 2027"); alarm-clock
  countdown "30:00" counting down; student name + ID top-right; blue
  SUBMIT button top-right.
- Question strip: numbered yellow buttons 1-10 + prev/next part arrows
  + fullscreen toggle. Current question button turns orange/red.
- Content per question observed (Khối 4, Cấp Tỉnh, round 3):
  - Q1: Reading True/False - short passage + statement, two image
    buttons.
  - Q2: Listening MCQ - "Where does he live?" + replay button + 4
    IMAGE options (street-sign pictures, zoomable).
  - Q3: Math-in-English fill-in - "Five times nine minus ___ equals
    thirty-four." (free text input, maxlength 6).
  - Q4: Grammar MCQ - "Lien ___ lunch at 11:30." (have got/have/eat/
    has).
  - Q5: Fill-in-word - "It's time ___ breakfast." + ANSWER button.
  - Q6: Listening MCQ - "What time does Lan go to bed?" + 4 clock-face
    image options.
  - Q7: MCQ - "Santa Claus wears ___ clothes." (red and white/...).
  - Q8: Sentence rearrange as MCQ - prompt shows scrambled chunks
    "she / live / 10 Nguyen Hue / Street /?/" and 4 candidate ordered
    sentences.
  - Q9: Missing letters - "There are two big ___dows in our
    classrooms." (fill "win").
  - Q10: Grammar MCQ - "Her uncle is a pilot. ___ is very busy."
    (It/They/She/He).
- Exam assets loaded per-question from CDN (ExamData/.../*.jpg,
  *Audio-NN.mp3).

## Scope

In scope:
- New "Thi thử" mode: 200 questions / 30:00 countdown, question
  navigator strip (numbered buttons, jump-to-question, current-question
  highlight), per-question answering without per-question verdict,
  SUBMIT + auto-submit on timeout, result screen (điểm, số câu đúng,
  thời gian, review đáp án). Distinct from tự luyện (untimed-ish
  rounds with per-question feedback).
- Programs: english (hiện có), math-english, science - program picker
  trên màn chọn lớp; mỗi program có bank câu hỏi riêng theo khối.
- New question kinds (types + generators + renderers + submit paths):
  - `word-order` (sắp xếp câu - tap tiles into slots).
  - `odd-one-out-pronunciation` (tìm từ phát âm khác - MCQ 4 words).
  - `missing-letter` (điền chữ còn thiếu trong từ - type missing run).
  - `true-false-reading` (đoạn ngắn + nhận định -> Đúng/Sai).
  - `grammar-mcq` (câu hỏi ngữ pháp 4 lựa chọn - authored bank).
- Math/English program: deterministic generators (arithmetic in words,
  number reading, comparisons, shapes/time) + authored facts.
- Science program: authored MCQ/fill bank per grade band.
- IPA: generated `ipa` map for the whole bank (script + vendored map),
  rendered next to the word in question + feedback UI.
- Image-question semantic guard: exclude figurative-emoji words (vlog
  📹 etc.) from image-choice/describe-image generation via a curated
  blocklist + regression test.
- Audio: extend gen-audio-texts to cover new phrases/sentences; verify
  "full moon" and other flagged items render correctly.

Out of scope (this CR):
- Pixel-perfect clone of IOE's public site / account pages; exam UI is
  IOE-inspired (chalkboard + question strip + countdown) under VieSchool
  branding.
- Server-side exam sessions/anti-cheat, leaderboard backend.

## Risks
- 200-question exam requires >= 200 unique questions per grade+program
  combination -> generators must cover all grades (g1-g5) or exam count
  scales down per grade with a documented floor.
- IPA map correctness: generated by script (dictionary), spot-checked,
  not hand-verified per word.
- Math word-problem generation must stay grammatically correct and
  solvable (fixed templates, integer answers only).

## Implementation status (2026-10-01)

Shipped:
- `src/types/exam.ts`: ExamOnlyQuestion union (word-order, odd-pronunciation,
  missing-letter, true-false-reading, grammar-mcq, text-answer) +
  ExamProgramId ('english' | 'math' | 'science').
- Generators: `exam/wordOrder.ts`, `exam/oddPronunciation.ts`,
  `exam/missingLetter.ts`, `exam/englishGenerators.ts` (authored
  grammarBank + readingBank wrappers), `exam/mathEnglish.ts`,
  `exam/scienceQuestions.ts` (authored scienceBank).
- `exam/examSession.ts`: 200-question / 30-minute session engine, answer
  recording, jump/revisit, auto-submit on deadline, scoring (10 pts/correct),
  full review list.
- `components/ExamScreen.tsx`: IOE-style chalkboard + wood frame, numbered
  strip (10/page, prev/next), countdown header, NỘP BÀI, intro + result +
  review screens. Wired via StartBatchScreen program cards.
- `lib/content/imageSemantics.ts`: figurative-emoji blocklist applied to all
  image-driven generators (image-choice, listening-image-choice,
  describe-and-choose-image, counting-image, picture-pair-matching).
  `vlog` 📹 and similar abstractions excluded from image prompts.
- `data/ipaMap.ts`: 1,141-word IPA map generated by `scripts/gen-ipa.py`
  (eng-to-ipa/CMUdict). Rendered in exam (odd-pronunciation options,
  missing-letter prompt) and in FeedbackPanel next to the correct word.

Verified: vitest 749/749 (incl. new examSession + examGenerators +
imageSemantics suites), tsc clean, vite build green, Playwright walkthrough
on :5199 (guest -> Lớp 4 -> exam intro -> timer/strip/answer/jump/submit/
result/review) for all three programs.

Known floor: math pool for grade-4 produced 174 (<200) questions; exam caps
at pool size. Science bank similar. Expand banks to reach a true 200.
