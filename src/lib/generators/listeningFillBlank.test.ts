import { describe, expect, it } from 'vitest';
import type { VocabWord } from '../../types';
import { generateListeningFillBlankQuestions, TYPEABLE_WORD } from './listeningFillBlank';

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

  it('CR-144: skips words a keyboard cannot type (non-ASCII letters)', () => {
    const words: VocabWord[] = [
      { id: 'pinata', topicId: 't1', word: 'piñata', emoji: '🪅', countable: true, explanation: 'e' },
      { id: 'aland', topicId: 't1', word: 'Åland', emoji: '🇦🇽', countable: false, explanation: 'e' },
      { id: 'cat', topicId: 't1', word: 'cat', emoji: '🐱', countable: true, explanation: 'e' },
      { id: 'hot-dog', topicId: 't1', word: 'hot dog', emoji: '🌭', countable: true, explanation: 'e' },
    ];
    const questions = generateListeningFillBlankQuestions(words);
    expect(questions.map((q) => q.word)).toEqual(['cat', 'hot dog']);
    expect(TYPEABLE_WORD.test('piñata')).toBe(false);
    expect(TYPEABLE_WORD.test('Åland')).toBe(false);
  });
});
