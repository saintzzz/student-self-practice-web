import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListeningSentenceFillBlankQuestion from './ListeningSentenceFillBlankQuestion';
import type { ListeningSentenceFillBlankQuestion as ListeningSentenceFillBlankQuestionType } from '../types';

const QUESTION: ListeningSentenceFillBlankQuestionType = {
  id: 'q-lsfb-1',
  topicId: 't1',
  kind: 'listening-sentence-fill-blank',
  word: 'cat',
  sentence: 'I have a cat.',
  displaySentence: 'I have a ___.',
  explanation: 'Con mèo tiếng Anh là "cat".',
};

describe('ListeningSentenceFillBlankQuestion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the display sentence with the target word blanked out', () => {
    render(<ListeningSentenceFillBlankQuestion question={QUESTION} hasAnswered={false} onSubmit={vi.fn()} />);

    expect(screen.getByText('I have a ___.')).toBeVisible();
    expect(screen.queryByText('I have a cat.')).not.toBeInTheDocument();
  });

  it('speaks the full sentence (not just the bare word) when play-audio-button is clicked', async () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ListeningSentenceFillBlankQuestion question={QUESTION} hasAnswered={false} onSubmit={vi.fn()} />);

    await user.click(screen.getByTestId('play-audio-button'));

    expect(speakSpy).toHaveBeenCalledTimes(1);
    const utterance = speakSpy.mock.calls[0]?.[0] as SpeechSynthesisUtterance;
    expect(utterance.text).toBe('I have a cat.');
  });

  it('shows "listen again" label after the first play', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ListeningSentenceFillBlankQuestion question={QUESTION} hasAnswered={false} onSubmit={vi.fn()} />);

    await user.click(screen.getByTestId('play-audio-button'));

    expect(screen.getByTestId('play-audio-button')).toHaveTextContent('Nghe lại');
  });

  it('submits the typed answer via the submit-answer-button', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ListeningSentenceFillBlankQuestion question={QUESTION} hasAnswered={false} onSubmit={onSubmit} />);

    await user.type(screen.getByTestId('answer-input'), 'cat');
    await user.click(screen.getByTestId('submit-answer-button'));

    expect(onSubmit).toHaveBeenCalledWith('cat');
  });

  it('disables the input and submit button once answered', () => {
    render(<ListeningSentenceFillBlankQuestion question={QUESTION} hasAnswered={true} onSubmit={vi.fn()} />);

    expect(screen.getByTestId('answer-input')).toBeDisabled();
    expect(screen.getByTestId('submit-answer-button')).toBeDisabled();
  });
});
