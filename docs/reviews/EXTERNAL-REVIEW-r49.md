# External Review - Round 49 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit e4e8a95, HEAD=e4e8a95.

1. [severity major] src/lib/rounds/pronunciationScoring.ts:398 - The homophone floor uses the best individual token match. Target “red apple”, transcript “red” gets phoneme similarity 1 and a score of at least 95, accepting an incomplete phrase. - Compare complete phoneme sequences and require coverage of all target tokens before applying the floor.

2. [severity major] supabase/functions/practice-transcribe/index.ts:395 - Assessment attempts share the transcription deadline and can exhaust it before fallback starts. Provider timeouts therefore prevent the promised plain-transcription fallback; production now defaults to this path. - Reserve time for transcription and cap assessment attempts against the remaining budget.

3. [severity minor] scripts/_pron-assess-eval.mjs:27 - Evaluation uses threshold 70 while production requires 85, so its confusion matrix cannot validate deployed behavior. - Use the production threshold and consistent corpus labels, then regenerate the results.

Review limited to the supplied diff; workspace reads were blocked by execution policy.

