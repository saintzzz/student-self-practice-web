# External Review - Round 89 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: base f330886, HEAD=ce5d715.

1. [major] src/components/ExamScreen.tsx:628 - Result-screen exit remains available while submission is pending or failed; leaving discards the only saved answer payload, so a network failure can lose the completed assignment. Persist pending submissions across navigation/reload and clear them only after acknowledgment.

2. [major] supabase/migrations/0010_class_join_code.sql:10 - Adding `SECURITY DEFINER` to an already-applied migration will not update deployed databases. Teacher class creation can still fail when join-code generation accesses classes under RLS; the smoke script bypasses this by provisioning classes as service role. Apply the function change in a new migration and verify teacher-created classes.

3. [major] src/lib/qb/bank.ts:440 - Assignment loading silently drops questions that `toExamQuestion` cannot map. The student can finish the shortened exam, but `assignment_submit` requires the complete form ID set and permanently rejects it as `bad-answers`. Validate renderability before minting forms and fail loading explicitly if any assigned question cannot render.

4. [minor] src/components/AdminScreen.tsx:759 - Assignment selects and deadline inputs lack accessible labels; the deadline fields also have no visible explanation. Add associated labels identifying class, grade, program, question count, and each deadline.

Review limited to the supplied diff; local inspection was blocked by execution policy.

