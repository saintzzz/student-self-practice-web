# External Review - Round 117 (codex)

Reviewer: codex (real external run). Scope: commit 51e5313, HEAD=51e5313.

1. [major] supabase/migrations/0058_audit_guest_actor_backfill.sql:24 - Matches every guest actor, including opaque actors already written by 0057; these are hashed again, breaking attribution against their issued watermarks. Fix: target legacy rows using `ip_hash` and actor format, preserving existing opaque actors and `guest:unknown`.

2. [minor] supabase/migrations/0058_audit_guest_actor_backfill.sql:14 - Legacy verification instructions require recovering a source IP from its SHA-256 hash. That is not a viable general recovery procedure, especially for IPv6; deleting the raw actor loses the required signing input. Fix: explicitly document that limitation or implement an approved legacy verification mechanism before backfilling.

