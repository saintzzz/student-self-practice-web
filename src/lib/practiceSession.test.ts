import { describe, expect, it } from 'vitest';
import type { ImageChoiceQuestion, ListeningFillBlankQuestion, Question } from '../types';
import {
  advanceToNextQuestion,
  computeSessionResult,
  createSession,
  getCorrectWord,
  getCurrentQuestion,
  getIncorrectAnswers,
  isSessionComplete,
  normalizeAnswer,
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
    const session = { ...createSession(QUESTIONS), currentIndex: 5 };

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
});

describe('advanceToNextQuestion', () => {
  it('moves to the next question and clears the current answer', () => {
    const session = createSession(QUESTIONS);
    const answered = submitImageChoiceAnswer(session, 0);
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
    session = advanceToNextQuestion(submitImageChoiceAnswer(session, 0));
    session = advanceToNextQuestion(submitListeningAnswer(session, 'rabbit'));

    expect(isSessionComplete(session)).toBe(true);
  });
});

describe('computeSessionResult', () => {
  it('counts correct answers out of total questions across both kinds', () => {
    let session = createSession(QUESTIONS);
    session = advanceToNextQuestion(submitImageChoiceAnswer(session, 0)); // correct
    session = submitListeningAnswer(session, 'dog'); // incorrect

    const result = computeSessionResult(session);

    expect(result.correctCount).toBe(1);
    expect(result.totalCount).toBe(2);
  });
});

describe('getIncorrectAnswers', () => {
  it('returns only the incorrectly answered questions', () => {
    let session = createSession(QUESTIONS);
    session = advanceToNextQuestion(submitImageChoiceAnswer(session, 1)); // incorrect
    session = submitListeningAnswer(session, 'rabbit'); // correct

    const result = computeSessionResult(session);
    const incorrect = getIncorrectAnswers(result);

    expect(incorrect).toHaveLength(1);
    expect(incorrect[0]?.question.id).toBe('q-image-1');
  });
});
