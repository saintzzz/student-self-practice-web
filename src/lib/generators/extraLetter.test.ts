import { describe, expect, it } from 'vitest';
import type { VocabWord } from '../../types';
import { ALL_WORDS } from '../../data/vocabulary';
import { COMMON_ENGLISH_WORDS } from '../../data/commonEnglishWords';
import { generateExtraLetterQuestions, generateExtraLetterVariants } from './extraLetter';

/** Removes the letter at extraIndex and rejoins - must recover the original word. */
function removeExtraLetter(displayLetters: string[], extraIndex: number): string {
  return displayLetters.filter((_, i) => i !== extraIndex).join('');
}

describe('generateExtraLetterVariants', () => {
  it('generates exactly one extra letter per variant, recoverable by removing it (core invariant)', () => {
    const words = ['cat', 'bird', 'rabbit', 'monkey', 'chicken'];

    for (const word of words) {
      const variants = generateExtraLetterVariants(word);
      expect(variants.length).toBeGreaterThan(0);

      for (const variant of variants) {
        expect(variant.displayLetters).toHaveLength(word.length + 1);
        expect(removeExtraLetter(variant.displayLetters, variant.extraIndex)).toBe(word);
        expect(variant.extraLetter).toHaveLength(1);
        expect(variant.displayLetters[variant.extraIndex]).toBe(variant.extraLetter);
      }
    }
  });

  it('generates at least 2 variants per eligible word', () => {
    expect(generateExtraLetterVariants('cat').length).toBeGreaterThanOrEqual(2);
    expect(generateExtraLetterVariants('chicken').length).toBeGreaterThanOrEqual(2);
  });

  it('caps variants at 4 even for the longest eligible words', () => {
    expect(generateExtraLetterVariants('chicken').length).toBeLessThanOrEqual(4);
  });

  it('varies the insertion position across variants (not always the same spot)', () => {
    const variants = generateExtraLetterVariants('monkey');
    const positions = new Set(variants.map((v) => v.extraIndex));

    expect(positions.size).toBe(variants.length);
  });

  it('returns no variants for words shorter than 3 letters', () => {
    expect(generateExtraLetterVariants('a')).toHaveLength(0);
    expect(generateExtraLetterVariants('at')).toHaveLength(0);
  });

  it('returns no variants for words longer than 7 letters', () => {
    expect(generateExtraLetterVariants('elephant')).toHaveLength(0);
    expect(generateExtraLetterVariants('watermelon')).toHaveLength(0);
  });

  it('is deterministic across repeated calls (same seed inputs -> same output)', () => {
    const first = generateExtraLetterVariants('rabbit');
    const second = generateExtraLetterVariants('rabbit');

    expect(first).toEqual(second);
  });

  /**
   * Regression test for a real bug reported by a student (2026-09-08):
   * "pear" (+ inserted "t" before it) produced "tpear", where removing the
   * "t" gives "pear" (intended) but removing the "p" instead gives "tear" -
   * also a real word, so there was no way to tell from the letters alone
   * which removal was "correct". No variant of "pear" may ever have another
   * removable position that also spells a different common English word.
   */
  it('never produces an ambiguous "pear"/"tear"-style puzzle (regression, reported 2026-09-08)', () => {
    const variants = generateExtraLetterVariants('pear');
    expect(variants.length).toBeGreaterThan(0);

    for (const variant of variants) {
      for (let i = 0; i < variant.displayLetters.length; i++) {
        if (i === variant.extraIndex) continue;
        const alternateRemoval = variant.displayLetters.filter((_, j) => j !== i).join('');
        expect(COMMON_ENGLISH_WORDS.has(alternateRemoval) && alternateRemoval !== 'pear').toBe(false);
      }
    }
  });

  /**
   * Broad regression sweep over every real word this app can generate an
   * extra-letter question from (not just a hand-picked example) - the
   * "pear"/"tear" bug was only found by a student playing the live app,
   * meaning no existing test covered this class of bug at all. Every
   * variant of every eligible vocab word must be unambiguous.
   */
  it('produces zero ambiguous variants across the entire real vocabulary bank', () => {
    const ambiguousExamples: string[] = [];

    for (const word of ALL_WORDS) {
      const variants = generateExtraLetterVariants(word.word);
      for (const variant of variants) {
        for (let i = 0; i < variant.displayLetters.length; i++) {
          if (i === variant.extraIndex) continue;
          const alternateRemoval = variant.displayLetters.filter((_, j) => j !== i).join('');
          if (COMMON_ENGLISH_WORDS.has(alternateRemoval) && alternateRemoval !== word.word) {
            ambiguousExamples.push(
              `"${variant.displayLetters.join('')}" (intended "${word.word}") also removes to real word "${alternateRemoval}"`,
            );
          }
        }
      }
    }

    expect(ambiguousExamples, ambiguousExamples.join('; ')).toEqual([]);
  });
});

describe('generateExtraLetterQuestions', () => {
  const words: VocabWord[] = [
    { id: 'cat', topicId: 't1', word: 'cat', emoji: '🐱', countable: true, explanation: 'Con mèo tiếng Anh là "cat".' },
    { id: 'elephant', topicId: 't1', word: 'elephant', emoji: '🐘', countable: true, explanation: 'Con voi tiếng Anh là "elephant".' },
  ];

  it('skips words outside the 3-7 letter range while keeping eligible ones', () => {
    const questions = generateExtraLetterQuestions(words);

    expect(questions.every((q) => q.correctWord === 'cat')).toBe(true);
    expect(questions.length).toBeGreaterThanOrEqual(2);
  });

  it('sets kind, topicId, correctWord and includes the extra letter in the explanation', () => {
    const [question] = generateExtraLetterQuestions(words);

    expect(question?.kind).toBe('extra-letter');
    expect(question?.topicId).toBe('t1');
    expect(question?.correctWord).toBe('cat');
    expect(question?.explanation).toContain('Chữ cái thừa là');
  });

  it('assigns unique ids across all generated variants', () => {
    const questions = generateExtraLetterQuestions(words);
    const ids = new Set(questions.map((q) => q.id));

    expect(ids.size).toBe(questions.length);
  });
});
