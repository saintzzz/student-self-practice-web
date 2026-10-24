# External Review - Round 118 (codex)

Reviewer: codex (real external run). Scope: commit 830e162, HEAD=830e162.

1. [severity major] supabase/migrations/0059_audit_backfill_scope_fix.sql:28 - Migration 0058 already hashes every guest actor, including 0057 opaque actors and `guest:unknown`. Those corrupted values match the hex-16 exclusion, so 0059 preserves the corruption; sequential replay remains broken. Fix by restoring guest actors from stored `ip_hash` (`guest:` + first 16 characters, or `guest:unknown` when null). Add a behavioral test running 0058 → 0059 against opaque, unknown, and legacy fixtures; the current regex test misses this.

