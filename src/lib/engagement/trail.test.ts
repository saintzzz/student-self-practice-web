import { beforeEach, describe, expect, it } from 'vitest';
import {
  grantTrailChest,
  isObjectiveGranted,
  pendingTrailChest,
  recordBatchResult,
  resetForTests,
  spendStarsForHomeItem,
  getState,
  recordRoundResult,
  trailSnapshot,
  TRAIL_NODES,
  SHOP_ITEM_STARS,
} from './store';

const G = 'grade-1';

let batchSeq = 0;
/** Simulate n batches on a grade with the given per-batch stars. */
function runBatches(n: number, stars = 3) {
  let last;
  for (let i = 0; i < n; i++) {
    last = recordBatchResult(G, `batch:t${batchSeq++}`, stars);
  }
  return last!;
}

describe('CR-146 lantern trail', () => {
  beforeEach(() => resetForTests());

  it('each batch lights one node; stars are recorded per node', () => {
    runBatches(3, 2);
    const snap = trailSnapshot(G);
    expect(snap.lit).toBe(3);
    expect(snap.stars).toEqual([2, 2, 2]);
    expect(snap.next).toBe(4);
  });

  it('nodes 4/8/12 report a chest; other nodes do not', () => {
    const seq = [1, 2, 3, 4].map(() => 0);
    let saw: (number | undefined)[] = [];
    for (let i = 0; i < TRAIL_NODES; i++) {
      const r = recordBatchResult(G, `batch:s${i}`, seq[i % 4]);
      saw.push(r.trailChestNode);
    }
    expect(saw).toEqual([undefined, undefined, undefined, 4, undefined, undefined, undefined, 8, undefined, undefined, undefined, 12]);
  });

  it('trail chest grant is idempotent via trail:<grade>:<node>', () => {
    runBatches(4);
    expect(pendingTrailChest(G)).toBe(4);
    const first = grantTrailChest(G, 4, 1);
    expect(first).not.toBeNull();
    expect(first!.alreadyGranted).toBe(false);
    expect(isObjectiveGranted(`trail:${G}:4`)).toBe(true);
    expect(pendingTrailChest(G)).toBeNull();
    const replay = grantTrailChest(G, 4, 0);
    expect(replay!.item.id).toBe(first!.item.id);
    expect(replay!.alreadyGranted).toBe(true);
  });

  it('half-trail sticker at 6, full sticker + prestige reset at 12', () => {
    runBatches(6);
    expect(getState().stickerIds).toContain('trail-half-playground');
    expect(trailSnapshot(G).lit).toBe(6);
    runBatches(6); // node 12 completes the lap
    const state = getState();
    expect(state.stickerIds).toContain('trail-full-playground');
    const snap = trailSnapshot(G);
    expect(snap.epoch).toBe(1);
    expect(snap.lit).toBe(0);
    expect(snap.stars).toEqual([]);
  });

  it('replay of the same batch:<seed> does not double-light nodes', () => {
    recordBatchResult(G, 'batch:same', 3);
    const again = recordBatchResult(G, 'batch:same', 3);
    expect(again.alreadyGranted).toBe(true);
    expect(trailSnapshot(G).lit).toBe(1);
  });

  it('after a lap, chests from the previous lap stay claimable', () => {
    runBatches(TRAIL_NODES);
    // node-4 chest never claimed - still offered after the reset
    expect(pendingTrailChest(G)).toBe(4);
    expect(grantTrailChest(G, 4, 0)).not.toBeNull();
    expect(pendingTrailChest(G)).toBe(8);
  });
});

describe('CR-146 star shop', () => {
  beforeEach(() => resetForTests());

  it('refuses when stars are short', () => {
    expect(spendStarsForHomeItem('ball')).toBeNull();
    expect(getState().totalStars).toBe(0);
  });

  it('spends 25 stars and grants the chosen item', () => {
    for (let i = 0; i < 9; i++) recordRoundResult(G, i, 12, 12, `round:r${i}:0`); // 27 stars
    const before = getState().totalStars;
    const result = spendStarsForHomeItem('ball');
    expect(result?.item.id).toBe('ball');
    const state = getState();
    expect(state.totalStars).toBe(before - SHOP_ITEM_STARS);
    expect(state.homeItems).toContain('ball');
    expect(spendStarsForHomeItem('ball')).toBeNull(); // already owned
  });

  it('grade stars stay untouched by spending', () => {
    recordRoundResult(G, 0, 12, 12, 'round:x:0');
    const gradeStars = getState().grades[G]!.stars;
    expect(gradeStars).toBe(3);
  });
});
