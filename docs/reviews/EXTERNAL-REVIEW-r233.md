# External Review - Round 233 (codex)

Reviewer: codex (real external run). Scope: commit 340a44f, HEAD=340a44f.

1. [severity major] [src/lib/engagement/sync.ts](/Users/kazu.nx/devin_app/student-self-practice-web/src/lib/engagement/sync.ts:609) - Legacy trail lap counts are discarded: sanitization converts `seenIds`, `lights`, or positional stars, but ignores the legacy `epoch` field. A record with completed laps and no retired IDs therefore reopens at a lower lap count after sync. Preserve the completed-lap count during migration, including when generating synthetic events.

2. [severity minor] [src/lib/engagement/sync.ts](/Users/kazu.nx/devin_app/student-self-practice-web/src/lib/engagement/sync.ts:241) - Sorting events by ID makes `trailSnapshot`’s last-12 slice reflect identifier order, not completion order; after sync, gold-star lanterns can be shown on the wrong nodes. Preserve a deterministic completion order in each event and use it when deriving the displayed lap.

