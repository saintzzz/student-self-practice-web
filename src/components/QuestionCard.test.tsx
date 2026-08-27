import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionCard from './QuestionCard';
import { IMAGE_QUESTION, LISTENING_QUESTION, noopHandlers } from './questionCardFixtures';

describe('QuestionCard (image-choice, listening-fill-blank, next button)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the progress indicator and the image-choice kind attribute', () => {
    render(
      <QuestionCard
        question={IMAGE_QUESTION}
        questionNumber={1}
        totalQuestions={8}
        currentAnswer={null}
        {...noopHandlers}
      />,
    );

    expect(screen.getByTestId('question-progress')).toHaveTextContent('1');
    expect(screen.getByTestId('question-progress')).toHaveTextContent('8');
    expect(screen.getByTestId('question-card')).toHaveAttribute('data-question-kind', 'image-choice');
    expect(screen.getByTestId('next-button')).toBeDisabled();
  });

  it('routes an image-choice selection to onSubmitOption', async () => {
    const user = userEvent.setup();
    const onSubmitOption = vi.fn();
    render(
      <QuestionCard
        question={IMAGE_QUESTION}
        questionNumber={1}
        totalQuestions={8}
        currentAnswer={null}
        {...noopHandlers}
        onSubmitOption={onSubmitOption}
      />,
    );

    await user.click(screen.getByTestId('option-0'));

    expect(onSubmitOption).toHaveBeenCalledWith(0);
  });

  it('shows the listening-fill-blank kind attribute and its controls', () => {
    render(
      <QuestionCard
        question={LISTENING_QUESTION}
        questionNumber={4}
        totalQuestions={8}
        currentAnswer={null}
        {...noopHandlers}
      />,
    );

    expect(screen.getByTestId('question-card')).toHaveAttribute(
      'data-question-kind',
      'listening-fill-blank',
    );
    expect(screen.getByTestId('play-audio-button')).toBeVisible();
    expect(screen.getByTestId('answer-input')).toBeVisible();
    expect(screen.getByTestId('submit-answer-button')).toBeVisible();
  });

  it('routes a listening submission to onSubmitListening', async () => {
    const onSubmitListening = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestionCard
        question={LISTENING_QUESTION}
        questionNumber={4}
        totalQuestions={8}
        currentAnswer={null}
        {...noopHandlers}
        onSubmitListening={onSubmitListening}
      />,
    );

    await user.type(screen.getByTestId('answer-input'), 'rabbit');
    await user.click(screen.getByTestId('submit-answer-button'));

    expect(onSubmitListening).toHaveBeenCalledWith('rabbit');
  });

  it('shows feedback with the answer-feedback testid and enables Next once a listening answer is submitted', () => {
    render(
      <QuestionCard
        question={LISTENING_QUESTION}
        questionNumber={4}
        totalQuestions={8}
        currentAnswer={{ isCorrect: false, typedAnswer: 'dog' }}
        {...noopHandlers}
      />,
    );

    expect(screen.getByTestId('answer-feedback')).toHaveTextContent('rabbit');
    expect(screen.getByTestId('next-button')).toBeEnabled();
  });

  it('calls onNext when the Next button is clicked after answering', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(
      <QuestionCard
        question={IMAGE_QUESTION}
        questionNumber={1}
        totalQuestions={8}
        currentAnswer={{ isCorrect: true, selectedIndex: 0 }}
        {...noopHandlers}
        onNext={onNext}
      />,
    );

    await user.click(screen.getByTestId('next-button'));

    expect(onNext).toHaveBeenCalledOnce();
  });
});
