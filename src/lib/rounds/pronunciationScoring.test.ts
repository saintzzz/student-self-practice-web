import { describe, expect, it } from 'vitest';
import {
  PRONUNCIATION_CORRECT_THRESHOLD,
  assessAmbiguousRetry,
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

  describe('digit transcripts (CR-75)', () => {
    it.each([
      ['one', '1'],
      ['one', '1.'],
      ['two', '2'],
      ['five', '5!'],
      ['ten', '10'],
      ['seven', '7'],
    ])('scores a digitized transcript as an exact match: %s vs %j', (target, transcript) => {
      const result = scorePronunciationAttempt(target, transcript);
      expect(result.score).toBe(100);
      expect(result.isCorrect).toBe(true);
    });

    it('accepts a digitized alternative transcript when the primary is off', () => {
      const result = scorePronunciationAttempt('eight', 'ate', { alternatives: ['8'] });
      expect(result.score).toBe(100);
      expect(result.isCorrect).toBe(true);
    });

    it('does not let digits rescue an unrelated word', () => {
      const result = scorePronunciationAttempt('cat', '5');
      expect(result.isCorrect).toBe(false);
    });

    it('maps digit tokens inside a longer transcript', () => {
      expect(normalizeForPronunciationComparison('number 4.')).toBe('number four');
    });

    it.each([
      ['ten', '1.0'],
      ['fifteen', '1.5'],
      ['ten', '10:00'],
    ])('does not fuse fused digits+interior punctuation into a word: %s vs %j', (target, transcript) => {
      expect(scorePronunciationAttempt(target, transcript).isCorrect).toBe(false);
    });
  });

  describe('phoneme gate (CR-90)', () => {
    // The corpus failure mode: a recognizer hears a DIFFERENT real word
    // ("cut" for "cat") and text similarity alone lets it pass. With
    // IPA/G2P phoneme comparison those must fail regardless of spelling.
    it.each([
      ['cat', 'cut'],
      ['ship', 'sheep'],
      ['bad', 'bed'],
      ['three', 'tree'],
      ['pig', 'big'],
      ['rice', 'lice'],
      ['elephant', 'elegant'],
      ['bed', 'bird'],
      ['pen', 'hen'],
      ['school', 'skull'],
      ['dog', 'doll'],
      ['egg', 'leg'],
      ['fish', 'fit'],
    ])('fails the wrong-word transcript %s heard as %s', (target, heard) => {
      const result = scorePronunciationAttempt(target, heard);
      expect(result.score).toBeLessThan(PRONUNCIATION_CORRECT_THRESHOLD);
      expect(result.isCorrect).toBe(false);
    });

    it('still accepts a homophone the recognizer spelled differently', () => {
      // "eight" heard as "ate": identical phonemes, must pass.
      expect(scorePronunciationAttempt('eight', 'ate').isCorrect).toBe(true);
    });

    it('does not floor an incomplete phrase that covers only one target token (r49)', () => {
      // "red apple" said as "red": best token-pair is identical, but
      // "apple" was never said - no homophone rescue.
      const result = scorePronunciationAttempt('red apple', 'red');
      expect(result.isCorrect).toBe(false);
    });

    it.each([
      // r51: the floor must respect word ORDER and repetition too.
      ['red apple', 'apple red'],
      ['no no', 'know'],
    ])('does not floor a reordered or shrunken homophone-ish attempt: %s vs %s', (target, heard) => {
      expect(scorePronunciationAttempt(target, heard).isCorrect).toBe(false);
    });

    it('still floors a complete multi-word homophone match', () => {
      expect(scorePronunciationAttempt('red apple', 'read apple').isCorrect).toBe(true);
    });

    it('accepts a differently-spelled phonetic match (recognizer respelling)', () => {
      expect(scorePronunciationAttempt('cat', 'kat').isCorrect).toBe(true);
    });
  });

  describe('server assess verdict (CR-90)', () => {
    it('uses the provider accuracy as the score outright', () => {
      const result = scorePronunciationAttempt('ship', 'chip', { serverScore: 95 });
      expect(result.score).toBe(95);
      expect(result.isCorrect).toBe(true);
    });

    it('fails a distorted-word verdict below the assess bar', () => {
      const result = scorePronunciationAttempt('cat', 'cut', { serverScore: 60 });
      expect(result.score).toBe(60);
      expect(result.isCorrect).toBe(false);
    });

    it('rejects accuracy in the ambiguous 70-84 band (strict audio bar)', () => {
      // big-for-pig graded 80 by the provider - recognizable but not clean.
      const result = scorePronunciationAttempt('pig', 'big', { serverScore: 80 });
      expect(result.isCorrect).toBe(false);
    });

    it('passes accuracy at the assess bar', () => {
      expect(scorePronunciationAttempt('pig', 'pig', { serverScore: 85 }).isCorrect).toBe(true);
    });

    it('ignores the transcript entirely when serverScore is present', () => {
      // Even a perfect transcript cannot rescue a bad audio verdict -
      // the provider heard the real audio and scored it low.
      expect(scorePronunciationAttempt('cat', 'cat', { serverScore: 30 }).isCorrect).toBe(false);
      expect(scorePronunciationAttempt('cat', 'cat', { serverScore: 30 }).score).toBe(30);
    });

    it('clamps an out-of-range provider accuracy into 0-100', () => {
      expect(scorePronunciationAttempt('cat', 'cat', { serverScore: 150 }).score).toBe(100);
      expect(scorePronunciationAttempt('cat', 'cat', { serverScore: -5 }).score).toBe(0);
    });

    it('falls back to text scoring when serverScore is absent or invalid', () => {
      expect(scorePronunciationAttempt('cat', 'cat', { serverScore: NaN }).score).toBe(100);
      expect(scorePronunciationAttempt('cat', 'cat', {}).score).toBe(100);
    });

    it('never inflates a below-bar verdict on alternatives alone (r60)', () => {
      // The same target-aware model emits heard_alt - not independent
      // evidence. Ambiguity buys a retry, not a pass.
      const result = scorePronunciationAttempt('hen', 'pen', {
        serverScore: 60,
        alternatives: ['hen'],
      });
      expect(result.score).toBe(60);
      expect(result.isCorrect).toBe(false);
    });
  });

  describe('assessAmbiguousRetry (CR-90 follow-up, r60)', () => {
    it('flags a grey-band verdict whose alternatives contain the target sound', () => {
      // Provider heard "pen" top-1 at 60 for target "hen" but offered
      // "hen" as another reading - ambiguous enough for a free retry.
      expect(assessAmbiguousRetry('hen', 60, ['hen', 'when'])).toBe(true);
    });

    it('requires the phoneme-complete match - a merely similar word is not ambiguity', () => {
      expect(assessAmbiguousRetry('elephant', 60, ['effen'])).toBe(false);
      expect(assessAmbiguousRetry('cat', 60, ['cut', 'cot'])).toBe(false);
    });

    it('never fires at or above the assess pass bar', () => {
      expect(assessAmbiguousRetry('hen', 85, ['hen'])).toBe(false);
      expect(assessAmbiguousRetry('hen', 90, ['hen'])).toBe(false);
    });

    it('never fires on a garbage verdict - score below the floor means noise', () => {
      expect(assessAmbiguousRetry('hen', 30, ['hen'])).toBe(false);
      expect(assessAmbiguousRetry('hen', 49, ['hen'])).toBe(false);
    });

    it('never fires without alternatives or a score', () => {
      expect(assessAmbiguousRetry('hen', 60, [])).toBe(false);
      expect(assessAmbiguousRetry('hen', 60, undefined)).toBe(false);
      expect(assessAmbiguousRetry('hen', undefined, ['hen'])).toBe(false);
      expect(assessAmbiguousRetry('hen', NaN, ['hen'])).toBe(false);
    });
  });
});

