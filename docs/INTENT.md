# Intent: Sân khấu lớp defect batch
Author: kazu (product owner). Status: bug report -> defect fix.
Intake class: defect batch on shipped feature (no requirement change).

## Problem (user's own words)
"phần Sân khấu lớp:
- lỗi đáp án đúng
- hiển thị lỗi: hiển thị không đầy đủ, tràn màn hình, overlapse...
- nói chung rất nhiều lỗi"

## Reproduction evidence (Playwright, local dev, 2026-11-14)
- `_shots/classshow-qa/` - setup/question/revealed/scoreboard states.
- 30-student roster -> page height 2242px at question phase (1440x900
  projector) - question + teacher controls pushed off-screen.
- Bundled fallback questions highlight correctly; fabricated answers
  traced to unkeyed bank rows (see CR-142 D1).
