# CR-25 - Unified practice: drill mode for all programs + bank expansion

## Why (user feedback 2026-10-01)
1. Math-English and Science had exam only, no practice path.
2. The IOE-style question kinds cloned in CR-24 (word-order,
   odd-pronunciation, missing-letter, grammar-mcq, true-false) appeared in
   the mock exam but NOT in practice - "ôn 1 đằng làm 1 nẻo".

## Scope
- `ExamScreen` gains `mode: 'exam' | 'practice'`:
  - practice = 20 questions, sequential, no countdown, immediate verdict
    (correct/wrong + correct answer + explanation + IPA + SFX), progress
    bar, summary screen. Same pool builders as exam.
- StartBatchScreen: each program (English/Math/Science) gets
  "Luyen de" (practice drill) + "Thi thu" (200q/30min). English keeps the
  4-round game batch on top.
- Expand math + science pools toward the 200-question exam floor.

## Impact
- App.tsx: onStartExam(programId, mode).
- No changes to the 4-round batch engine or existing Question union.
- Reuses examSession for both modes; verdict uses isExamAnswerCorrect.

## Implementation status (2026-10-01)

Shipped:
- `ExamScreen mode='practice'`: 20-question sequential drill, no countdown,
  no strip; instant verdict panel (verdict + correct answer + VN
  explanation + SFX) and "Câu tiếp theo"; KẾT THÚC ends early. Header shows
  "Luyện đề - <program> - <grade>" + "Câu X/20".
- StartBatchScreen: per-program cards (Tiếng Anh / Toán tiếng Anh /
  Khoa học) each with "Luyện đề - 20 câu" + "Thi thử - 200 câu". The 4-round
  game batch stays as English's main practice.
- Math pool: added families G (before/after) + H (double/half/ten-more),
  raised family counts and deduped identical prompts -> 215-286 questions
  per grade.
- Science pool: added SCIENCE_CLASSES (authored classification lists per
  band) generating "Which one is a X?", "Which is NOT a X?", True/False
  membership and fill-in items -> 217-240 questions per grade.
- Fixed a real UX bug: WordOrderView tile taps used a stale `picked`
  closure - rapid taps dropped tiles. Now a functional setState.

Verified: pool check shows >=213 questions for all 15 program+grade combos
(was 174/56). vitest suites green, tsc + build green, Playwright
walkthrough: guest -> Lớp 4 -> drill-english (verdict + explanation +
IPA) and drill-science (correct verdict path).
