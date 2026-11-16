# External Review - Round 209 (codex)

Reviewer: codex (real external run). Scope: commit HEAD, HEAD=2709bb6.

1. [major] [src/lib/engagement/serverStreak.ts:71-72](/Users/kazu.nx/devin_app/student-self-practice-web/src/lib/engagement/serverStreak.ts:71) - The uid recheck does not guarantee the RPC uses that session: Supabase executes the RPC asynchronously, so the active account can change after the check but before the request uses its credentials. The result could then be cached under the captured uid if the auth-change handler has not updated `cacheUid` yet. Bind the request to a verified session or discard the result unless the uid still matches when it returns; add a test that switches accounts after the recheck but before RPC execution.

