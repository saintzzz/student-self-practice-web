# External Review - Round 60 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit 7c1f021, HEAD=7c1f021.

1. [severity major] src/lib/rounds/pronunciationScoring.ts:455 - A matching alternative overrides the provider’s audio-based accuracy without evidence that pronunciation was correct. Target “hen”, spoken “pen”, accuracy 60, alternatives containing “hen” now passes at 85. The target-aware grader can list the expected word simply because the audio is ambiguous; the existing test assumes this proves a mishear. - Require independent acoustic confirmation before promoting a failed assessment; otherwise preserve the score and offer a retry.

Review limited to the supplied diff: local file access was blocked; tests and deployed UI were not verified.

