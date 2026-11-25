# External Review - Round 230 (codex)

Reviewer: codex (real external run). Scope: commit 1b22d56, HEAD=1b22d56.

1. [major] [src/lib/engagement/sync.ts](/Users/kazu.nx/devin_app/student-self-practice-web/src/lib/engagement/sync.ts:248) - Concurrent purchases on separate devices are undercounted: each can spend 25 stars, but `max(25, 25)` records only 25 spent while keeping both items. Merge spend events by unique purchase ID or use per-device counters that can be summed.

2. [major] [src/lib/engagement/sync.ts](/Users/kazu.nx/devin_app/student-self-practice-web/src/lib/engagement/sync.ts:268) - Completed trail light IDs are discarded. Merging the same stale epoch-0 state again can fold its 12 lights into epoch 1 and advance the trail to epoch 2 without new batches. Retain deduplication history across laps or merge lap-scoped events without dropping their IDs.

