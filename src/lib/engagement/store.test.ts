import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkStreakStickers,
  getState,
  recordBatchResult,
  recordRoundResult,
  resetForTests,
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
