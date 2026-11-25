# CR-146 - Duong den long (Lantern Trail core loop)

Source: `docs/reviews/GAMEFI-DESIGN-po.md` §3 + roadmap P1. Fixes the
synthesis finding that long-term progression scored 1.5/5 - home items
unreachable beyond 2 gift stickers, stars have no sink.

## Scope (ship in this CR)

| Item | Spec ref | Size |
|---|---|---|
| P1-1 Trail state + UI | 12 lantern nodes/grade on the launchpad land vignette (`StartBatchScreen`), node = 1 `batch:<seed>`; states dark -> next(pulse) -> lit; node stores batch stars (3 = gold); chest at nodes 4/8/12 -> `GiftBoxPicker` via `trail:<grade>:<node>` objective (idempotent); 12 lit -> `trail-full-<land>` sticker + prestige lap (`epoch++`, nodes relight); pet art perches at the next node | L |
| P1-2 Star shop | "Doi qua" inside `HomeShelf`: unowned home item = 25 stars, child picks the item (no lottery). `spendStarsForHomeItem` decrements `totalStars` | M |
| P1-3 Items on land | Owned home items render as decorations at deterministic slots (`hashSeed(itemId)`) on the launchpad land vignette - "nha cua em" = the land | M |
| New stickers | `trail-half-<land>` x5 (6 lit), `trail-full-<land>` x5 (12 lit) | S |

## Deferred (documented, not forgotten)

- P1-4 recordSkillAnswer for games + review bridge - per-game answer plumbing is a separate CR.
- P1-5 pet stages 4-5 - needs pet-{species}-{4,5}.webp art (artgen, no key in env).
- P1-6 shelf skill grouping, P1-7 scoring fixes, P1-9 speed bonus - next CR.
- P1-8 class co-op weekly - needs an aggregate rpc (server migration).
- P1-10 remaining artImage - artgen pipeline.
- `class-lantern` + `game-master` stickers - gated on P1-8 / gameBest audit.

## Data model

```ts
EngagementState.trail?: Record<gradeId, {
  epoch: number;      // prestige laps completed
  lights: { id: string; stars: number }[];  // <=12, unioned by objective id on merge
}>
EngagementState.spentStars?: number;       // legacy flat counter
EngagementState.spends?: Record<deviceId, number>;  // per-device, summed
```

- `OBJECTIVE_RE` gains a `trail` branch; chest grants are idempotent
  across laps (`trail:<grade>:<node>` granted once ever - pool exhausts
  after ~8 laps as designed).
- `recordBatchResult(gradeId, objectiveId?, batchStars?)` advances the
  trail and returns `trailChestNode` when the newly lit node is 4/8/12.
- `pendingTrailChest(gradeId)` derives an unclaimed chest offer from
  persisted state (same pattern as `pendingGiftStickerIds`).
- `spendStarsForHomeItem(itemId)` - cost 25 stars; refuses when
  totalStars < 25 or the item is owned. Grade stars (achievement
  record) are untouched; `totalStars` becomes the spendable currency.

## UI

- `TrailPath` component overlays the launchpad `LandArt` vignette: 12
  lantern dots along a gentle arc, amber glow when lit, gold ring for
  3-star nodes, chest icon at 4/8/12, pulse on the next node, pet art
  perched at the next node.
- `LandDecor` overlays owned items at 8 fixed slots picked by
  `hashSeed(itemId)` (collision -> next free slot).
- `HomeShelf` gains the "Doi qua" shop row.
- `BatchSummary` passes batch stars into `recordBatchResult` and offers
  the trail chest via `GiftBoxPicker`.

## External review

### r229 fixes

1. **[major] Star spends refunded by sync** - `totalStars` max-merge
   would restore spent stars while keeping the item. Fix: `spentStars`
   monotonic counter; spendable = `totalStars - spentStars`;
   `spendableStars()` is the only balance read.
2. **[major] Concurrent batches lost trail progress** - positional
   `lit`/`stars` could not distinguish "same node lit twice" from
   "different nodes". Trail is now an EVENT UNION: `lights[]` carries
   the objective id per lit node; merge folds unique ids (full lap
   rolls to epoch+1). Legacy `{lit,stars}` blobs normalize on read.
   Also fixed the pre-existing `sanitizeRemote` gaps: `game:` objectives
   and colon-keyed `giftGrants` were stripped on pull.
3. **[minor] LandDecor mount-cache** - now subscribes to engagement
   changes; a shop buy appears on the land without reload.
4. **[minor] 8-slot cap hid items 9+** - daily rotation of the owned
   pool cycles every item through the 8 slots.
5. **[minor] HomeShelf stale after async sync** - subscribes to store;
   balance + ownership refresh live.

### r230 fixes

1. **[major] Concurrent purchases undercounted** - `spentStars` merged
   as max, so two devices buying 25 each recorded 25 spent while keeping
   both items. Spends are now per-device monotonic counters
   (`spends[deviceId]`, same model as `stats.devices`) merged per-key
   max and summed on read.
2. **[major] Retired lap ids could re-fold** - a stale epoch-0 state
   merged back could fold its 12 lights into the next lap for a free
   epoch. `TrailState.seenIds` (cap 48) retires folded ids; merge skips
   anything already seen, on either side.
