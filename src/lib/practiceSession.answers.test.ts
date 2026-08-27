import { describe, expect, it } from 'vitest';
import type {
  CountingImageQuestion,
  ExtraLetterQuestion,
  ImageChoiceQuestion,
  ListeningFillBlankQuestion,
  Question,
} from '../types';
import {
  createSession,
  hasAnsweredCurrent,
  submitExtraLetterAnswer,
  submitListeningAnswer,
  submitOptionAnswer,
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

const COUNTING_QUESTION: CountingImageQuestion = {
  id: 'q-count-1',
  topicId: 't1',
  kind: 'counting-image',
  direction: 'image-to-count',
  prompt: { word: 'cat', plural: 'cats', emoji: '🐱', count: 3 },
  options: [
    { word: 'cat', plural: 'cats', emoji: '🐱', count: 3 },
    { word: 'cat', plural: 'cats', emoji: '🐱', count: 2 },
    { word: 'dog', plural: 'dogs', emoji: '🐶', count: 3 },
    { word: 'dog', plural: 'dogs', emoji: '🐶', count: 4 },
  ],
  correctIndex: 0,
  explanation: 'Đếm số lượng trong hình rồi chọn "3 cats".',
};

const EXTRA_LETTER_QUESTION: ExtraLetterQuestion = {
  id: 'q-extra-1',
  topicId: 't1',
  kind: 'extra-letter',
  correctWord: 'bird',
  displayLetters: ['b', 'i', 'r', 's', 'd'],
  extraIndex: 3,
  explanation: 'Con chim tiếng Anh là "bird". Chữ cái thừa là "s".',
};

const QUESTIONS: Question[] = [IMAGE_QUESTION, LISTENING_QUESTION, COUNTING_QUESTION, EXTRA_LETTER_QUESTION];

describe('submitOptionAnswer (image-choice)', () => {
  it('records a correct answer', () => {
    const session = createSession(QUESTIONS);
    const updated = submitOptionAnswer(session, 0);

    expect(hasAnsweredCurrent(updated)).toBe(true);
    expect(updated.currentAnswer?.isCorrect).toBe(true);
    expect(updated.currentAnswer?.selectedIndex).toBe(0);
    expect(updated.answers).toHaveLength(1);
    expect(updated.answers[0]?.isCorrect).toBe(true);
  });

  it('records an incorrect answer', () => {
    const session = createSession(QUESTIONS);
    const updated = submitOptionAnswer(session, 1);

    expect(updated.currentAnswer?.isCorrect).toBe(false);
    expect(updated.answers[0]?.isCorrect).toBe(false);
  });

  it('does not overwrite an existing answer for the same question', () => {
    const session = createSession(QUESTIONS);
    const firstAnswer = submitOptionAnswer(session, 0);
    const secondAttempt = submitOptionAnswer(firstAnswer, 1);

    expect(secondAttempt.answers).toHaveLength(1);
    expect(secondAttempt.currentAnswer?.selectedIndex).toBe(0);
  });

  it('does nothing when the current question is not option-shaped', () => {
    const session = { ...createSession(QUESTIONS), currentIndex: 1 };
    const updated = submitOptionAnswer(session, 0);

    expect(hasAnsweredCurrent(updated)).toBe(false);
  });
});

describe('submitOptionAnswer (counting-image)', () => {
  it('records a correct answer against correctIndex', () => {
    const session = { ...createSession(QUESTIONS), currentIndex: 2 };
    const updated = submitOptionAnswer(session, 0);

    expect(updated.currentAnswer?.isCorrect).toBe(true);
  });

  it('records an incorrect answer for a wrong option', () => {
    const session = { ...createSession(QUESTIONS), currentIndex: 2 };
    const updated = submitOptionAnswer(session, 1);

    expect(updated.currentAnswer?.isCorrect).toBe(false);
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

describe('submitExtraLetterAnswer', () => {
  it('records a correct answer when the extra-letter tile is clicked', () => {
    const session = { ...createSession(QUESTIONS), currentIndex: 3 };
    const updated = submitExtraLetterAnswer(session, 3);

    expect(updated.currentAnswer?.isCorrect).toBe(true);
    expect(updated.currentAnswer?.selectedLetterIndex).toBe(3);
  });

  it('records an incorrect answer for any other tile', () => {
    const session = { ...createSession(QUESTIONS), currentIndex: 3 };
    const updated = submitExtraLetterAnswer(session, 0);

    expect(updated.currentAnswer?.isCorrect).toBe(false);
  });

  it('does nothing when the current question is not extra-letter', () => {
    const session = createSession(QUESTIONS);
    const updated = submitExtraLetterAnswer(session, 0);

    expect(hasAnsweredCurrent(updated)).toBe(false);
  });
});
