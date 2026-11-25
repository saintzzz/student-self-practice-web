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
  lit: number;        // nodes lit this lap (0..12)
  stars: number[];    // stars earned by the batch that lit each node
}>
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
