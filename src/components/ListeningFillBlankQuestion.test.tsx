import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListeningFillBlankQuestion from './ListeningFillBlankQuestion';
import type { ListeningFillBlankQuestion as ListeningFillBlankQuestionType } from '../types';

const QUESTION: ListeningFillBlankQuestionType = {
  id: 'q1',
  topicId: 't1',
  kind: 'listening-fill-blank',
  word: 'rabbit',
  explanation: 'Con thỏ tiếng Anh là "rabbit".',
};

describe('ListeningFillBlankQuestion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the listen button, answer input, and submit button', () => {
    render(<ListeningFillBlankQuestion question={QUESTION} hasAnswered={false} onSubmit={vi.fn()} />);

    expect(screen.getByTestId('play-audio-button')).toBeVisible();
    expect(screen.getByTestId('answer-input')).toBeVisible();
    expect(screen.getByTestId('submit-answer-button')).toBeVisible();
  });

  it('calls window.speechSynthesis.speak with the target word when the listen button is clicked (AC5)', async () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ListeningFillBlankQuestion question={QUESTION} hasAnswered={false} onSubmit={vi.fn()} />);

    await user.click(screen.getByTestId('play-audio-button'));

    expect(speakSpy).toHaveBeenCalledTimes(1);
    const utterance = speakSpy.mock.calls[0]?.[0] as SpeechSynthesisUtterance;
    expect(utterance.text).toBe('rabbit');
    expect(utterance.lang).toBe('en-US');
  });

  it('switches the listen button label to "listen again" and re-triggers speech on repeat clicks', async () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ListeningFillBlankQuestion question={QUESTION} hasAnswered={false} onSubmit={vi.fn()} />);

    const playButton = screen.getByTestId('play-audio-button');
    await user.click(playButton);
    expect(playButton).toHaveTextContent('Nghe lại');

    await user.click(playButton);

    expect(speakSpy).toHaveBeenCalledTimes(2);
  });

  it('calls onSubmit with the typed value when the submit button is clicked', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ListeningFillBlankQuestion question={QUESTION} hasAnswered={false} onSubmit={onSubmit} />);

    await user.type(screen.getByTestId('answer-input'), 'rabbit');
    await user.click(screen.getByTestId('submit-answer-button'));

    expect(onSubmit).toHaveBeenCalledWith('rabbit');
  });

  it('calls onSubmit when Enter is pressed in the input (AC5)', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ListeningFillBlankQuestion question={QUESTION} hasAnswered={false} onSubmit={onSubmit} />);

    await user.type(screen.getByTestId('answer-input'), 'rabbit{Enter}');

    expect(onSubmit).toHaveBeenCalledWith('rabbit');
  });

  it('disables the input and submit button once answered', () => {
    render(<ListeningFillBlankQuestion question={QUESTION} hasAnswered={true} onSubmit={vi.fn()} />);

    expect(screen.getByTestId('answer-input')).toBeDisabled();
    expect(screen.getByTestId('submit-answer-button')).toBeDisabled();
  });
});
