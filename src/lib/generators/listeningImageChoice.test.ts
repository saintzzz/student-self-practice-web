import { describe, expect, it } from 'vitest';
import type { VocabWord } from '../../types';
import { generateListeningImageChoiceQuestions } from './listeningImageChoice';

const WORDS: VocabWord[] = [
  { id: 'cat', topicId: 't1', word: 'cat', emoji: '🐱', countable: true, explanation: 'e1' },
  { id: 'dog', topicId: 't1', word: 'dog', emoji: '🐶', countable: true, explanation: 'e2' },
  { id: 'fish', topicId: 't1', word: 'fish', emoji: '🐟', countable: true, explanation: 'e3' },
  { id: 'bird', topicId: 't1', word: 'bird', emoji: '🐦', countable: true, explanation: 'e4' },
  { id: 'rabbit', topicId: 't1', word: 'rabbit', emoji: '🐰', countable: true, explanation: 'e5' },
  { id: 'horse', topicId: 't1', word: 'horse', emoji: '🐴', countable: true, explanation: 'e6' },
];

describe('generateListeningImageChoiceQuestions', () => {
  it('generates 3 variants per word with 4 distinct emoji options each', () => {
    const questions = generateListeningImageChoiceQuestions(WORDS);

    expect(questions).toHaveLength(WORDS.length * 3);
    for (const question of questions) {
      expect(new Set(question.options).size).toBe(4);
      expect(question.options[question.correctIndex]).toBeDefined();
    }
  });

  it('always includes the target word\'s emoji among the options at correctIndex', () => {
    const questions = generateListeningImageChoiceQuestions(WORDS);

    for (const question of questions) {
      const word = WORDS.find((w) => w.word === question.word);
      expect(question.options[question.correctIndex]).toBe(word?.emoji);
    }
  });

  it('produces at least 2 different distractor sets across the 3 variants for a word', () => {
    const questions = generateListeningImageChoiceQuestions(WORDS).filter((q) => q.word === 'cat');
    const distractorSets = questions.map((q) =>
      [...q.options].filter((_, i) => i !== q.correctIndex).sort().join(','),
    );

    expect(new Set(distractorSets).size).toBeGreaterThanOrEqual(2);
  });

  it('sets kind to listening-image-choice on every instance', () => {
    const questions = generateListeningImageChoiceQuestions(WORDS);

    expect(questions.every((q) => q.kind === 'listening-image-choice')).toBe(true);
  });

  it('carries the word\'s topicId and explanation through unchanged', () => {
    const questions = generateListeningImageChoiceQuestions(WORDS).filter((q) => q.word === 'cat');

    for (const question of questions) {
      expect(question.topicId).toBe('t1');
      expect(question.explanation).toBe('e1');
    }
  });
});
