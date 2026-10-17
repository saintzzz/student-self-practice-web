import { describe, expect, it } from 'vitest';
import { GAME_LEVELS, LEVEL_META, specFor, timeBonusFor } from './levels';

describe('levels: difficulty ladder', () => {
  it('offers exactly 3 levels with child-facing labels', () => {
    expect(GAME_LEVELS).toEqual([1, 2, 3]);
    for (const l of GAME_LEVELS) expect(LEVEL_META[l].label).toContain(`${l}`);
  });

  it('level 1 keeps today\'s tuning (rounds = base)', () => {
    expect(specFor(1, 5).rounds).toBe(5);
    expect(specFor(1).lives).toBe(3);
  });

  it('higher levels add rounds, raise speed, cut lives', () => {
    const l2 = specFor(2, 5);
    const l3 = specFor(3, 5);
    expect(l2.rounds).toBe(7);
    expect(l3.rounds).toBe(9);
    expect(l2.speedScale).toBeGreaterThan(specFor(1).speedScale);
    expect(l3.speedScale).toBeGreaterThan(l2.speedScale);
    expect(l3.lives).toBeLessThan(l2.lives);
    expect(l2.missLimit).toBeLessThan(specFor(1).missLimit);
  });

  it('unknown/omitted level falls back to level 1', () => {
    expect(specFor(undefined, 4).rounds).toBe(4);
    expect(specFor(99, 4).rounds).toBe(4);
  });
});

describe('levels: timeBonusFor', () => {
  it('pays nothing at/above par and scales down from bonusMax', () => {
    const spec = specFor(1); // parSec 75
    expect(timeBonusFor(75_000, spec, 10)).toBe(0);
    expect(timeBonusFor(90_000, spec, 10)).toBe(0);
    expect(timeBonusFor(0, spec, 10)).toBe(10);
    const half = timeBonusFor(37_500, spec, 10);
    expect(half).toBe(5);
  });

  it('never returns negative or NaN for odd input', () => {
    const spec = specFor(3);
    expect(timeBonusFor(1e9, spec, 10)).toBe(0);
    expect(timeBonusFor(0, spec, 0)).toBe(0);
  });
});
