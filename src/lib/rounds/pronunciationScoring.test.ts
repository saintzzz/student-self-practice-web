import { describe, expect, it } from 'vitest';
import {
  PRONUNCIATION_CORRECT_THRESHOLD,
  levenshteinDistance,
  normalizeForPronunciationComparison,
  scorePronunciationAttempt,
} from './pronunciationScoring';

describe('normalizeForPronunciationComparison', () => {
  it('lowercases, trims and collapses whitespace', () => {
    expect(normalizeForPronunciationComparison('  Cat  ')).toBe('cat');
    expect(normalizeForPronunciationComparison('Big   Dog')).toBe('big dog');
  });

  it('strips punctuation', () => {
    expect(normalizeForPronunciationComparison('Cat!')).toBe('cat');
    expect(normalizeForPronunciationComparison("It's a cat.")).toBe('its a cat');
  });
});

describe('levenshteinDistance', () => {
  it('is 0 for identical strings', () => {
    expect(levenshteinDistance('cat', 'cat')).toBe(0);
  });

  it('is the length of the other string when one is empty', () => {
    expect(levenshteinDistance('', 'cat')).toBe(3);
    expect(levenshteinDistance('cat', '')).toBe(3);
  });

  it('counts a single substitution as distance 1', () => {
    expect(levenshteinDistance('cat', 'cot')).toBe(1);
  });

  it('counts a single insertion/deletion as distance 1', () => {
    expect(levenshteinDistance('cat', 'cats')).toBe(1);
    expect(levenshteinDistance('cats', 'cat')).toBe(1);
  });

  it('handles totally different strings', () => {
    expect(levenshteinDistance('cat', 'elephant')).toBeGreaterThanOrEqual(6);
  });
});

describe('scorePronunciationAttempt', () => {
  it('gives full credit (100, correct) for an exact match', () => {
    const result = scorePronunciationAttempt('cat', 'cat');
    expect(result.score).toBe(100);
    expect(result.isCorrect).toBe(true);
  });

  it('gives full credit for an exact match after normalization (case/punctuation)', () => {
    const result = scorePronunciationAttempt('cat', 'Cat!');
    expect(result.score).toBe(100);
    expect(result.isCorrect).toBe(true);
  });

  it('gives zero score and incorrect for an empty transcript', () => {
    const result = scorePronunciationAttempt('cat', '');
    expect(result.score).toBe(0);
    expect(result.isCorrect).toBe(false);
  });

  it('gives zero score and incorrect for a whitespace-only transcript', () => {
    const result = scorePronunciationAttempt('cat', '   ');
    expect(result.score).toBe(0);
    expect(result.isCorrect).toBe(false);
  });

  it('gives high partial credit and marks correct for a 1-letter-off close attempt on a short word', () => {
    // "cat" vs "kat": distance 1, maxLength 3 -> score round((1 - 1/3) * 100) = 67.
    const result = scorePronunciationAttempt('cat', 'kat');
    expect(result.score).toBe(67);
    expect(result.isCorrect).toBe(false);
  });

  it('marks correct once the score clears the threshold for a longer close attempt', () => {
    // "elephant" (8) vs "elephent" (8): distance 1, maxLength 8 -> score round((1 - 1/8) * 100) = 88.
    const result = scorePronunciationAttempt('elephant', 'elephent');
    expect(result.score).toBe(88);
    expect(result.score).toBeGreaterThanOrEqual(PRONUNCIATION_CORRECT_THRESHOLD);
    expect(result.isCorrect).toBe(true);
  });

  it('gives a low score and marks incorrect for a completely different word', () => {
    const result = scorePronunciationAttempt('cat', 'elephant');
    expect(result.score).toBeLessThan(PRONUNCIATION_CORRECT_THRESHOLD);
    expect(result.isCorrect).toBe(false);
  });

  it('never returns a score outside [0, 100]', () => {
    const cases: Array<[string, string]> = [
      ['a', 'zzzzzzzzzzzzzzzz'],
      ['cat', 'cat'],
      ['dog', ''],
      ['elephant', 'e'],
    ];

    for (const [target, transcript] of cases) {
      const { score } = scorePronunciationAttempt(target, transcript);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
