# External Review - Round 87 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit 7f46b68, HEAD=7f46b68.

1. [major] supabase/functions/practice-transcribe/index.ts:375 - Config RPC and JSON parsing now start before the rate-limit check, so rejected requests still consume database work and parse potentially large audio payloads. This weakens overload protection. - Fix: await `rateLimited()` before starting either operation.

Review limited to supplied diff; local file access was blocked by execution policy.

