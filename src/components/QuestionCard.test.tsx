import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionCard from './QuestionCard';
import type { Question } from '../types';

const QUESTION: Question = {
  id: 'q1',
  topicId: 't1',
  text: 'She ___ to school every day.',
  options: ['walk', 'walks', 'walking', 'walked'],
  correctIndex: 1,
  explanation: 'Third-person singular subjects take an -s ending.',
};

describe('QuestionCard', () => {
  it('shows the progress indicator and question text', () => {
    render(
      <QuestionCard
        question={QUESTION}
        questionNumber={1}
        totalQuestions={4}
        selectedIndex={null}
        onSelectOption={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByTestId('question-progress')).toHaveTextContent('Question 1 of 4');
    expect(screen.getByText(QUESTION.text)).toBeVisible();
    expect(screen.getByTestId('next-button')).toBeDisabled();
  });

  it('calls onSelectOption when an option is clicked (happy path, correct answer)', async () => {
    const user = userEvent.setup();
    const onSelectOption = vi.fn();
    render(
      <QuestionCard
        question={QUESTION}
        questionNumber={1}
        totalQuestions={4}
        selectedIndex={null}
        onSelectOption={onSelectOption}
        onNext={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('option-1'));

    expect(onSelectOption).toHaveBeenCalledWith(1);
  });

  it('shows correct feedback and enables Next when the correct option is selected', () => {
    render(
      <QuestionCard
        question={QUESTION}
        questionNumber={1}
        totalQuestions={4}
        selectedIndex={1}
        onSelectOption={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByText('Correct.')).toBeVisible();
    expect(screen.getByTestId('option-1')).toBeDisabled();
    expect(screen.getByTestId('next-button')).toBeEnabled();
  });

  it('shows incorrect feedback and reveals the correct answer when a wrong option is selected', () => {
    render(
      <QuestionCard
        question={QUESTION}
        questionNumber={1}
        totalQuestions={4}
        selectedIndex={0}
        onSelectOption={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByText('Incorrect.')).toBeVisible();
    expect(screen.getByText(QUESTION.explanation)).toBeVisible();
    expect(screen.getByTestId('option-0')).toBeDisabled();
    expect(screen.getByTestId('option-1')).toBeDisabled();
    expect(screen.getByTestId('next-button')).toBeEnabled();
  });

  it('calls onNext when the Next button is clicked after answering', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(
      <QuestionCard
        question={QUESTION}
        questionNumber={1}
        totalQuestions={4}
        selectedIndex={1}
        onSelectOption={vi.fn()}
        onNext={onNext}
      />,
    );

    await user.click(screen.getByTestId('next-button'));

    expect(onNext).toHaveBeenCalledOnce();
  });
});
