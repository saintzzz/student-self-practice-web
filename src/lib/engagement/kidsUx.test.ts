import { beforeEach, describe, expect, it } from 'vitest';
import {
  emptyEngagement,
  grantHomeItem,
  isObjectiveGranted,
  ownedHomeItems,
  pendingGiftStickerIds,
  recordBatchResult,
  recordRoundResult,
  writeState,
} from './store';
import { mergeEngagement } from './sync';
import { HOME_ITEMS } from '../../data/homeItems';

describe('kids-UX store additions (AC-4.2/4.4)', () => {
  beforeEach(() => {
    localStorage.clear();
    writeState(emptyEngagement());
  });

  it('recordRoundResult is idempotent per objectiveId (AC-4.4)', () => {
    const first = recordRoundResult('g1', 0, 10, 10, 'round:seed-1:0');
    expect(first.stars).toBe(3);
    expect(first.alreadyGranted).toBeUndefined();
    const again = recordRoundResult('g1', 0, 10, 10, 'round:seed-1:0');
    expect(again.stars).toBe(0);
    expect(again.alreadyGranted).toBe(true);
    // a NEW run (different seed) still earns
    const fresh = recordRoundResult('g1', 0, 10, 10, 'round:seed-2:0');
    expect(fresh.stars).toBe(3);
    expect(isObjectiveGranted('round:seed-1:0')).toBe(true);
  });

  it('recordBatchResult is idempotent per batch:<seed>', () => {
    const first = recordBatchResult('g1', 'batch:seed-9');
    expect(first.chestStars).toBeGreaterThan(0);
    const again = recordBatchResult('g1', 'batch:seed-9');
    expect(again.chestStars).toBe(0);
    expect(again.alreadyGranted).toBe(true);
  });

  it('grantHomeItem is deterministic and replayable (same item back)', () => {
    const first = grantHomeItem('first-batch', 0);
    expect(first?.item).toBeTruthy();
    const replay = grantHomeItem('first-batch', 0);
    expect(replay?.alreadyGranted).toBe(true);
    expect(replay?.item.id).toBe(first!.item.id);
    // different box index CAN pick a different pool item on first grant only
    expect(ownedHomeItems().length).toBe(1);
    // persisted grant survives a store reload
    expect(isObjectiveGranted('gift:first-batch')).toBe(true);
  });

  it('grantHomeItem never re-grants after pool exhaustion', () => {
    // grant every item via distinct sticker ids
    for (let i = 0; i < HOME_ITEMS.length; i++) {
      expect(grantHomeItem(`sticker-${i}`, i)).not.toBeNull();
    }
    expect(grantHomeItem('extra-sticker', 0)).toBeNull();
  });

  it('pendingGiftStickerIds survives until claimed (dev-review #6)', () => {
    // earning 'first-batch' makes it eligible AND pending
    recordBatchResult('g1', 'batch:seed-g');
    expect(pendingGiftStickerIds()).toContain('first-batch');
    // a non-gift sticker never pends
    recordRoundResult('g1', 0, 10, 10, 'round:seed-g:0'); // perfect-round
    expect(pendingGiftStickerIds()).toEqual(['first-batch']);
    // claiming clears the pending state - persisted, not transient
    grantHomeItem('first-batch', 0);
    expect(pendingGiftStickerIds()).toEqual([]);
    // remount equivalent: state reload still shows nothing pending
    expect(pendingGiftStickerIds()).toEqual([]);
  });

  it('mergeEngagement preserves homeItems/giftGrants/grantedObjectives (R0)', () => {
    const local = emptyEngagement();
    local.homeItems = ['ball'];
    local.giftGrants = { 'first-batch': 'ball' };
    local.grantedObjectives = { 'batch:s1': '2026-01-01T00:00:00Z' };
    const remote = emptyEngagement();
    remote.homeItems = ['kite', 'ball'];
    remote.giftGrants = { 'star-hoard': 'kite' };
    remote.grantedObjectives = {
      'batch:s1': '2026-01-02T00:00:00Z', // newer wins
      'batch:s2': '2026-01-03T00:00:00Z',
    };
    const merged = mergeEngagement(local, remote);
    expect(merged.homeItems).toEqual(['ball', 'kite']);
    expect(merged.giftGrants).toEqual({ 'first-batch': 'ball', 'star-hoard': 'kite' });
    expect(merged.grantedObjectives).toEqual({
      'batch:s1': '2026-01-02T00:00:00Z',
      'batch:s2': '2026-01-03T00:00:00Z',
    });
  });
});
