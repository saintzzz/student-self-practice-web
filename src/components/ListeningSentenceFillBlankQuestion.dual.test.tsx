import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListeningSentenceFillBlankQuestion from './ListeningSentenceFillBlankQuestion';
import { ViewerProvider } from '../lib/viewer/ViewerContext';
import type { ListeningSentenceFillBlankQuestion as QuestionType } from '../types';

/**
 * CR-82 (spec s13.7, R-v5-10): the G1-2 gap dual input - word bank
 * primary + peer typed mode via gap-input-toggle / tap-empty-gap; V8
 * forced typing; no toggle for ineligible items or G3-5.
 */

const QUESTION: QuestionType = {
  id: 'q-lsfb-dual',
  topicId: 't1',
  kind: 'listening-sentence-fill-blank',
  word: 'cat',
  wordId: 'cat',
  sentence: 'I can see a cat.',
  displaySentence: 'I can see a ___.',
  explanation: 'Con mèo tiếng Anh là "cat".',
};

const BANKED: QuestionType = {
  ...QUESTION,
  bank: { options: ['dog', 'cat', 'bird'], optionWordIds: ['dog', 'cat', 'bird'] },
};

function renderHost(question: QuestionType, gradeId?: string, hasAnswered = false) {
  const onSubmit = vi.fn();
  render(
    <ViewerProvider gradeId={gradeId ?? 'grade-1'}>
      <ListeningSentenceFillBlankQuestion question={question} hasAnswered={hasAnswered} onSubmit={onSubmit} />
    </ViewerProvider>,
  );
  return { onSubmit };
}

describe('ListeningSentenceFillBlankQuestion dual input (s13.7)', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('bank-eligible G1-2 item defaults to the word bank with a Gõ tay toggle', () => {
    renderHost(BANKED);
    expect(screen.getByTestId('gap-bank')).toBeInTheDocument();
    expect(screen.queryByTestId('answer-input')).not.toBeInTheDocument();
    const toggle = screen.getByTestId('gap-input-toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveTextContent('Gõ tay');
  });

  it('toggle switches to typing, unmounts the bank and flips its label', async () => {
    renderHost(BANKED);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('gap-input-toggle'));

    expect(screen.queryByTestId('gap-bank')).not.toBeInTheDocument();
    expect(screen.getByTestId('answer-input')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('answer-input')).toHaveFocus());
    const toggle = screen.getByTestId('gap-input-toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveTextContent('Chọn từ');
  });

  it('tap on the empty sentence-gap switches to typing (s13.7)', async () => {
    renderHost(BANKED);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('sentence-gap'));
    expect(screen.getByTestId('answer-input')).toBeInTheDocument();
  });

  it('typed submission still flows through onSubmit in bank-offered type mode', async () => {
    const { onSubmit } = renderHost(BANKED);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('gap-input-toggle'));
    await user.type(screen.getByTestId('answer-input'), 'cat');
    await user.click(screen.getByTestId('submit-answer-button'));
    expect(onSubmit).toHaveBeenCalledWith('cat');
  });

  it('the session preference persists: last chosen mode wins on the next mount', async () => {
    const first = renderHost(BANKED);
    void first;
    const user = userEvent.setup();
    await user.click(screen.getByTestId('gap-input-toggle'));
    expect(screen.getByTestId('answer-input')).toBeInTheDocument();

    /* Remount a fresh question - the stored 'type' preference applies
       to the NEXT gap item too (spec s13.7 default-mode rule). */
    renderHost({ ...BANKED, id: 'q-lsfb-dual-2' });
    expect(screen.getAllByTestId('answer-input').length).toBe(2);
    expect(screen.queryAllByTestId('gap-bank').length).toBe(0);
  });

  it('no toggle on an ineligible item (typed-only) even for G1-2', () => {
    renderHost(QUESTION);
    expect(screen.queryByTestId('gap-input-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('answer-input')).toBeInTheDocument();
    expect(screen.queryByTestId('gap-bank')).not.toBeInTheDocument();
  });

  it('G3-5 is typed-only even when the payload carries a bank', () => {
    renderHost(BANKED, 'grade-3');
    expect(screen.getByTestId('answer-input')).toBeInTheDocument();
    expect(screen.queryByTestId('gap-input-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gap-bank')).not.toBeInTheDocument();
  });

  it('V8: an audio failure forces typing, hides the toggle and shows the warning', async () => {
    /* Make speak fail synchronously -> useAudioPlayback playbackFailed. */
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {
      throw new Error('no voices');
    });
    const user = userEvent.setup();
    renderHost(BANKED);
    await user.click(screen.getByTestId('play-audio-button'));

    expect(await screen.findByTestId('answer-input')).toBeInTheDocument();
    expect(screen.queryByTestId('gap-input-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gap-bank')).not.toBeInTheDocument();
    expect(screen.getByTestId('audio-playback-warning')).toBeInTheDocument();
  });

  it('switching clears unsubmitted state and never submits', async () => {
    const { onSubmit } = renderHost(BANKED);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('gap-input-toggle')); // -> type
    await user.type(screen.getByTestId('answer-input'), 'cta');
    await user.click(screen.getByTestId('gap-input-toggle')); // -> bank
    expect(onSubmit).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('gap-input-toggle')); // -> type again
    expect(screen.getByTestId('answer-input')).toHaveValue('');
  });
});
