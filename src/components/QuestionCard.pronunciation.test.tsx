import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionCard from './QuestionCard';
import { PRONUNCIATION_QUESTION, noopHandlers } from './questionCardFixtures';

describe('QuestionCard (pronunciation-recording)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the pronunciation-recording kind attribute, the target word and the record button', () => {
    render(
      <QuestionCard
        question={PRONUNCIATION_QUESTION}
        questionNumber={3}
        totalQuestions={10}
        currentAnswer={null}
        {...noopHandlers}
      />,
    );

    expect(screen.getByTestId('question-card')).toHaveAttribute('data-question-kind', 'pronunciation-recording');
    expect(screen.getByText('cat')).toBeVisible();
    expect(screen.getByTestId('record-button')).toBeVisible();
    expect(screen.getByTestId('next-button')).toBeDisabled();
  });

  it('shows the recording-indicator while recording, then routes the transcript to onSubmitPronunciation', async () => {
    const onSubmitPronunciation = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestionCard
        question={PRONUNCIATION_QUESTION}
        questionNumber={3}
        totalQuestions={10}
        currentAnswer={null}
        {...noopHandlers}
        onSubmitPronunciation={onSubmitPronunciation}
      />,
    );

    await user.click(screen.getByTestId('record-button'));

    await waitFor(() => expect(screen.getByTestId('recording-indicator')).toBeVisible());
    await waitFor(() => expect(onSubmitPronunciation).toHaveBeenCalledWith('practice attempt'));
  });

  it('shows pronunciation-feedback (not the shared answer-feedback) once answered', () => {
    render(
      <QuestionCard
        question={PRONUNCIATION_QUESTION}
        questionNumber={3}
        totalQuestions={10}
        currentAnswer={{ isCorrect: true, pronunciationTranscript: 'cat', pronunciationScore: 100 }}
        {...noopHandlers}
      />,
    );

    expect(screen.getByTestId('pronunciation-feedback')).toHaveTextContent('cat');
    expect(screen.getByTestId('pronunciation-feedback')).toHaveTextContent('100%');
    expect(screen.queryByTestId('answer-feedback')).not.toBeInTheDocument();
    expect(screen.queryByTestId('record-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('next-button')).toBeEnabled();
  });

  it('shows an incorrect-style pronunciation-feedback panel for a low score', () => {
    render(
      <QuestionCard
        question={PRONUNCIATION_QUESTION}
        questionNumber={3}
        totalQuestions={10}
        currentAnswer={{ isCorrect: false, pronunciationTranscript: 'dog', pronunciationScore: 0 }}
        {...noopHandlers}
      />,
    );

    expect(screen.getByTestId('pronunciation-feedback')).toHaveTextContent('dog');
    expect(screen.getByTestId('pronunciation-feedback')).toHaveTextContent('0%');
    expect(screen.getByTestId('next-button')).toBeEnabled();
  });
});
