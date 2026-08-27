import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionCard from './QuestionCard';
import { COUNTING_QUESTION, EXTRA_LETTER_QUESTION, noopHandlers } from './questionCardFixtures';

describe('QuestionCard (counting-image, extra-letter)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('routes a counting-image selection to onSubmitOption and sets data-count-direction', async () => {
    const user = userEvent.setup();
    const onSubmitOption = vi.fn();
    render(
      <QuestionCard
        question={COUNTING_QUESTION}
        questionNumber={1}
        totalQuestions={8}
        currentAnswer={null}
        {...noopHandlers}
        onSubmitOption={onSubmitOption}
      />,
    );

    expect(screen.getByTestId('question-card')).toHaveAttribute('data-question-kind', 'counting-image');
    expect(screen.getByTestId('question-card')).toHaveAttribute('data-count-direction', 'image-to-count');

    await user.click(screen.getByTestId('option-0'));

    expect(onSubmitOption).toHaveBeenCalledWith(0);
  });

  it('routes an extra-letter tile click to onSubmitExtraLetter', async () => {
    const user = userEvent.setup();
    const onSubmitExtraLetter = vi.fn();
    render(
      <QuestionCard
        question={EXTRA_LETTER_QUESTION}
        questionNumber={1}
        totalQuestions={8}
        currentAnswer={null}
        {...noopHandlers}
        onSubmitExtraLetter={onSubmitExtraLetter}
      />,
    );

    expect(screen.getByTestId('question-card')).toHaveAttribute('data-question-kind', 'extra-letter');

    await user.click(screen.getByTestId('letter-tile-3'));

    expect(onSubmitExtraLetter).toHaveBeenCalledWith(3);
  });

  it('shows answer-feedback for extra-letter once answered', () => {
    render(
      <QuestionCard
        question={EXTRA_LETTER_QUESTION}
        questionNumber={4}
        totalQuestions={8}
        currentAnswer={{ isCorrect: false, selectedLetterIndex: 0 }}
        {...noopHandlers}
      />,
    );

    expect(screen.getByTestId('answer-feedback')).toHaveTextContent('bird');
    expect(screen.getByTestId('next-button')).toBeEnabled();
  });
});
