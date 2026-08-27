import { describe, expect, it } from 'vitest';
import type { VocabWord } from '../../types';
import { generateCountingImageQuestions } from './countingImage';

const CAT: VocabWord = { id: 'cat', topicId: 't1', word: 'cat', plural: 'cats', emoji: '🐱', countable: true, explanation: 'e1' };
const DOG: VocabWord = { id: 'dog', topicId: 't1', word: 'dog', plural: 'dogs', emoji: '🐶', countable: true, explanation: 'e2' };
const BIRD: VocabWord = { id: 'bird', topicId: 't1', word: 'bird', plural: 'birds', emoji: '🐦', countable: true, explanation: 'e3' };
const RED: VocabWord = { id: 'red', topicId: 't1', word: 'red', emoji: '🔴', countable: false, explanation: 'e4' };

const TOPIC_WORDS = [CAT, DOG, BIRD, RED];

function optionKey(option: { word: string; count: number }): string {
  return `${option.word}-${option.count}`;
}

describe('generateCountingImageQuestions', () => {
  it('generates 2 directions x 5 counts per countable word, skipping non-countable words', () => {
    const questions = generateCountingImageQuestions(TOPIC_WORDS);

    // 3 countable words x 5 counts x 2 directions
    expect(questions).toHaveLength(30);
    expect(questions.every((q) => q.prompt.word !== 'red')).toBe(true);
  });

  it('includes both count-to-image and image-to-count instances', () => {
    const questions = generateCountingImageQuestions(TOPIC_WORDS);
    const directions = new Set(questions.map((q) => q.direction));

    expect(directions).toEqual(new Set(['count-to-image', 'image-to-count']));
  });

  it('spreads counts 1-5 for each word', () => {
    const questions = generateCountingImageQuestions(TOPIC_WORDS);
    const catCounts = questions
      .filter((q) => q.prompt.word === 'cat' && q.direction === 'count-to-image')
      .map((q) => q.prompt.count)
      .sort((a, b) => a - b);

    expect(catCounts).toEqual([1, 2, 3, 4, 5]);
  });

  it('places the correct combination at correctIndex among the 4 options', () => {
    const questions = generateCountingImageQuestions(TOPIC_WORDS);

    for (const question of questions) {
      const correctOption = question.options[question.correctIndex];
      expect(correctOption).toEqual(question.prompt);
    }
  });

  it('includes at least one same-object-wrong-count distractor per instance (AC12/AC13)', () => {
    const questions = generateCountingImageQuestions(TOPIC_WORDS);

    for (const question of questions) {
      const sameObjectWrongCount = question.options.some(
        (o) => o.word === question.prompt.word && o.count !== question.prompt.count,
      );
      expect(sameObjectWrongCount).toBe(true);
    }
  });

  it('includes at least one wrong-object distractor per instance (AC12/AC13)', () => {
    const questions = generateCountingImageQuestions(TOPIC_WORDS);

    for (const question of questions) {
      const wrongObject = question.options.some((o) => o.word !== question.prompt.word);
      expect(wrongObject).toBe(true);
    }
  });

  it('never produces duplicate (word,count) pairs among the 4 options', () => {
    const questions = generateCountingImageQuestions(TOPIC_WORDS);

    for (const question of questions) {
      const keys = question.options.map(optionKey);
      expect(new Set(keys).size).toBe(4);
    }
  });

  it('returns no instances when the topic has no countable words', () => {
    expect(generateCountingImageQuestions([RED])).toHaveLength(0);
  });

  it('is deterministic across repeated calls', () => {
    const first = generateCountingImageQuestions(TOPIC_WORDS);
    const second = generateCountingImageQuestions(TOPIC_WORDS);

    expect(first).toEqual(second);
  });
});
