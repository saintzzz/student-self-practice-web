# External Review - Round 231 (codex)

Reviewer: codex (real external run). Scope: commit 91721e6, HEAD=91721e6.

1. [major] src/lib/engagement/sync.ts:281 - Retired IDs are filtered only from incoming lights; base lights already present in the merged `seenIds` survive. Equal-epoch merges can therefore produce different progress when arguments reverse and later count retired lights again. Fix: filter both light arrays against merged retirement history before folding; test reversed arguments.

2. [major] src/lib/engagement/sync.ts:245 - Capping retirement history at 48 IDs re-enables stale replay after four laps. Verified: epoch 5 plus 12 forgotten epoch-0 lights advances to epoch 6 without new work. Fix: retain durable deduplication or use causally tracked events with safe compaction; test replay beyond the history cap.

