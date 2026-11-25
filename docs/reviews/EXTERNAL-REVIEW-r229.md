# External Review - Round 229 (codex)

Reviewer: codex (real external run). Scope: commit 86b44a1, HEAD=86b44a1.

1. [major] src/lib/engagement/store.ts:673 - Purchases are refunded by sync: spending 25 from 50 leaves 25 locally, but `mergeEngagement` takes `max(25, 50)` while retaining the item. Every signed-in purchase can become free - persist idempotent purchase records and derive balance from earned stars minus merged spending.

2. [major] src/lib/engagement/sync.ts:234 - Concurrent batches lose trail progress. Two devices starting at node 3 each complete a different batch; merge retains node 4 while marking both objectives granted, permanently losing one advancement - merge batch events by objective ID and derive trail position from unique completions.

3. [minor] src/components/LandDecor.tsx:25 - Decorations are cached for the entire mount. Buying in the sibling shop never updates the land, even if its parent rerenders - subscribe to engagement changes and recompute placement when ownership changes.

4. [minor] src/components/LandDecor.tsx:28 - Only the first eight owned items can ever decorate the land. Purchases nine through twenty-four remain invisible there after reload, with no placement selector - provide selection or rotation among owned decorations.

5. [minor] src/components/HomeShelf.tsx:17 - Shop balance and affordability never refresh after asynchronous sync. A child initially below 25 stars remains unable to purchase after their balance downloads - subscribe to store changes and refresh both balance and ownership.

Source review only; deployed UI was not verified.

