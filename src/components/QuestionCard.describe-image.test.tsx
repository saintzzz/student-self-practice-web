import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionCard from './QuestionCard';
import { DESCRIBE_IMAGE_QUESTION, noopHandlers } from './questionCardFixtures';

describe('QuestionCard (describe-and-choose-image)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets data-question-kind and data-description-type on the question-card container', () => {
    render(
      <QuestionCard
        question={DESCRIBE_IMAGE_QUESTION}
        questionNumber={1}
        totalQuestions={10}
        currentAnswer={null}
        {...noopHandlers}
      />,
    );

    expect(screen.getByTestId('question-card')).toHaveAttribute(
      'data-question-kind',
      'describe-and-choose-image',
    );
    expect(screen.getByTestId('question-card')).toHaveAttribute('data-description-type', 'count');
    expect(screen.getByText('There are 3 cats.')).toBeVisible();
  });

  it('routes an option click to onSubmitOption', async () => {
    const user = userEvent.setup();
    const onSubmitOption = vi.fn();
    render(
      <QuestionCard
        question={DESCRIBE_IMAGE_QUESTION}
        questionNumber={1}
        totalQuestions={10}
        currentAnswer={null}
        {...noopHandlers}
        onSubmitOption={onSubmitOption}
      />,
    );

    await user.click(screen.getByTestId('option-2'));

    expect(onSubmitOption).toHaveBeenCalledWith(2);
  });

  it('shows the shared FeedbackPanel (without the answer-feedback testid) once answered', () => {
    render(
      <QuestionCard
        question={DESCRIBE_IMAGE_QUESTION}
        questionNumber={4}
        totalQuestions={10}
        currentAnswer={{ isCorrect: true, selectedIndex: 0 }}
        {...noopHandlers}
      />,
    );

    expect(screen.getAllByText('3 cats', { exact: false }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('answer-feedback')).not.toBeInTheDocument();
    expect(screen.getByTestId('next-button')).toBeEnabled();
  });

  it('disables every option once answered', () => {
    render(
      <QuestionCard
        question={DESCRIBE_IMAGE_QUESTION}
        questionNumber={1}
        totalQuestions={10}
        currentAnswer={{ isCorrect: false, selectedIndex: 1 }}
        {...noopHandlers}
      />,
    );

    for (let i = 0; i < 4; i++) {
      expect(screen.getByTestId(`option-${i}`)).toBeDisabled();
    }
  });
});
