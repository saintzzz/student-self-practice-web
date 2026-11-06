# External Review - Round 175 (codex)

Reviewer: codex (real external run). Scope: commit 39c8d0e, HEAD=39c8d0e.

1. [major] `supabase/migrations/0043_assignments.sql:239` - Assignment creation and retakes map `math-vi` to the English bank, so a Vietnamese math assignment can contain English questions despite being labeled “Toán.” Add an explicit `math-vi` subject mapping in both assignment form minting paths.

2. [major] `src/lib/exam/examSession.ts:295` - The `math-vi` bundled fallback generates English math questions under the Vietnamese “Toán” label. Replace it with a Vietnamese fallback or make this track unavailable in paths that require bundled questions.

