# External Review - Round 234 (codex)

Reviewer: codex (real external run). Scope: commit ef65d2e, HEAD=ef65d2e.

1. [severity major] src/lib/engagement/store.ts:561 - Synthetic padding double-counts history across stale devices: epoch 4 with IDs 0–47 merged with epoch 5 containing IDs 12–59 produces 72 completions instead of 60 - Reconcile legacy history before padding; represent unknown historical counts separately from real event IDs.

2. [severity major] src/lib/engagement/sync.ts:641 - Remote `epoch` drives an unbounded allocation loop; a tiny blob with `epoch: 1e12` can freeze/crash the browser - Validate a bounded migration count or store historical progress without materializing padding events.

3. [severity minor] src/lib/engagement/sync.ts:242 - `prev.ts ?? ev.ts` keeps the first timestamp, contradicting “earliest” and breaking commutativity: reversed inputs return 200 versus 100 - Take the minimum defined timestamp deterministically.

4. [severity minor] src/lib/engagement/sync.ts:248 - Legacy lights and padding both lack timestamps, so ID sorting puts `batch:*` before `pad:*`. Reproduced: epoch 1 plus one three-star light displays `[0]` after sync instead of `[3]` - Give migrated events explicit deterministic ordering that places padding before current lights.

