# External Review - Round 168 (codex)

Reviewer: codex (real external run). Scope: commit 28137b1, HEAD=28137b1.

1. [major] [src/lib/qb/bank.ts](/Users/kazu.nx/devin_app/student-self-practice-web/src/lib/qb/bank.ts:458) - IOE starts with the normal flat bank fetch before entering the sectioned branch, then fetches each of the four sections separately. That adds a redundant request (up to 250 questions for higher rounds), consumes rate limits, and can prevent the IOE paper from loading if the unused request fails. Branch on the IOE round before the flat fetch.

2. [minor] [src/components/ExamResult.tsx](/Users/kazu.nx/devin_app/student-self-practice-web/src/components/ExamResult.tsx:188) - Rounding the percentage before applying award thresholds can grant a tier below its stated cutoff (for example, 89.5% rounds to 90%). Compare the unrounded ratio to each threshold.

3. [minor] [src/components/StartBatchScreen.tsx](/Users/kazu.nx/devin_app/student-self-practice-web/src/components/StartBatchScreen.tsx:119) - The expandable IOE picker button omits `aria-expanded` and `aria-controls`, so assistive technology does not get its open state or associated panel. Add both attributes and an ID for the round group.

