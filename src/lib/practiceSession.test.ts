import { describe, expect, it } from 'vitest';
import type {
  CountingImageQuestion,
  ExtraLetterQuestion,
  ImageChoiceQuestion,
  ListeningFillBlankQuestion,
  Question,
} from '../types';
import {
  advanceToNextQuestion,
  computeSessionResult,
  createSession,
  getCorrectWord,
  getCurrentQuestion,
  getIncorrectAnswers,
  isSessionComplete,
  normalizeAnswer,
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

describe('createSession', () => {
  it('starts at question 0 with no answers', () => {
    const session = createSession(QUESTIONS);

    expect(session.currentIndex).toBe(0);
    expect(session.answers).toHaveLength(0);
    expect(session.currentAnswer).toBeNull();
  });
});

describe('getCurrentQuestion', () => {
  it('returns the question at the current index', () => {
    const session = createSession(QUESTIONS);

    expect(getCurrentQuestion(session)?.id).toBe('q-image-1');
  });

  it('returns null when past the last question', () => {
    const session = { ...createSession(QUESTIONS), currentIndex: 99 };

    expect(getCurrentQuestion(session)).toBeNull();
  });
});

describe('normalizeAnswer', () => {
  it('trims whitespace and lowercases', () => {
    expect(normalizeAnswer('  Rabbit  ')).toBe('rabbit');
    expect(normalizeAnswer('RABBIT')).toBe('rabbit');
  });
});

describe('getCorrectWord', () => {
  it('returns the option at correctIndex for image-choice questions', () => {
    expect(getCorrectWord(IMAGE_QUESTION)).toBe('cat');
  });

  it('returns the target word for listening-fill-blank questions', () => {
    expect(getCorrectWord(LISTENING_QUESTION)).toBe('rabbit');
  });

  it('returns the formatted count label for counting-image questions', () => {
    expect(getCorrectWord(COUNTING_QUESTION)).toBe('3 cats');
  });

  it('returns the correct word for extra-letter questions', () => {
    expect(getCorrectWord(EXTRA_LETTER_QUESTION)).toBe('bird');
  });
});

describe('advanceToNextQuestion', () => {
  it('moves to the next question and clears the current answer', () => {
    const session = createSession(QUESTIONS);
    const answered = submitOptionAnswer(session, 0);
    const advanced = advanceToNextQuestion(answered);

    expect(advanced.currentIndex).toBe(1);
    expect(advanced.currentAnswer).toBeNull();
  });

  it('does nothing if the current question has not been answered', () => {
    const session = createSession(QUESTIONS);
    const advanced = advanceToNextQuestion(session);

    expect(advanced.currentIndex).toBe(0);
  });
});

describe('isSessionComplete', () => {
  it('is false while questions remain', () => {
    const session = createSession(QUESTIONS);

    expect(isSessionComplete(session)).toBe(false);
  });

  it('is true once currentIndex passes the last question', () => {
    let session = createSession(QUESTIONS);
    session = advanceToNextQuestion(submitOptionAnswer(session, 0));
    session = advanceToNextQuestion(submitListeningAnswer(session, 'rabbit'));
    session = advanceToNextQuestion(submitOptionAnswer(session, 0));
    session = advanceToNextQuestion(submitExtraLetterAnswer(session, 3));

    expect(isSessionComplete(session)).toBe(true);
  });
});

describe('computeSessionResult', () => {
  it('counts correct answers out of total questions across all 4 kinds', () => {
    let session = createSession(QUESTIONS);
    session = advanceToNextQuestion(submitOptionAnswer(session, 0)); // image-choice correct
    session = advanceToNextQuestion(submitListeningAnswer(session, 'dog')); // incorrect
    session = advanceToNextQuestion(submitOptionAnswer(session, 0)); // counting-image correct
    session = submitExtraLetterAnswer(session, 0); // extra-letter incorrect

    const result = computeSessionResult(session);

    expect(result.correctCount).toBe(2);
    expect(result.totalCount).toBe(4);
  });
});

describe('getIncorrectAnswers', () => {
  it('returns only the incorrectly answered questions', () => {
    let session = createSession(QUESTIONS);
    session = advanceToNextQuestion(submitOptionAnswer(session, 1)); // incorrect
    session = submitListeningAnswer(session, 'rabbit'); // correct

    const result = computeSessionResult(session);
    const incorrect = getIncorrectAnswers(result);

    expect(incorrect).toHaveLength(1);
    expect(incorrect[0]?.question.id).toBe('q-image-1');
  });
});
