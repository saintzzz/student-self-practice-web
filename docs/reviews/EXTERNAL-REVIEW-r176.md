# External Review - Round 176 (codex)

Reviewer: codex (real external run). Scope: commit 1400c34, HEAD=1400c34.

1. [major] `src/lib/exam/examSession.ts:297` - `math-vi` now returns an empty pool, but `createExam` accepts that pool and creates a zero-question session. Any offline or arena path that reaches it can leave the student with no questions and no useful recovery. Make those paths unavailable with a clear message, or provide a Vietnamese fallback.

