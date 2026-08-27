import { describe, expect, it } from 'vitest';
import type { Question } from '../types';
import {
  advanceToNextQuestion,
  computeSessionResult,
  createSession,
  getCurrentQuestion,
  getIncorrectAnswers,
  hasAnsweredCurrent,
  isSessionComplete,
  submitAnswer,
} from './practiceSession';

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    topicId: 't1',
    text: 'Question 1?',
    options: ['a', 'b', 'c', 'd'],
    correctIndex: 1,
    explanation: 'b is correct.',
  },
  {
    id: 'q2',
    topicId: 't1',
    text: 'Question 2?',
    options: ['a', 'b', 'c', 'd'],
    correctIndex: 2,
    explanation: 'c is correct.',
  },
];

describe('createSession', () => {
  it('starts at question 0 with no answers', () => {
    const session = createSession(QUESTIONS);

    expect(session.currentIndex).toBe(0);
    expect(session.answers).toHaveLength(0);
    expect(session.selectedIndex).toBeNull();
  });
});

describe('getCurrentQuestion', () => {
  it('returns the question at the current index', () => {
    const session = createSession(QUESTIONS);

    expect(getCurrentQuestion(session)?.id).toBe('q1');
  });

  it('returns null when past the last question', () => {
    const session = { ...createSession(QUESTIONS), currentIndex: 5 };

    expect(getCurrentQuestion(session)).toBeNull();
  });
});

describe('submitAnswer', () => {
  it('records a correct answer', () => {
    const session = createSession(QUESTIONS);
    const updated = submitAnswer(session, 1);

    expect(hasAnsweredCurrent(updated)).toBe(true);
    expect(updated.answers).toHaveLength(1);
    expect(updated.answers[0]?.isCorrect).toBe(true);
    expect(updated.answers[0]?.selectedIndex).toBe(1);
  });

  it('records an incorrect answer', () => {
    const session = createSession(QUESTIONS);
    const updated = submitAnswer(session, 0);

    expect(updated.answers[0]?.isCorrect).toBe(false);
    expect(updated.answers[0]?.selectedIndex).toBe(0);
  });

  it('does not overwrite an existing answer for the same question', () => {
    const session = createSession(QUESTIONS);
    const firstAnswer = submitAnswer(session, 1);
    const secondAttempt = submitAnswer(firstAnswer, 0);

    expect(secondAttempt.answers).toHaveLength(1);
    expect(secondAttempt.answers[0]?.selectedIndex).toBe(1);
  });
});

describe('advanceToNextQuestion', () => {
  it('moves to the next question and clears the selection', () => {
    const session = createSession(QUESTIONS);
    const answered = submitAnswer(session, 1);
    const advanced = advanceToNextQuestion(answered);

    expect(advanced.currentIndex).toBe(1);
    expect(advanced.selectedIndex).toBeNull();
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
    session = advanceToNextQuestion(submitAnswer(session, 1));
    session = advanceToNextQuestion(submitAnswer(session, 2));

    expect(isSessionComplete(session)).toBe(true);
  });
});

describe('computeSessionResult', () => {
  it('counts correct answers out of total questions', () => {
    let session = createSession(QUESTIONS);
    session = advanceToNextQuestion(submitAnswer(session, 1)); // correct
    session = submitAnswer(session, 0); // incorrect

    const result = computeSessionResult(session);

    expect(result.correctCount).toBe(1);
    expect(result.totalCount).toBe(2);
  });
});

describe('getIncorrectAnswers', () => {
  it('returns only the incorrectly answered questions', () => {
    let session = createSession(QUESTIONS);
    session = advanceToNextQuestion(submitAnswer(session, 0)); // incorrect
    session = submitAnswer(session, 2); // correct

    const result = computeSessionResult(session);
    const incorrect = getIncorrectAnswers(result);

    expect(incorrect).toHaveLength(1);
    expect(incorrect[0]?.question.id).toBe('q1');
  });
});
