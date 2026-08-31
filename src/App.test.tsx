import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

/**
 * Drives the app through the v5/v6/v8 Batch/Round flow: Grade -> Start a
 * Batch -> Round 1 (extra-letter) -> Round 2 (listening-sentence-fill-blank
 * mixed with listening-image-choice, plan.md v8 AC30) -> Round 3
 * (pronunciation-recording) -> Round 4 (describe-and-choose-image) -> Batch
 * summary. See plan.md v5 "New Interaction Model: Batch / Round" and v6
 * AC24/AC25 (Round 3 and Round 4 are no longer stubs).
 */
async function startBatch(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByTestId('grade-card-grade-2'));
  await user.click(screen.getByTestId('start-batch-button'));
}

/**
 * Answers whichever question kind is on screen without hardcoding any
 * vocabulary. pronunciation-recording relies on the default fake
 * SpeechRecognition installed by src/test/setup.ts, which auto-completes
 * with a fixed transcript shortly after record-button is tapped.
 */
async function answerCurrentQuestion(user: ReturnType<typeof userEvent.setup>): Promise<string> {
  const card = screen.getByTestId('question-card');
  const kind = card.getAttribute('data-question-kind') ?? '';

  if (kind === 'extra-letter') {
    await user.click(screen.getByTestId('letter-tile-0'));
  } else if (kind === 'listening-sentence-fill-blank') {
    await user.click(screen.getByTestId('submit-answer-button'));
  } else if (kind === 'listening-image-choice') {
    await user.click(screen.getByTestId('option-0'));
  } else if (kind === 'pronunciation-recording') {
    await user.click(screen.getByTestId('record-button'));
    await waitFor(() => expect(screen.getByTestId('pronunciation-feedback')).toBeVisible());
  } else if (kind === 'describe-and-choose-image') {
    await user.click(screen.getByTestId('option-0'));
  }

  return kind;
}

/** Answers every question in the active Round until round-score-summary appears. */
async function completeActiveRound(user: ReturnType<typeof userEvent.setup>): Promise<Set<string>> {
  const seenKinds = new Set<string>();

  while (screen.queryByTestId('question-card')) {
    seenKinds.add(await answerCurrentQuestion(user));
    await user.click(screen.getByTestId('next-button'));
  }

  return seenKinds;
}

describe('App (v5/v6 Batch/Round flow)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows exactly one grade card on load (AC1)', () => {
    render(<App />);

    expect(screen.getByTestId('grade-card-grade-2')).toBeVisible();
    expect(screen.getAllByTestId(/^grade-card-/)).toHaveLength(1);
  });

  it('navigates grade -> start-batch screen -> Round 1, and back-to-grades returns to grade selection', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('grade-card-grade-2'));
    expect(screen.getByTestId('start-batch-button')).toBeVisible();

    await user.click(screen.getByTestId('back-to-grades'));
    expect(screen.getByTestId('grade-card-grade-2')).toBeVisible();

    await user.click(screen.getByTestId('grade-card-grade-2'));
    await user.click(screen.getByTestId('start-batch-button'));

    expect(screen.getByTestId('round-progress')).toHaveTextContent('1/4');
    expect(screen.getByTestId('question-card')).toHaveAttribute('data-question-kind', 'extra-letter');
  });

  it('completes Round 1, shows a round score summary, and Round 2 begins with a listening kind (AC17, AC18, AC30)', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<App />);

    await startBatch(user);
    const round1Kinds = await completeActiveRound(user);
    expect(round1Kinds).toEqual(new Set(['extra-letter']));
    expect(screen.getByTestId('round-score-summary')).toBeVisible();

    await user.click(screen.getByTestId('next-round-button'));

    expect(screen.getByTestId('round-progress')).toHaveTextContent('2/4');
    const round2FirstKind = screen.getByTestId('question-card').getAttribute('data-question-kind');
    expect(['listening-sentence-fill-blank', 'listening-image-choice']).toContain(round2FirstKind);
  });

  it(
    'completes Round 2, then Round 3 and Round 4 render and complete for real, reaching the Batch summary (AC17, AC21, AC24, AC25)',
    async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<App />);

    await startBatch(user);
    await completeActiveRound(user);
    await user.click(screen.getByTestId('next-round-button'));

    const round2Kinds = await completeActiveRound(user);
    expect(round2Kinds).toEqual(new Set(['listening-sentence-fill-blank', 'listening-image-choice']));
    expect(screen.getByTestId('round-score-summary')).toBeVisible();
    await user.click(screen.getByTestId('next-round-button'));

    // Round 3 - real content now (AC24), not a stub.
    expect(screen.getByTestId('round-progress')).toHaveTextContent('3/4');
    expect(screen.getByTestId('question-card')).toHaveAttribute('data-question-kind', 'pronunciation-recording');
    const round3Kinds = await completeActiveRound(user);
    expect(round3Kinds).toEqual(new Set(['pronunciation-recording']));
    expect(screen.getByTestId('round-score-summary')).toBeVisible();
    await user.click(screen.getByTestId('next-round-button'));

    // Round 4 - real content now (AC25), not a stub.
    expect(screen.getByTestId('round-progress')).toHaveTextContent('4/4');
    expect(screen.getByTestId('question-card')).toHaveAttribute(
      'data-question-kind',
      'describe-and-choose-image',
    );
    const round4Kinds = await completeActiveRound(user);
    expect(round4Kinds).toEqual(new Set(['describe-and-choose-image']));
    expect(screen.getByTestId('round-score-summary')).toBeVisible();
    await user.click(screen.getByTestId('next-round-button'));

    expect(screen.getByTestId('batch-score-summary')).toBeVisible();
    expect(screen.getByTestId('round-breakdown-1')).toBeVisible();
    expect(screen.getByTestId('round-breakdown-2')).toBeVisible();
    expect(screen.getByTestId('round-breakdown-3')).not.toHaveTextContent('Chưa có nội dung');
    expect(screen.getByTestId('round-breakdown-4')).not.toHaveTextContent('Chưa có nội dung');
    },
    15000,
  );

  /** Drives a full Batch (all 4 real Rounds) from a freshly rendered App to the Batch summary. */
  async function driveFullBatchToSummary(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await startBatch(user);
    await completeActiveRound(user);
    await user.click(screen.getByTestId('next-round-button'));
    await completeActiveRound(user);
    await user.click(screen.getByTestId('next-round-button'));
    await completeActiveRound(user);
    await user.click(screen.getByTestId('next-round-button'));
    await completeActiveRound(user);
    await user.click(screen.getByTestId('next-round-button'));
  }

  it(
    '"Luyện tập bài mới" starts a fresh Batch back at Round 1',
    async () => {
      vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
      const user = userEvent.setup();
      render(<App />);

      await driveFullBatchToSummary(user);

      await user.click(screen.getByTestId('practice-again-button'));

      expect(screen.getByTestId('round-progress')).toHaveTextContent('1/4');
      expect(screen.getByTestId('question-card')).toHaveAttribute('data-question-kind', 'extra-letter');
    },
    15000,
  );

  it(
    '"Chọn lớp khác" from the Batch summary returns all the way to grade selection',
    async () => {
      vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
      const user = userEvent.setup();
      render(<App />);

      await driveFullBatchToSummary(user);

      await user.click(screen.getByTestId('back-to-grades'));

      expect(screen.getByTestId('grade-card-grade-2')).toBeVisible();
    },
    15000,
  );
});
