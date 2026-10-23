# External Review - Round 109 (codex)

Reviewer: codex (real external run). Scope: commit 507caf1, HEAD=507caf1.

1. [severity major] src/components/ExamScreen.tsx:840 - Exam/assignment scoring still calls `scoreAndHydrate` with its default `honorTaught=true`. A server-returned `taught:true` sets `bankTaught`, excluding the question from the graded denominator. Submission cannot repair this because resolved verdicts bypass hydration. - Default `honorTaught` to `false` and explicitly enable it only for `mode === 'practice'` at every call site.

