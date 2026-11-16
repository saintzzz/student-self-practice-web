# External Review - Round 208 (codex)

Reviewer: codex (real external run). Scope: commit HEAD, HEAD=8754abf.

1. [major] `src/lib/engagement/serverStreak.ts:67-68` - The uid check still happens before `await getSupabase()`. If the account switches during that await, the RPC can run with the new session and its result can be cached under the captured uid. Resolve the client first, then recheck the uid immediately before invoking `rpc`; add a regression test that delays `getSupabase()` and switches accounts during the delay.

