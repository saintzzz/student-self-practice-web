# External Review - Round 204 (codex)

Reviewer: codex (real external run). Scope: commit 2415aa6, HEAD=2415aa6.

1. [major] [serverStreak.ts](/Users/kazu.nx/devin_app/student-self-practice-web/src/lib/engagement/serverStreak.ts:30) - The module-level cache isn’t tied to the signed-in user. After an account switch, the next user can briefly see the previous user’s streak and the hook may never refetch it. Key the cache by user ID and refresh or clear it on auth changes.

2. [major] [0082_streak_status.sql](/Users/kazu.nx/devin_app/student-self-practice-web/supabase/migrations/0082_streak_status.sql:55) - The streak loop can run up to 400 iterations, each checking `practice.results` with a date expression that can’t use the existing `(account_id, created_at)` index. This can become hundreds of table scans per status request. Compute the user’s active dates once and walk that set, or use an indexed date range.

