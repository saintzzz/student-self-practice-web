import { describe, expect, it } from 'vitest';
import {
  PRONUNCIATION_CORRECT_THRESHOLD,
  levenshteinDistance,
  normalizeForPronunciationComparison,
  phoneticSimilarity,
  scorePronunciationAttempt,
  simplifiedPhoneticCode,
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

describe('simplifiedPhoneticCode', () => {
  it('drops vowels and maps consonants to sound groups, including the first letter', () => {
    // c and t both map to their groups; a is a dropped vowel.
    expect(simplifiedPhoneticCode('cat')).toBe('23');
  });

  it('gives homophone-style spelling variants the same code', () => {
    // "cat" vs "kat" - c and k are in the same consonant group (2), unlike classic Soundex
    // which would preserve the literal first letter and treat these as different.
    expect(simplifiedPhoneticCode('cat')).toBe(simplifiedPhoneticCode('kat'));
    // "phone" vs "fone" - the "ph" -> "f" digraph normalization makes these identical.
    expect(simplifiedPhoneticCode('phone')).toBe(simplifiedPhoneticCode('fone'));
    // "smith" vs "smyth" - the classic textbook Soundex example.
    expect(simplifiedPhoneticCode('smith')).toBe(simplifiedPhoneticCode('smyth'));
  });

  it('collapses consecutive duplicate digits', () => {
    expect(simplifiedPhoneticCode('mommy')).toBe(simplifiedPhoneticCode('momy'));
  });

  it('returns an empty code for a string with no consonant sounds', () => {
    expect(simplifiedPhoneticCode('aeiou')).toBe('');
    expect(simplifiedPhoneticCode('')).toBe('');
  });
});

describe('phoneticSimilarity', () => {
  it('is 1 for identical phonetic codes', () => {
    expect(phoneticSimilarity('cat', 'kat')).toBe(1);
  });

  it('is 1 when both words have no consonant sounds (neutral, not penalized)', () => {
    expect(phoneticSimilarity('aeiou', 'oeiua')).toBe(1);
  });

  it('is 0 when only one side has consonant sounds', () => {
    expect(phoneticSimilarity('cat', 'aeiou')).toBe(0);
  });

  it('is between 0 and 1 for partially similar codes', () => {
    const similarity = phoneticSimilarity('night', 'nite');
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });
});

describe('scorePronunciationAttempt', () => {
  describe('backward-compatible two-argument signature (no breaking change)', () => {
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

    it('marks correct once the score clears the threshold for a longer close attempt', () => {
      const result = scorePronunciationAttempt('elephant', 'elephent');
      expect(result.score).toBeGreaterThanOrEqual(PRONUNCIATION_CORRECT_THRESHOLD);
      expect(result.isCorrect).toBe(true);
    });
  });

  describe('phonetic similarity signal', () => {
    it('scores a differently-spelled, same-sounding attempt higher than pure edit distance would', () => {
      // "cat" vs "kat": edit distance 1 / maxLength 3 -> pure text similarity = round(66.67) = 67,
      // which is BELOW the 70 threshold (incorrect). The phonetic signal (identical code "23")
      // pulls the combined score up past the threshold, correctly crediting the phonetically-
      // identical, differently-spelled attempt a 7-year-old's speech recognizer commonly produces.
      const pureTextOnlyScore = Math.round((1 - levenshteinDistance('cat', 'kat') / 3) * 100);
      const result = scorePronunciationAttempt('cat', 'kat');

      expect(pureTextOnlyScore).toBe(67);
      expect(result.score).toBeGreaterThan(pureTextOnlyScore);
      expect(result.isCorrect).toBe(true);
    });

    it('still scores a clearly wrong attempt low despite the phonetic signal', () => {
      const result = scorePronunciationAttempt('cat', 'hippopotamus');
      expect(result.score).toBeLessThan(PRONUNCIATION_CORRECT_THRESHOLD);
      expect(result.isCorrect).toBe(false);
    });
  });

  describe('multiple alternative transcripts', () => {
    it('picks whichever candidate (transcript or an alternative) scores best', () => {
      const withoutAlternatives = scorePronunciationAttempt('cat', 'dog');
      const withAlternatives = scorePronunciationAttempt('cat', 'dog', { alternatives: ['banana', 'kat'] });
      const bestAlternativeAlone = scorePronunciationAttempt('cat', 'kat');

      expect(withoutAlternatives.score).toBeLessThan(PRONUNCIATION_CORRECT_THRESHOLD);
      expect(withAlternatives.score).toBe(bestAlternativeAlone.score);
      expect(withAlternatives.isCorrect).toBe(true);
    });

    it('falls back to a non-empty alternative when the primary transcript is empty', () => {
      const result = scorePronunciationAttempt('cat', '', { alternatives: ['cat'] });
      expect(result.score).toBe(100);
      expect(result.isCorrect).toBe(true);
    });

    it('returns zero score when both the transcript and every alternative are empty', () => {
      const result = scorePronunciationAttempt('cat', '', { alternatives: ['', '   '] });
      expect(result.score).toBe(0);
      expect(result.isCorrect).toBe(false);
    });

    it('handles an explicitly empty alternatives array the same as omitting it', () => {
      const withEmptyArray = scorePronunciationAttempt('cat', 'kat', { alternatives: [] });
      const withoutOption = scorePronunciationAttempt('cat', 'kat');
      expect(withEmptyArray.score).toBe(withoutOption.score);
      expect(withEmptyArray.isCorrect).toBe(withoutOption.isCorrect);
    });
  });

  describe('recognition confidence signal', () => {
    it('does not change an exact match, regardless of confidence', () => {
      const highConfidence = scorePronunciationAttempt('cat', 'cat', { confidence: 1 });
      const lowConfidence = scorePronunciationAttempt('cat', 'cat', { confidence: 0 });
      expect(highConfidence.score).toBe(100);
      expect(lowConfidence.score).toBe(100);
    });

    it('nudges a partial-credit score down for low confidence vs. high confidence', () => {
      const baseline = scorePronunciationAttempt('cat', 'kat');
      const highConfidence = scorePronunciationAttempt('cat', 'kat', { confidence: 1 });
      const lowConfidence = scorePronunciationAttempt('cat', 'kat', { confidence: 0 });

      // High confidence applies no reduction; low confidence applies a bounded reduction.
      expect(highConfidence.score).toBe(baseline.score);
      expect(lowConfidence.score).toBeLessThan(baseline.score);

      // The nudge is a "minor adjustment", not a dominant factor: it should not swing the
      // score by more than the documented 15% cap, and should not zero out a real match.
      const scoreDrop = baseline.score - lowConfidence.score;
      expect(scoreDrop).toBeGreaterThan(0);
      expect(scoreDrop).toBeLessThanOrEqual(Math.ceil(baseline.score * 0.15) + 1);
      expect(lowConfidence.score).toBeGreaterThan(0);
    });

    it('does not by itself change whether a low-confidence match crosses the correctness threshold when the underlying match is strong', () => {
      const result = scorePronunciationAttempt('elephant', 'elephent', { confidence: 0 });
      expect(result.isCorrect).toBe(true);
    });
  });
});
