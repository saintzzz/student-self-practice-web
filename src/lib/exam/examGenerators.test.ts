import { describe, expect, it } from 'vitest';
import { generateWordOrderQuestions, isWordOrderCorrect, tokenizeSentence } from './wordOrder';
import { generateOddPronunciationQuestions } from './oddPronunciation';
import { generateMissingLetterQuestions } from './missingLetter';
import { generateGrammarMcqQuestions, generateTrueFalseQuestions } from './englishGenerators';
import { generateMathQuestions } from './mathEnglish';
import { generateScienceQuestions } from './scienceQuestions';
import { getWordsByGrade } from '../../data/vocabulary';

const WORDS = getWordsByGrade('grade-4');

describe('word-order', () => {
  const questions = generateWordOrderQuestions(WORDS);

  it('generates questions with shuffled tiles that are not already in order', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.tiles.join(' ')).not.toBe(q.sentence);
      expect([...q.tiles].sort()).toEqual([...tokenizeSentence(q.sentence)].sort());
    }
  });

  it('isWordOrderCorrect accepts the correct ordering and rejects swaps', () => {
    const q = questions[0]!;
    // Rebuild the correct order by matching tiles back to the sentence.
    const correct = tokenizeSentence(q.sentence);
    expect(isWordOrderCorrect(q.sentence, correct)).toBe(true);
    const swapped = [...correct];
    [swapped[0], swapped[1]] = [swapped[1]!, swapped[0]!];
    // Only assert when the swap actually changes the sequence.
    if (swapped.join(' ') !== correct.join(' ')) {
      expect(isWordOrderCorrect(q.sentence, swapped)).toBe(false);
    }
  });
});

describe('odd-pronunciation', () => {
  const questions = generateOddPronunciationQuestions(WORDS);

  it('produces 4 distinct options with exactly one correctIndex', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(new Set(q.options).size).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  });
});

describe('missing-letter', () => {
  const questions = generateMissingLetterQuestions(WORDS);

  it('masks a contiguous run and keeps the full word as answer', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.word.length).toBeGreaterThanOrEqual(4);
      expect(q.missing.length).toBeGreaterThan(0);
      expect(q.word.includes(q.missing)).toBe(true);
      expect(q.maskedWord).toContain('___');
      expect(q.displaySentence).toContain('___');
    }
  });
});

describe('grammar + reading banks', () => {
  it('grammar-mcq items carry 4 options and a valid correctIndex', () => {
    const qs = generateGrammarMcqQuestions('grade-4');
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      expect(q.options.length).toBe(4);
      expect(q.prompt).toContain('___');
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  });

  it('true-false items carry a passage, a statement and an explanation', () => {
    const qs = generateTrueFalseQuestions('grade-4');
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      expect(q.passage.length).toBeGreaterThan(20);
      expect(typeof q.answer).toBe('boolean');
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  });
});

describe('math program', () => {
  it('generates a large deterministic pool in English wording', () => {
    const a = generateMathQuestions('grade-4', 'seed');
    const b = generateMathQuestions('grade-4', 'seed');
    expect(a.length).toBeGreaterThan(50);
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
    for (const q of a) {
      if (q.kind === 'text-answer') {
        expect(q.displaySentence).toContain('___');
        expect(q.accept.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('science program', () => {
  it('expands authored facts into mcq + true-false + fill-in questions', () => {
    const qs = generateScienceQuestions('grade-4');
    expect(qs.length).toBeGreaterThan(20);
    const kinds = new Set(qs.map((q) => q.kind));
    expect(kinds.has('grammar-mcq')).toBe(true);
    expect(kinds.has('true-false-reading')).toBe(true);
    for (const q of qs) {
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  });
});
