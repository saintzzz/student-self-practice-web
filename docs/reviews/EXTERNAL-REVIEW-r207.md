# External Review - Round 207 (codex)

Reviewer: codex (real external run). Scope: commit 3db7743, HEAD=3db7743.

1. [major] `src/lib/engagement/serverStreak.ts:55, 87` - `fetchServerStreak()` reads the session again after the caller captures the uid. If the account changes between those reads, it can fetch the new user’s streak and cache it under the old uid. - Pass the captured uid through and verify the active uid before applying the result.

2. [minor] `src/lib/engagement/serverStreak.ts:110-119` - If the hook unmounts before the async Supabase lookup resolves, cleanup runs before `sub` is assigned, leaving the auth listener subscribed. - Track whether the effect is still mounted and immediately unsubscribe any subscription that resolves after cleanup.

