import { describe, expect, it } from 'vitest';
import type { VocabWord } from '../../types';
import { generateImageChoiceQuestions } from './imageChoice';

const WORDS: VocabWord[] = [
  { id: 'cat', topicId: 't1', word: 'cat', emoji: '🐱', countable: true, explanation: 'e1' },
  { id: 'dog', topicId: 't1', word: 'dog', emoji: '🐶', countable: true, explanation: 'e2' },
  { id: 'fish', topicId: 't1', word: 'fish', emoji: '🐟', countable: true, explanation: 'e3' },
  { id: 'bird', topicId: 't1', word: 'bird', emoji: '🐦', countable: true, explanation: 'e4' },
  { id: 'rabbit', topicId: 't1', word: 'rabbit', emoji: '🐰', countable: true, explanation: 'e5' },
  { id: 'horse', topicId: 't1', word: 'horse', emoji: '🐴', countable: true, explanation: 'e6' },
];

describe('generateImageChoiceQuestions', () => {
  it('generates 3 variants per word with 4 distinct options each', () => {
    const questions = generateImageChoiceQuestions(WORDS);

    expect(questions).toHaveLength(WORDS.length * 3);
    for (const question of questions) {
      expect(new Set(question.options).size).toBe(4);
      expect(question.options[question.correctIndex]).toBeDefined();
    }
  });

  it('always includes the target word among the options at correctIndex', () => {
    const questions = generateImageChoiceQuestions(WORDS);

    for (const question of questions) {
      const word = WORDS.find((w) => w.emoji === question.emoji);
      expect(question.options[question.correctIndex]).toBe(word?.word);
    }
  });

  it('produces at least 2 different distractor sets across the 3 variants for a word', () => {
    const questions = generateImageChoiceQuestions(WORDS).filter((q) => q.emoji === '🐱');
    const distractorSets = questions.map((q) =>
      [...q.options].filter((_, i) => i !== q.correctIndex).sort().join(','),
    );

    expect(new Set(distractorSets).size).toBeGreaterThanOrEqual(2);
  });
});
