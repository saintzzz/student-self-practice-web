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

  it('CR-82: every land carries a horizonGlow rgba', () => {
    for (const land of Object.values(LANDS)) {
      expect(land.horizonGlow).toMatch(/^rgba\(/);
    }
  });

  it('CR-82 (OM-6): city is orange/navy, space keeps the closed violet inventory', () => {
    expect(LANDS.city.nightRim).toBe('bg-orange-300');
    expect(LANDS.city.cardTint).toBe('bg-orange-50/95');
    expect(LANDS.city.accentText).toBe('text-orange-800');
    expect(LANDS.city.pageGradient).not.toContain('indigo');
    expect(LANDS.space.pageGradient).not.toContain('violet');
    expect(LANDS.space.nightRim).toBe('bg-violet-400');
    expect(LANDS.space.discBg).toBe('bg-violet-500');
    expect(LANDS.space.cardTint).toBe('bg-violet-50/95');
    expect(LANDS.space.accentText).toBe('text-violet-800');
  });
});
