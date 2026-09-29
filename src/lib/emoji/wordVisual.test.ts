import { describe, expect, it } from 'vitest';
import { ALL_WORDS } from '../../data/vocabulary';
import { getWordVisual } from './wordVisual';

describe('getWordVisual (ADR-5)', () => {
  it('resolves emoji for every word in the bank', () => {
    for (const w of ALL_WORDS) {
      expect(getWordVisual(w.id)?.emoji).toBe(w.emoji);
    }
  });

  it('returns undefined for unknown ids', () => {
    expect(getWordVisual('not-a-word')).toBeUndefined();
    expect(getWordVisual('')).toBeUndefined();
  });

  it('imageUrl only present on approved words and stays same-origin', () => {
    for (const w of ALL_WORDS) {
      const visual = getWordVisual(w.id);
      if (w.imageUrl) {
        expect(visual?.imageUrl).toBe(w.imageUrl);
        expect(visual?.imageUrl).toMatch(/^\/?images\/vocab\//);
      } else {
        expect(visual?.imageUrl).toBeUndefined();
      }
    }
  });
});
