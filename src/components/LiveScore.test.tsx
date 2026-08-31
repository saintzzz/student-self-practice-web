import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import LiveScore from './LiveScore';
import { createSession, submitExtraLetterAnswer, submitOptionAnswer } from '../lib/practiceSession';
import type { ExtraLetterQuestion, ImageChoiceQuestion, Question } from '../types';

const IMAGE_QUESTION: ImageChoiceQuestion = {
  id: 'q-image-1',
  topicId: 't1',
  kind: 'image-choice',
  emoji: '🐱',
  options: ['cat', 'dog', 'fish', 'bird'],
  correctIndex: 0,
  explanation: 'Con mèo tiếng Anh là "cat".',
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

const QUESTIONS: Question[] = [IMAGE_QUESTION, EXTRA_LETTER_QUESTION];

describe('LiveScore (plan.md v7 "Live Score Display", AC26)', () => {
  it('shows 0/0 before any question is answered', () => {
    const session = createSession(QUESTIONS);

    render(<LiveScore session={session} />);

    expect(screen.getByTestId('live-score')).toHaveTextContent('0/0');
  });

  it('shows the running total against answered-so-far, not the Round total', () => {
    const session = submitOptionAnswer(createSession(QUESTIONS), 0); // correct, but 1 of 2 questions total

    render(<LiveScore session={session} />);

    expect(screen.getByTestId('live-score')).toHaveTextContent('1/1');
  });

  it('counts incorrect answers toward "answered" but not "correct"', () => {
    const session = submitOptionAnswer(createSession(QUESTIONS), 1); // wrong option

    render(<LiveScore session={session} />);

    expect(screen.getByTestId('live-score')).toHaveTextContent('0/1');
  });

  it('accumulates across multiple answered questions within the same Round', () => {
    let session = createSession(QUESTIONS);
    session = submitOptionAnswer(session, 0); // correct
    session = { ...session, currentIndex: 1, currentAnswer: null };
    session = submitExtraLetterAnswer(session, 0); // wrong (extraIndex is 3)

    render(<LiveScore session={session} />);

    expect(screen.getByTestId('live-score')).toHaveTextContent('1/2');
  });
});
