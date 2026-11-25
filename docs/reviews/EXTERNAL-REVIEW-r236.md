# External Review - Round 236 (codex)

Reviewer: codex (real external run). Scope: commit eb35764, HEAD=46b842e.

1. [severity major] src/lib/engagement/store.ts:586 - Migrated lap counts stop advancing: `{epoch:5, lights:[]}` followed by 12 new completions still returns `epoch:5`, rather than 6 (reproduced). `max(done, floor(events.length/12))` absorbs new laps into historical progress - Preserve a migration baseline and count subsequent completed laps on top, with merge-safe reconciliation.

2. [severity major] src/lib/engagement/store.ts:559 - Previously persisted r233 `pad:*` events survive unchanged and still double-count historical completions during sync. Reproduced: 60 pads plus one current event merged with legacy epoch 5 containing 48 retired IDs and that same current event produces 109 events / epoch 9 instead of epoch 5 - Migrate existing synthetic pads into historical-count metadata and exclude them from event unions on both local and remote paths.

