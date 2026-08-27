import { describe, expect, it } from 'vitest';
import { hashString, pickDistinct, seededShuffleIndices } from './prng';

describe('hashString', () => {
  it('is deterministic for the same input', () => {
    expect(hashString('cat-1-count-to-image')).toBe(hashString('cat-1-count-to-image'));
  });

  it('produces different values for different inputs (no trivial collisions)', () => {
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});

describe('seededShuffleIndices', () => {
  it('returns a permutation of 0..n-1', () => {
    const result = seededShuffleIndices(5, 'seed-1');

    expect([...result].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it('is deterministic for the same seed', () => {
    expect(seededShuffleIndices(6, 'same-seed')).toEqual(seededShuffleIndices(6, 'same-seed'));
  });

  it('varies output for different seeds', () => {
    const a = seededShuffleIndices(8, 'seed-a');
    const b = seededShuffleIndices(8, 'seed-b');

    expect(a).not.toEqual(b);
  });
});

describe('pickDistinct', () => {
  const items = ['cat', 'dog', 'fish', 'bird', 'rabbit'];

  it('picks the requested count of distinct items, excluding the given key', () => {
    const result = pickDistinct(items, (i) => i, ['cat'], 3, 'seed');

    expect(result).toHaveLength(3);
    expect(new Set(result).size).toBe(3);
    expect(result).not.toContain('cat');
  });

  it('never returns an excluded item even across many seeds', () => {
    for (let i = 0; i < 20; i++) {
      const result = pickDistinct(items, (x) => x, ['dog'], 2, `seed-${i}`);
      expect(result).not.toContain('dog');
    }
  });
});
