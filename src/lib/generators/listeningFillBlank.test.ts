import { describe, expect, it } from 'vitest';
import type { VocabWord } from '../../types';
import { generateListeningFillBlankQuestions } from './listeningFillBlank';

const WORDS: VocabWord[] = [
  { id: 'cat', topicId: 't1', word: 'cat', emoji: '🐱', countable: true, explanation: 'e1' },
  { id: 'dog', topicId: 't1', word: 'dog', emoji: '🐶', countable: true, explanation: 'e2' },
];

describe('generateListeningFillBlankQuestions', () => {
  it('generates exactly one instance per word (no combinatorial padding)', () => {
    const questions = generateListeningFillBlankQuestions(WORDS);

    expect(questions).toHaveLength(WORDS.length);
    expect(questions.map((q) => q.word)).toEqual(['cat', 'dog']);
  });

  it('carries the topicId and explanation through unchanged', () => {
    const [first] = generateListeningFillBlankQuestions(WORDS);

    expect(first?.topicId).toBe('t1');
    expect(first?.explanation).toBe('e1');
    expect(first?.kind).toBe('listening-fill-blank');
  });
});
