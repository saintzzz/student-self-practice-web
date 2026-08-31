import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionCard from './QuestionCard';
import { LISTENING_IMAGE_CHOICE_QUESTION, noopHandlers } from './questionCardFixtures';

describe('QuestionCard (listening-image-choice, Round 2 addition)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the listening-image-choice kind attribute and its controls', () => {
    render(
      <QuestionCard
        question={LISTENING_IMAGE_CHOICE_QUESTION}
        questionNumber={2}
        totalQuestions={10}
        currentAnswer={null}
        {...noopHandlers}
      />,
    );

    expect(screen.getByTestId('question-card')).toHaveAttribute(
      'data-question-kind',
      'listening-image-choice',
    );
    expect(screen.getByTestId('play-audio-button')).toBeVisible();
    expect(screen.getByTestId('option-0')).toBeVisible();
    expect(screen.getByTestId('option-3')).toBeVisible();
  });

  it('routes a listening-image-choice selection to onSubmitOption', async () => {
    const user = userEvent.setup();
    const onSubmitOption = vi.fn();
    render(
      <QuestionCard
        question={LISTENING_IMAGE_CHOICE_QUESTION}
        questionNumber={2}
        totalQuestions={10}
        currentAnswer={null}
        {...noopHandlers}
        onSubmitOption={onSubmitOption}
      />,
    );

    await user.click(screen.getByTestId('option-0'));

    expect(onSubmitOption).toHaveBeenCalledWith(0);
  });

  it('shows feedback (no answer-feedback testid) once a listening-image-choice answer is submitted', () => {
    render(
      <QuestionCard
        question={LISTENING_IMAGE_CHOICE_QUESTION}
        questionNumber={2}
        totalQuestions={10}
        currentAnswer={{ isCorrect: true, selectedIndex: 0 }}
        {...noopHandlers}
      />,
    );

    expect(screen.queryByTestId('answer-feedback')).not.toBeInTheDocument();
    expect(screen.getByTestId('next-button')).toBeEnabled();
  });

  it('disables every option once answered', () => {
    render(
      <QuestionCard
        question={LISTENING_IMAGE_CHOICE_QUESTION}
        questionNumber={2}
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
