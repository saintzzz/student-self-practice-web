# External Review - Round 122 (codex)

Reviewer: codex (real external run). Scope: commit 7aa6b4a, HEAD=7aa6b4a.

1. [minor] tests/audit-actor-restore.sql:96 - Running 0061 twice and asserting only the final state does not prove idempotency; first-pass corruption repaired by the second pass passes. - Snapshot actors after the first run, compare after the second using `IS DISTINCT FROM`, and assert expected values after both.

2. [minor] tests/audit-actor-restore.sql:81 - Full-chain replay removes every input exercising 0061’s corrupted-unknown and raw-IP/null-hash branches; replacing the old fixture loses that coverage. - Add isolated 0061 cases for those states, mismatched hashes, and opaque/null-hash preservation alongside the chain replay.

