import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkStreakStickers,
  gameBestStars,
  gameLevelStars,
  getDeviceId,
  getOwnerAccountId,
  getState,
  markOwnerAccountId,
  parkOwnerBlob,
  recordBatchResult,
  recordGameResult,
  recordRoundResult,
  recordSkillAnswer,
  resetForTests,
  restoreParkedBlob,
  starsForScore,
  STICKERS,
  todayISO,
  touchStreak,
} from './store';

beforeEach(() => {
  resetForTests();
});

describe('starsForScore (AC-T1 boundaries)', () => {
  it.each([
    [0, 100, 0],
    [49, 100, 0],
    [50, 100, 1],
    [74, 100, 1],
    [75, 100, 2],
    [99, 100, 2],
    [100, 100, 3],
    [10, 0, 0],
  ])('points=%i/%i -> %i stars', (pts, max, expected) => {
    expect(starsForScore(pts, max)).toBe(expected);
  });
});

describe('recordRoundResult', () => {
  it('banks stars into the grade and totals', () => {
    const r = recordRoundResult('grade-2', 1, 80, 100);
    expect(r.stars).toBe(2);
    const s = getState();
    expect(s.totalStars).toBe(2);
    expect(s.grades['grade-2'].stars).toBe(2);
    expect(s.grades['grade-2'].roundsCompleted).toBe(1);
  });

  it('awards the perfect-round sticker at 3 stars, idempotent on replay', () => {
    recordRoundResult('grade-2', 1, 100, 100);
    const second = recordRoundResult('grade-3', 1, 100, 100);
    expect(second.newStickers).toHaveLength(0);
    expect(getState().stickerIds).toContain('perfect-round');
  });
});

describe('recordBatchResult', () => {
  it('awards 2 chest stars + first-batch sticker once', () => {
    const r = recordBatchResult('grade-1');
    expect(r.chestStars).toBe(2);
    expect(r.newStickers.map((s) => s.id)).toContain('first-batch');
    const again = recordBatchResult('grade-1');
    expect(again.newStickers.map((s) => s.id)).not.toContain('first-batch');
    expect(getState().totalStars).toBe(4);
    expect(getState().batchesCompleted).toBe(2);
  });

  it('explorer sticker lands after all five grades are played', () => {
    for (const g of ['grade-1', 'grade-2', 'grade-3', 'grade-4']) recordBatchResult(g);
    expect(getState().stickerIds).not.toContain('explorer');
    const last = recordBatchResult('grade-5');
    expect(last.newStickers.map((s) => s.id)).toContain('explorer');
  });
});

describe('streak', () => {
  it('same-day touch keeps count, next-day increments, gap resets', () => {
    expect(touchStreak(new Date(2026, 9, 1))).toBe(1);
    expect(touchStreak(new Date(2026, 9, 1, 23))).toBe(1); // same day
    expect(touchStreak(new Date(2026, 9, 2))).toBe(2); // next day
    expect(touchStreak(new Date(2026, 9, 5))).toBe(1); // gap -> reset
  });

  it('streak-3 sticker lands on the third consecutive day', () => {
    touchStreak(new Date(2026, 9, 1));
    touchStreak(new Date(2026, 9, 2));
    expect(checkStreakStickers()).toHaveLength(0);
    touchStreak(new Date(2026, 9, 3));
    expect(checkStreakStickers().map((s) => s.id)).toContain('streak-3');
    expect(getState().stickerIds).toContain('streak-3');
  });
});

