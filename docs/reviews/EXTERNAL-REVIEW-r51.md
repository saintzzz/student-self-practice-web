# External Review - Round 51 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit a142ce4, HEAD=e3cabaa.

1. [severity major] src/lib/rounds/pronunciationScoring.ts:340 - Token coverage ignores order, repetition, and extra words. “apple red” for “red apple” or “know” for “no no” passes the homophone floor and receives at least 95 at default confidence. - Compare complete ordered phoneme sequences, preserving token multiplicity and rejecting unmatched words.

Review limited to supplied diff; workspace reads were blocked by execution policy.

