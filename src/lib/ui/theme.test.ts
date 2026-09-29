import { describe, expect, it } from 'vitest';
import { getLand, LANDS } from './theme';
import { GRADES } from '../../data/vocabulary';

describe('theme map (AC-T2)', () => {
  it('covers all five grades with distinct lands', () => {
    const keys = GRADES.map((g) => getLand(g.id).key);
    expect(new Set(keys).size).toBe(5);
    expect(keys).toEqual(['playground', 'town', 'jungle', 'city', 'space']);
  });

  it('falls back to the sky land for unknown/missing grades', () => {
    expect(getLand(null).key).toBe('sky');
    expect(getLand(undefined).key).toBe('sky');
    expect(getLand('grade-99').key).toBe('sky');
  });

  it('every land has VN name, gradient, card tint and disc color', () => {
    for (const land of Object.values(LANDS)) {
      expect(land.nameVi.length).toBeGreaterThan(0);
      expect(land.pageGradient).toContain('bg-gradient');
      expect(land.cardTint).toContain('bg-');
      expect(land.discBg).toContain('bg-');
      expect(land.cardRing).toContain('ring-');
    }
  });
});
