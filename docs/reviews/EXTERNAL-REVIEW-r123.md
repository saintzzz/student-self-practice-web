# External Review - Round 123 (codex)

Reviewer: codex (real external run). Scope: commit 334f1d6, HEAD=334f1d6.

1. [minor] tests/audit-actor-restore.sql:186 - Isolated cases run 0061 only once, so idempotency remains untested for raw-IP/null-hash and mismatched-hash inputs—the states that exposed the original regression. Chain replay normalizes these before its two-pass check. - Snapshot isolated results after pass 1, run 0061 again, and assert equality using `IS DISTINCT FROM`.

