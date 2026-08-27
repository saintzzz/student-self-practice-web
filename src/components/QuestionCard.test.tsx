import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionCard from './QuestionCard';
import type { ImageChoiceQuestion, ListeningFillBlankQuestion } from '../types';

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

describe('QuestionCard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the progress indicator and the image-choice kind attribute', () => {
    render(
      <QuestionCard
        question={IMAGE_QUESTION}
        questionNumber={1}
        totalQuestions={6}
        currentAnswer={null}
        onSubmitImageChoice={vi.fn()}
        onSubmitListening={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByTestId('question-progress')).toHaveTextContent('1');
    expect(screen.getByTestId('question-progress')).toHaveTextContent('6');
    expect(screen.getByTestId('question-card')).toHaveAttribute('data-question-kind', 'image-choice');
    expect(screen.getByTestId('next-button')).toBeDisabled();
  });

  it('routes an image-choice selection to onSubmitImageChoice', async () => {
    const user = userEvent.setup();
    const onSubmitImageChoice = vi.fn();
    render(
      <QuestionCard
        question={IMAGE_QUESTION}
        questionNumber={1}
        totalQuestions={6}
        currentAnswer={null}
        onSubmitImageChoice={onSubmitImageChoice}
        onSubmitListening={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('option-0'));

    expect(onSubmitImageChoice).toHaveBeenCalledWith(0);
  });

  it('shows the listening-fill-blank kind attribute and its controls', () => {
    render(
      <QuestionCard
        question={LISTENING_QUESTION}
        questionNumber={4}
        totalQuestions={6}
        currentAnswer={null}
        onSubmitImageChoice={vi.fn()}
        onSubmitListening={vi.fn()}
        onNext={vi.fn()}
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
        totalQuestions={6}
        currentAnswer={null}
        onSubmitImageChoice={vi.fn()}
        onSubmitListening={onSubmitListening}
        onNext={vi.fn()}
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
        totalQuestions={6}
        currentAnswer={{ isCorrect: false, typedAnswer: 'dog' }}
        onSubmitImageChoice={vi.fn()}
        onSubmitListening={vi.fn()}
        onNext={vi.fn()}
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
        totalQuestions={6}
        currentAnswer={{ isCorrect: true, selectedIndex: 0 }}
        onSubmitImageChoice={vi.fn()}
        onSubmitListening={vi.fn()}
        onNext={onNext}
      />,
    );

    await user.click(screen.getByTestId('next-button'));

    expect(onNext).toHaveBeenCalledOnce();
  });
});
