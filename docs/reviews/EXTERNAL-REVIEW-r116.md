# External Review - Round 116 (codex)

Reviewer: codex (real external run). Scope: commit 3c9fbba, HEAD=3c9fbba.

1. [severity minor] supabase/migrations/0057_leak_wm_actor_opacity.sql:54 - Only future audit entries get opaque actors; existing `qb_fetch_audit.actor` values from 0056 retain raw guest IPs indefinitely - add a targeted backfill to pseudonymize historical guest actors, explicitly handling legacy watermark verification.

