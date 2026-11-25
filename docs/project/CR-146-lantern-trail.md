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

### r232 rewrite (convergent merge)

Fold-based merging could erase surplus lights at lap boundaries (two
epoch-0 devices with 11 distinct lights each reconverged to 12, losing
10 completions). Trail is now the ALL-TIME unique event set -
`events: {objectiveId, stars}[]` uncapped, sorted canonically by id on
merge; `epoch = floor(len/12)` and `lit = len%12` derive from the count
so no positional remainder exists to lose. The event set itself is the
durable dedupe history (replaces seenIds). All prior shapes (r229
lit/stars, r230 lights+seenIds) normalize into events on read, merge
and sanitize.

### r233 fixes

1. **[major] Legacy epoch dropped on sanitize** - r229 blobs stored no
   retired ids and r230 capped seenIds at 48, so completed laps were
   lost when normalizing. Synthetic `pad:N` events now backfill
   `epoch*12 - retired` so lap counts survive migration.
2. **[minor] id-sort broke completion order** - the current-lap slice
   showed stars in id order, not completion order, after a sync.
   Events now carry `ts`; canonical order is `(ts, id)` - convergent
   AND the displayed lap reflects the newest completions.

### r234 fixes

1. **[major] Pad double-count + unbounded epoch DoS** - synthetic
   `pad:*` events double-counted history across stale devices (epoch4 +
   ids 0-47 merged with epoch5 + ids 12-59 -> 72 instead of 60), and a
   remote `epoch:1e12` froze the browser materializing pads. `pad:*`
   events are REMOVED: `done` is a max-merged lap COUNT kept separate
   from the real-id event set, so `epoch = max(done, floor(len/12))`
   converges without materializing anything. Sanitize clamps
   `done`/`epoch` to TRAIL_DONE_CAP (10000) instead of looping pads.
2. **[minor] ts merge not commutative** - `prev.ts ?? ev.ts` kept
   whichever came first; reversed inputs produced different ts. Merge
   now takes min-defined ts.

### r236 fixes

1. **[major] Migrated laps stopped advancing** - `{epoch:5}` + 12 real
   completions stayed epoch 5: `done` was a max-merged floor that
   absorbed new laps. `base` is now the BASELINE (laps whose ids were
   never recorded), computed once at migration as
   `claimed - floor(recordedIds/12)`; `epoch = base + floor(events/12)`
   always grows. The r234 `done` field is read as a legacy TOTAL claim
   (it was copied from `epoch`), distinct from `base`.
2. **[major] Persisted pad:* ids still double-counted** - r233 blobs in
   the wild carry synthetic `pad:*` ids inside `events`. `normalizeTrail`
   now strips pads everywhere (read, write, merge, sanitize) and folds
   `floor(pads/12)` into the baseline - the r236 repro merges to epoch 5
   lit 1 instead of epoch 9.
3. Merge reconciliation: `claimed = max(each side's derived epoch)`;
   `base = max(0, claimed - floor(unionIds/12))` - convergent,
   idempotent, and pads/seenIds can never inflate. Sanitize clamps the
   claimed epoch (TRAIL_DONE_CAP) and stored ids (TRAIL_EVENTS_CAP).

### r237 fixes

1. **[major] String `base` concatenated** - localStorage is untrusted;
   a stored `base:"5"` produced epoch 50 via `+` concat. All stored lap
   counts now pass `safeLapCount` (finite, non-negative, clamped to
   TRAIL_DONE_CAP) before any arithmetic, on local reads too.
2. **[minor] In-blob dedupe kept first ts** - duplicate ids inside one
   stored state kept whichever ts appeared first, so array order could
   change merged order. `normalizeTrail` dedupe now matches
   `mergeEngagement`: max stars + min-defined ts.

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

### r231 fixes

1. **[major] Base lights skipped the retirement filter** - merged
   seenIds only filtered incoming lights; an id retired on the other
   side but still in base's current lap counted twice. Merge now
   filters BOTH arrays; tests assert reversed-argument agreement.
2. **[major] 48-id dedupe cap allowed replay after 4 laps** - epoch 5 +
   stale epoch-0 lights folded to epoch 6 for free. seenIds is now
   uncapped (same precedent as grantedObjectives - the keyspace is
   bounded by real completions).
