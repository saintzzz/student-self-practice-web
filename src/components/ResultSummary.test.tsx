import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultSummary from './ResultSummary';
import type { Question, SessionResult } from '../types';

const QUESTION_1: Question = {
  id: 'q1',
  topicId: 't1',
  text: 'She ___ to school every day.',
  options: ['walk', 'walks', 'walking', 'walked'],
  correctIndex: 1,
  explanation: 'Third-person singular subjects take an -s ending.',
};

const QUESTION_2: Question = {
  id: 'q2',
  topicId: 't1',
  text: 'They ___ football on weekends.',
  options: ['plays', 'play', 'playing', 'played'],
  correctIndex: 1,
  explanation: 'Plural subjects use the base verb form.',
};

describe('ResultSummary', () => {
  it('renders a perfect score with no incorrect items (happy path)', () => {
    const result: SessionResult = {
      correctCount: 2,
      totalCount: 2,
      answers: [
        { question: QUESTION_1, selectedIndex: 1, isCorrect: true },
        { question: QUESTION_2, selectedIndex: 1, isCorrect: true },
      ],
    };

    render(<ResultSummary result={result} onPracticeAgain={vi.fn()} onChooseTopic={vi.fn()} />);

    expect(screen.getByTestId('score-summary')).toHaveTextContent('2/2');
    expect(screen.queryByTestId('incorrect-item-0')).not.toBeInTheDocument();
  });

  it('lists incorrectly answered questions with the correct answer and explanation (wrong answer path)', () => {
    const result: SessionResult = {
      correctCount: 1,
      totalCount: 2,
      answers: [
        { question: QUESTION_1, selectedIndex: 0, isCorrect: false },
        { question: QUESTION_2, selectedIndex: 1, isCorrect: true },
      ],
    };

    render(<ResultSummary result={result} onPracticeAgain={vi.fn()} onChooseTopic={vi.fn()} />);

    expect(screen.getByTestId('score-summary')).toHaveTextContent('1/2');
    const incorrectItem = screen.getByTestId('incorrect-item-0');
    expect(incorrectItem).toHaveTextContent(QUESTION_1.text);
    expect(incorrectItem).toHaveTextContent('walks');
    expect(incorrectItem).toHaveTextContent(QUESTION_1.explanation);
  });

  it('calls onPracticeAgain and onChooseTopic when their buttons are clicked', async () => {
    const user = userEvent.setup();
    const onPracticeAgain = vi.fn();
    const onChooseTopic = vi.fn();
    const result: SessionResult = {
      correctCount: 1,
      totalCount: 1,
      answers: [{ question: QUESTION_1, selectedIndex: 1, isCorrect: true }],
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
