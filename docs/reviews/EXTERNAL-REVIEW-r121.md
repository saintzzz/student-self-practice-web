# External Review - Round 121 (codex)

Reviewer: codex (real external run). Scope: commit 14301a4, HEAD=14301a4.

1. [minor] tests/audit-actor-restore.sql:12 - Fixture tests a copied CASE function, never the actual migration UPDATE or 0058 → 0061 replay; predicate errors and migration drift can pass. - Execute migration files against an isolated fixture table, assert expected actors and unchanged authenticated actors, then rerun 0061 and assert identical results.

