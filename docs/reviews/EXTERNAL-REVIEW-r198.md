# External Review - Round 198 (codex)

Reviewer: codex (real external run). Scope: commit 9788b3d, HEAD=9788b3d.

1. [major] [src/lib/classshow.ts](/Users/kazu.nx/devin_app/student-self-practice-web/src/lib/classshow.ts:52) - `odd-pronunciation` checks only that `correctIndex` is a number, so `NaN`, fractional, and out-of-range keys reach the stage without highlighting a correct option. Apply the same integer-and-bounds check used for grammar MCQs.

2. [major] [src/lib/classshow.ts](/Users/kazu.nx/devin_app/student-self-practice-web/src/lib/classshow.ts:84) - The default MCQ branch also lets `NaN` and fractional `correctIndex` values through; neither compares outside the bounds, but neither can identify a valid option. Require an integer index in `[0, options.length)`.

3. [minor] [docs/INTENT.md](/Users/kazu.nx/devin_app/student-self-practice-web/docs/INTENT.md:1) - This defect fix replaces the existing approved GTM intent document wholesale, removing its scope, constraints, and open questions. Restore that document and record CR-142 separately.