describe('store resilience', () => {
  it('persists across getState calls and survives storage errors', () => {
    recordRoundResult('grade-4', 2, 60, 100);
    expect(getState().totalStars).toBe(1);
    // corrupt stored JSON -> next fresh load falls back cleanly
    localStorage.setItem('beheo-engagement-v1', '{broken');
    expect(() => getState()).not.toThrow();
  });

  it('todayISO formats calendar day', () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('sticker catalog is complete', () => {
    expect(STICKERS.map((s) => s.id)).toEqual([
      'first-batch',
      'perfect-round',
      'explorer',
      'star-hoard',
      'correct-100',
      'correct-500',
      'review-10',
      'skill-grammar',
      'skill-listening',
      'skill-spelling',
      'skill-reading',
      'streak-3',
      'streak-7',
      'arena-first',
      'arena-win',
      'arena-5',
      'quest-perfect',
      'quest-3',
      'pet-baby',
      'pet-adult',
    ]);
  });
});

describe('park/restore owner blob (external-review r5 guest-leak)', () => {
  it('guest entry hides an account-owned blob without destroying it', () => {
    recordRoundResult('grade-2', 1, 100, 100);
    markOwnerAccountId('student-1');
    expect(getState().totalStars).toBe(3);

    parkOwnerBlob();
    // guest sees a clean state, owner marker cleared
    expect(getState().totalStars).toBe(0);
    expect(getOwnerAccountId()).toBeNull();
    expect(localStorage.getItem('beheo-engagement-v1')).toBeNull();
    // the blob survived under the account-scoped key
    expect(localStorage.getItem('beheo-engagement-parked-student-1')).not.toBeNull();
  });

  it('the owning account gets its parked blob back', () => {
    recordRoundResult('grade-2', 1, 100, 100);
    markOwnerAccountId('student-1');
    parkOwnerBlob();
    recordRoundResult('grade-1', 1, 50, 100); // guest plays

    restoreParkedBlob('student-1');
    // owner's blob restored over the guest scratch state
    expect(getOwnerAccountId()).toBe('student-1');
    expect(localStorage.getItem('beheo-engagement-parked-student-1')).toBeNull();
  });

  it('parking is a no-op for guest blobs (nothing to protect)', () => {
    recordRoundResult('grade-1', 1, 50, 100); // guest, no owner marker
    parkOwnerBlob();
    expect(getState().totalStars).toBe(1); // guest state untouched
  });
});

describe('r17 per-device stat attribution', () => {
  it('recordSkillAnswer mirrors counters into this device bucket', () => {
    recordSkillAnswer('grade-3', 'vocab', true);
    const devices = getState().stats?.devices ?? {};
    const mine = devices[getDeviceId()];
    expect(mine).toBeDefined();
    const total = Object.values(mine!.days).reduce((n, d) => n + d.total, 0);
    expect(total).toBe(1);
    expect(mine!.skills['grade-3'].vocab).toEqual({ correct: 1, total: 1 });
  });

  it('the device bucket only holds this device\'s own work', () => {
    recordSkillAnswer('grade-3', 'vocab', true);
    recordSkillAnswer('grade-3', 'vocab', false);
    const devices = getState().stats?.devices ?? {};
    // Exactly one bucket, ours - nobody else's counters leak in.
    expect(Object.keys(devices)).toEqual([getDeviceId()]);
    const mine = devices[getDeviceId()]!;
    expect(mine.skills['grade-3'].vocab).toEqual({ correct: 1, total: 2 });
  });
});

describe('recordGameResult levels (CR-88)', () => {
  it('level scopes the objective id - same seed, different level grants again', () => {
    const l1 = recordGameResult('grade-2', 'maze-chase', 'seed-z', 10, 10, 1);
    const l2 = recordGameResult('grade-2', 'maze-chase', 'seed-z', 10, 10, 2);
    const l1again = recordGameResult('grade-2', 'maze-chase', 'seed-z', 10, 10, 1);
    expect(l1.alreadyGranted).toBeFalsy();
    expect(l2.alreadyGranted).toBeFalsy(); // different objective id
    expect(l1again.alreadyGranted).toBe(true);
    const keys = Object.keys(getState().grantedObjectives ?? {});
    expect(keys.some((k) => k.startsWith('game:maze-chase:L1:'))).toBe(true);
    expect(keys.some((k) => k.startsWith('game:maze-chase:L2:'))).toBe(true);
  });

  it('tracks per-level best stars plus the aggregate best', () => {
    recordGameResult('grade-2', 'gold-quest', 'a', 10, 10, 1); // 3*
    recordGameResult('grade-2', 'gold-quest', 'b', 5, 10, 2);  // 1*
    expect(gameLevelStars('gold-quest', 1)).toBe(3);
    expect(gameLevelStars('gold-quest', 2)).toBe(1);
    expect(gameLevelStars('gold-quest', 3)).toBe(0);
    expect(gameBestStars('gold-quest')).toBe(3);
  });

  it('omitted level behaves like level 1 (legacy callers stay valid)', () => {
    recordGameResult('grade-2', 'fishing-catch', 'c', 10, 10);
    expect(gameBestStars('fishing-catch')).toBe(3);
    // review r39: the L1 picker stars reflect legacy callers too
    expect(gameLevelStars('fishing-catch', 1)).toBe(3);
    const keys = Object.keys(getState().grantedObjectives ?? {});
    expect(keys.some((k) => k.startsWith('game:fishing-catch:L1:'))).toBe(true);
  });
});
