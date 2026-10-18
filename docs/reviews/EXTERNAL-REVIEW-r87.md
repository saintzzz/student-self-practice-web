# External Review - Round 87 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit 7f46b68, HEAD=7f46b68.

1. [major] supabase/functions/practice-transcribe/index.ts:375 - Config RPC and JSON parsing now start before the rate-limit check, so rejected requests still consume database work and parse potentially large audio payloads. This weakens overload protection. - Fix: await `rateLimited()` before starting either operation.

Review limited to supplied diff; local file access was blocked by execution policy.

## Triage

1. **Fixed** in `6b7876e` + edge v18 - `rateLimited()` again runs before any
   spawned work; `get_ai_configs` + body parse still overlap each other but
   only after the limiter passes (one RTT saved on the legit path, zero extra
   burn on rejected calls). Live re-verified: assess 200, accuracy 100.

