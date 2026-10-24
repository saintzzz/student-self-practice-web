# External Review - Round 120 (codex)

Reviewer: codex (real external run). Scope: commit 3d48d06, HEAD=3d48d06.

1. [major] tests/audit-actor-restore.sql:18 - Raw-IP fixture contradicts the claimed idempotency: pass 1 produces `guest:fec52565aa0cf18f`; pass 2 produces `guest:aabbccddeeff0011` from its mismatched `ip_hash`. Fix the fixture’s hash to match its IP, and explicitly test mismatched hashes against a defined repair policy.

2. [major] tests/audit-actor-restore.sql:24 - This query only prints results; it asserts no expected values and never executes the claimed second pass. Regressions still exit successfully, leaving r119’s behavioral verification gap unresolved. Add explicit expected outputs, run the transformation twice, and raise an error on output or idempotency mismatches.

