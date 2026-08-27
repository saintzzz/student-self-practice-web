import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultSummary from './ResultSummary';
import type { ImageChoiceQuestion, ListeningFillBlankQuestion, SessionResult } from '../types';

const IMAGE_QUESTION: ImageChoiceQuestion = {
  id: 'q1',
  topicId: 't1',
  kind: 'image-choice',
  emoji: '🐱',
  options: ['cat', 'dog', 'fish', 'bird'],
  correctIndex: 0,
  explanation: 'Con mèo tiếng Anh là "cat".',
};

const LISTENING_QUESTION: ListeningFillBlankQuestion = {
  id: 'q2',
  topicId: 't1',
  kind: 'listening-fill-blank',
  word: 'rabbit',
  explanation: 'Con thỏ tiếng Anh là "rabbit".',
};

describe('ResultSummary', () => {
  it('renders a perfect score with no incorrect items (happy path, AC6)', () => {
    const result: SessionResult = {
      correctCount: 2,
      totalCount: 2,
      answers: [
        { question: IMAGE_QUESTION, isCorrect: true },
        { question: LISTENING_QUESTION, isCorrect: true },
      ],
    };

    render(<ResultSummary result={result} onPracticeAgain={vi.fn()} onChooseTopic={vi.fn()} />);

    expect(screen.getByTestId('score-summary')).toHaveTextContent('2/2');
    expect(screen.queryByTestId('incorrect-item-0')).not.toBeInTheDocument();
  });

  it('lists incorrectly answered questions with the correct word and explanation for both kinds (AC7)', () => {
    const result: SessionResult = {
      correctCount: 0,
      totalCount: 2,
      answers: [
        { question: IMAGE_QUESTION, isCorrect: false },
        { question: LISTENING_QUESTION, isCorrect: false },
      ],
    };

    render(<ResultSummary result={result} onPracticeAgain={vi.fn()} onChooseTopic={vi.fn()} />);

    expect(screen.getByTestId('score-summary')).toHaveTextContent('0/2');
    const imageItem = screen.getByTestId('incorrect-item-0');
    expect(imageItem).toHaveTextContent('cat');
    expect(imageItem).toHaveTextContent(IMAGE_QUESTION.explanation);
    const listeningItem = screen.getByTestId('incorrect-item-1');
    expect(listeningItem).toHaveTextContent('rabbit');
    expect(listeningItem).toHaveTextContent(LISTENING_QUESTION.explanation);
  });

  it('calls onPracticeAgain and onChooseTopic when their buttons are clicked (AC8, AC9)', async () => {
    const user = userEvent.setup();
    const onPracticeAgain = vi.fn();
    const onChooseTopic = vi.fn();
    const result: SessionResult = {
      correctCount: 1,
      totalCount: 1,
      answers: [{ question: IMAGE_QUESTION, isCorrect: true }],
    };

    render(
      <ResultSummary result={result} onPracticeAgain={onPracticeAgain} onChooseTopic={onChooseTopic} />,
    );

    await user.click(screen.getByTestId('practice-again-button'));
    await user.click(screen.getByTestId('choose-topic-button'));

    expect(onPracticeAgain).toHaveBeenCalledOnce();
    expect(onChooseTopic).toHaveBeenCalledOnce();
  });
});
