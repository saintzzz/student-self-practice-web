import { describe, expect, it } from 'vitest';
import type { ImageChoiceQuestion, ListeningFillBlankQuestion, Question } from '../types';
import {
  createSession,
  hasAnsweredCurrent,
  submitImageChoiceAnswer,
  submitListeningAnswer,
} from './practiceSession';

const IMAGE_QUESTION: ImageChoiceQuestion = {
  id: 'q-image-1',
  topicId: 't1',
  kind: 'image-choice',
  emoji: '🐱',
  options: ['cat', 'dog', 'fish', 'bird'],
  correctIndex: 0,
  explanation: 'Con mèo tiếng Anh là "cat".',
};

const LISTENING_QUESTION: ListeningFillBlankQuestion = {
  id: 'q-listen-1',
  topicId: 't1',
  kind: 'listening-fill-blank',
  word: 'rabbit',
  explanation: 'Con thỏ tiếng Anh là "rabbit".',
};

const QUESTIONS: Question[] = [IMAGE_QUESTION, LISTENING_QUESTION];

describe('submitImageChoiceAnswer', () => {
  it('records a correct answer', () => {
    const session = createSession(QUESTIONS);
    const updated = submitImageChoiceAnswer(session, 0);

    expect(hasAnsweredCurrent(updated)).toBe(true);
    expect(updated.currentAnswer?.isCorrect).toBe(true);
    expect(updated.currentAnswer?.selectedIndex).toBe(0);
    expect(updated.answers).toHaveLength(1);
    expect(updated.answers[0]?.isCorrect).toBe(true);
  });

  it('records an incorrect answer', () => {
    const session = createSession(QUESTIONS);
    const updated = submitImageChoiceAnswer(session, 1);

    expect(updated.currentAnswer?.isCorrect).toBe(false);
    expect(updated.answers[0]?.isCorrect).toBe(false);
  });

  it('does not overwrite an existing answer for the same question', () => {
    const session = createSession(QUESTIONS);
    const firstAnswer = submitImageChoiceAnswer(session, 0);
    const secondAttempt = submitImageChoiceAnswer(firstAnswer, 1);

    expect(secondAttempt.answers).toHaveLength(1);
    expect(secondAttempt.currentAnswer?.selectedIndex).toBe(0);
  });

  it('does nothing when the current question is not image-choice', () => {
    const session = { ...createSession(QUESTIONS), currentIndex: 1 };
    const updated = submitImageChoiceAnswer(session, 0);

    expect(hasAnsweredCurrent(updated)).toBe(false);
  });
});

describe('submitListeningAnswer', () => {
  it('records a correct answer when the typed word matches exactly', () => {
    const session = { ...createSession(QUESTIONS), currentIndex: 1 };
    const updated = submitListeningAnswer(session, 'rabbit');

    expect(updated.currentAnswer?.isCorrect).toBe(true);
    expect(updated.currentAnswer?.typedAnswer).toBe('rabbit');
  });

  it('matches case-insensitively and trims whitespace', () => {
    const session = { ...createSession(QUESTIONS), currentIndex: 1 };
    const updated = submitListeningAnswer(session, '  RaBBit  ');

    expect(updated.currentAnswer?.isCorrect).toBe(true);
  });

  it('records an incorrect answer for a wrong word', () => {
    const session = { ...createSession(QUESTIONS), currentIndex: 1 };
    const updated = submitListeningAnswer(session, 'dog');

    expect(updated.currentAnswer?.isCorrect).toBe(false);
  });

  it('does nothing when the current question is not listening-fill-blank', () => {
    const session = createSession(QUESTIONS);
    const updated = submitListeningAnswer(session, 'cat');

    expect(hasAnsweredCurrent(updated)).toBe(false);
  });
});
