import { describe, expect, it } from 'vitest';
import type { CountingImageQuestion, ExtraLetterQuestion, ImageChoiceQuestion, ListeningFillBlankQuestion, Question } from '../types';
import { computeLiveScore } from './liveScore';
import {
  advanceToNextQuestion,
  createSession,
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

/**
 * plan.md v7 "Live Score Display" (AC26): X = correct so far, Y = answered
 * so far - explicitly NOT the Round's full question count, since QUESTIONS
 * here has 4 entries but every scenario below answers fewer than that.
 */
describe('computeLiveScore', () => {
  it('is 0/0 before any question is answered', () => {
    const session = createSession(QUESTIONS);

    expect(computeLiveScore(session)).toEqual({ correct: 0, answered: 0 });
  });

  it('updates the instant an answer is recorded, before Next is clicked (currentIndex unchanged)', () => {
    const session = submitOptionAnswer(createSession(QUESTIONS), 0); // correct, still on question 1

    expect(session.currentIndex).toBe(0);
    expect(computeLiveScore(session)).toEqual({ correct: 1, answered: 1 });
  });

  it('reflects an incorrect answer in "answered" but not "correct"', () => {
    const session = submitOptionAnswer(createSession(QUESTIONS), 1); // incorrect

    expect(computeLiveScore(session)).toEqual({ correct: 0, answered: 1 });
  });

  it('accumulates correctly across a mix of correct and incorrect answers, never counting the unanswered rest', () => {
    let session = createSession(QUESTIONS);
    session = advanceToNextQuestion(submitOptionAnswer(session, 0)); // correct
    session = advanceToNextQuestion(submitListeningAnswer(session, 'dog')); // incorrect
    session = submitOptionAnswer(session, 0); // counting-image, correct - 3rd of 4 questions

    expect(computeLiveScore(session)).toEqual({ correct: 2, answered: 3 });
  });

  it('reaches Y = total questions only once every question has been answered', () => {
    let session = createSession(QUESTIONS);
    session = advanceToNextQuestion(submitOptionAnswer(session, 0));
    session = advanceToNextQuestion(submitListeningAnswer(session, 'rabbit'));
    session = advanceToNextQuestion(submitOptionAnswer(session, 0));
    session = submitExtraLetterAnswer(session, 3);

    expect(computeLiveScore(session)).toEqual({ correct: 4, answered: 4 });
  });
});
