import { describe, expect, it } from 'vitest';
import type { VocabWord } from '../../types';
import { generatePronunciationRecordingQuestions } from './pronunciationRecording';

const CAT_WORD: VocabWord = {
  id: 'cat',
  topicId: 't-animals',
  word: 'cat',
  plural: 'cats',
  emoji: '🐱',
  countable: true,
  explanation: 'Con mèo tiếng Anh là "cat".',
};

const RED_WORD: VocabWord = {
  id: 'red',
  topicId: 't-colors',
  word: 'red',
  emoji: '🔴',
  countable: false,
  explanation: 'Màu đỏ tiếng Anh là "red".',
};

describe('generatePronunciationRecordingQuestions', () => {
  it('generates exactly one instance per word', () => {
    const questions = generatePronunciationRecordingQuestions([CAT_WORD, RED_WORD]);

    expect(questions).toHaveLength(2);
    expect(questions.every((q) => q.kind === 'pronunciation-recording')).toBe(true);
  });

  it('carries the word, topicId and explanation through unchanged', () => {
    const [question] = generatePronunciationRecordingQuestions([CAT_WORD]);

    expect(question?.word).toBe('cat');
    expect(question?.topicId).toBe('t-animals');
    expect(question?.explanation).toBe(CAT_WORD.explanation);
  });

  it('assigns unique ids across all generated instances', () => {
    const questions = generatePronunciationRecordingQuestions([CAT_WORD, RED_WORD]);
    const ids = new Set(questions.map((q) => q.id));

    expect(ids.size).toBe(questions.length);
  });

  it('returns an empty array for an empty word list', () => {
    expect(generatePronunciationRecordingQuestions([])).toEqual([]);
  });

  it('is deterministic across repeated calls (same input -> same output)', () => {
    const first = generatePronunciationRecordingQuestions([CAT_WORD, RED_WORD]);
    const second = generatePronunciationRecordingQuestions([CAT_WORD, RED_WORD]);

    expect(first).toEqual(second);
  });
});
