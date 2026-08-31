import { describe, expect, it } from 'vitest';
import type { VocabWord } from '../../types';
import { generateDescribeAndChooseImageQuestions } from './describeAndChooseImage';

const CAT: VocabWord = { id: 'cat', topicId: 't1', word: 'cat', plural: 'cats', emoji: '🐱', countable: true, explanation: 'e1' };
const DOG: VocabWord = { id: 'dog', topicId: 't1', word: 'dog', plural: 'dogs', emoji: '🐶', countable: true, explanation: 'e2' };
const BIRD: VocabWord = { id: 'bird', topicId: 't1', word: 'bird', plural: 'birds', emoji: '🐦', countable: true, explanation: 'e3' };
const ELEPHANT: VocabWord = {
  id: 'elephant',
  topicId: 't1',
  word: 'elephant',
  plural: 'elephants',
  emoji: '🐘',
  countable: true,
  explanation: 'e4',
};
const RED: VocabWord = { id: 'red', topicId: 't1', word: 'red', emoji: '🔴', countable: false, explanation: 'e5' };

const WORDS = [CAT, DOG, BIRD, ELEPHANT, RED];

function optionKey(option: { word: string; count: number }): string {
  return `${option.word}-${option.count}`;
}

describe('generateDescribeAndChooseImageQuestions - count items', () => {
  const questions = generateDescribeAndChooseImageQuestions(WORDS).filter((q) => q.descriptionType === 'count');

  it('generates a 1-5 count spread per countable word, skipping non-countable words', () => {
    expect(questions).toHaveLength(4 * 5); // 4 countable words x 5 counts
    expect(questions.every((q) => q.options.every((o) => o.word !== 'red'))).toBe(true);
  });

  it('uses "There is a X." for count 1 and "There are N Xs." otherwise', () => {
    const singular = questions.find((q) => q.options[q.correctIndex].count === 1 && q.options[q.correctIndex].word === 'cat');
    const plural = questions.find((q) => q.options[q.correctIndex].count === 3 && q.options[q.correctIndex].word === 'cat');

    expect(singular?.sentence).toBe('There is a cat.');
    expect(plural?.sentence).toBe('There are 3 cats.');
  });

  it('uses "an" before a vowel-initial word', () => {
    const singularElephant = questions.find(
      (q) => q.options[q.correctIndex].word === 'elephant' && q.options[q.correctIndex].count === 1,
    );
    expect(singularElephant?.sentence).toBe('There is an elephant.');
  });

  it('places the correct option at correctIndex, matching the described object and count', () => {
    for (const q of questions) {
      const correctOption = q.options[q.correctIndex];
      expect(q.sentence).toContain(correctOption.count === 1 ? correctOption.word : String(correctOption.count));
    }
  });

  it('includes at least one same-object-wrong-count distractor per instance (reused counting-image rule)', () => {
    for (const q of questions) {
      const correct = q.options[q.correctIndex];
      const sameObjectWrongCount = q.options.some((o) => o.word === correct.word && o.count !== correct.count);
      expect(sameObjectWrongCount).toBe(true);
    }
  });

  it('includes at least one wrong-object distractor per instance (reused counting-image rule)', () => {
    for (const q of questions) {
      const correct = q.options[q.correctIndex];
      const wrongObject = q.options.some((o) => o.word !== correct.word);
      expect(wrongObject).toBe(true);
    }
  });

  it('never produces duplicate (word,count) option pairs within one instance', () => {
    for (const q of questions) {
      const keys = q.options.map(optionKey);
      expect(new Set(keys).size).toBe(4);
    }
  });
});

describe('generateDescribeAndChooseImageQuestions - negation items (Round 4 Negation Design, the core invariant)', () => {
  const questions = generateDescribeAndChooseImageQuestions(WORDS).filter((q) => q.descriptionType === 'negation');

  it('generates exactly one negation instance per countable word (when another countable word exists)', () => {
    expect(questions).toHaveLength(4);
  });

  it('every negation instance has exactly one option depicting zero of the negated word, the other three at least one', () => {
    expect(questions.length).toBeGreaterThan(0);

    for (const q of questions) {
      const wordCounts = new Map<string, number>();
      for (const option of q.options) {
        wordCounts.set(option.word, (wordCounts.get(option.word) ?? 0) + 1);
      }

      // Exactly 2 distinct words among the 4 options: the negated word (x3) and one other object (x1).
      expect(wordCounts.size).toBe(2);

      const majorityEntry = [...wordCounts.entries()].find(([, count]) => count === 3);
      const minorityEntry = [...wordCounts.entries()].find(([, count]) => count === 1);
      expect(majorityEntry, 'expected exactly 3 options to depict the negated word').toBeDefined();
      expect(minorityEntry, 'expected exactly 1 option to depict a different object entirely').toBeDefined();

      const [minorityWord] = minorityEntry!;
      // The single correct answer is the minority (different-object, zero-of-negated-word) option.
      expect(q.options[q.correctIndex].word).toBe(minorityWord);
    }
  });

  it('the 3 same-negated-word distractor options have 3 distinct counts (no duplicate options)', () => {
    for (const q of questions) {
      const negatedWordOptions = q.options.filter((_, i) => i !== q.correctIndex);
      const counts = negatedWordOptions.map((o) => o.count);
      expect(new Set(counts).size).toBe(3);
      for (const count of counts) {
        expect(count).toBeGreaterThanOrEqual(1);
        expect(count).toBeLessThanOrEqual(4);
      }
    }
  });

  it('the sentence names the negated (majority) word, using "isn\'t" negation grammar', () => {
    for (const q of questions) {
      const negatedWordOption = q.options.find((_, i) => i !== q.correctIndex)!;
      expect(q.sentence).toContain("isn't");
      expect(q.sentence.toLowerCase()).toContain(negatedWordOption.word.toLowerCase());
    }
  });

  it('does not generate a negation instance when no other countable word exists in the pool', () => {
    const singleWordPool = generateDescribeAndChooseImageQuestions([CAT]);
    expect(singleWordPool.some((q) => q.descriptionType === 'negation')).toBe(false);
    // The count instances (5 of them) still generate fine.
    expect(singleWordPool).toHaveLength(5);
  });
});

describe('generateDescribeAndChooseImageQuestions - general', () => {
  it('is deterministic across repeated calls', () => {
    const first = generateDescribeAndChooseImageQuestions(WORDS);
    const second = generateDescribeAndChooseImageQuestions(WORDS);

    expect(first).toEqual(second);
  });

  it('assigns unique ids across the whole generated pool', () => {
    const questions = generateDescribeAndChooseImageQuestions(WORDS);
    const ids = new Set(questions.map((q) => q.id));

    expect(ids.size).toBe(questions.length);
  });

  it('returns no instances when there are no countable words', () => {
    expect(generateDescribeAndChooseImageQuestions([RED])).toHaveLength(0);
  });

  it('carries topicId and a non-empty explanation on every instance', () => {
    for (const q of generateDescribeAndChooseImageQuestions(WORDS)) {
      expect(q.topicId).toBe('t1');
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  });
});
