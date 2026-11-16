# External Review - Round 206 (codex)

Reviewer: codex (real external run). Scope: commit 5acc7bd, HEAD=7c4b161.

1. [major] `src/lib/engagement/serverStreak.ts:87` - A newly mounted hook initializes from the global cache before checking the current uid, so an account switch can briefly render the previous user’s streak. - Initialize with `null` until the session is verified, or store the uid with the value and expose it only when it matches.

2. [major] `src/lib/engagement/serverStreak.ts:88-95` - A mounted hook checks the session only once. Switching accounts while it remains mounted leaves the previous streak visible until some unrelated refresh occurs. - Subscribe to auth changes and clear/refetch the cache when the uid changes.

3. [minor] `src/lib/engagement/serverStreak.ts:81-83` - If a refresh for user A is still in flight when the session switches to user B, the late response unconditionally resets the cache to A’s uid and value. - Apply the response only if the current cache uid still matches the uid captured before fetching.

