import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

/**
 * Drives the app through the v5 Batch/Round flow: Grade -> Start a Batch ->
 * Round 1 (extra-letter) -> Round 2 (listening-sentence-fill-blank) ->
 * Round 3/4 stubs -> Batch summary. See plan.md v5 "New Interaction Model:
 * Batch / Round" and its Data-Testid Contract Additions.
 */
async function startBatch(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByTestId('grade-card-grade-2'));
  await user.click(screen.getByTestId('start-batch-button'));
}

/** Answers whichever question kind is on screen without hardcoding any vocabulary. */
async function answerCurrentQuestion(user: ReturnType<typeof userEvent.setup>): Promise<string> {
  const card = screen.getByTestId('question-card');
  const kind = card.getAttribute('data-question-kind') ?? '';

  if (kind === 'extra-letter') {
    await user.click(screen.getByTestId('letter-tile-0'));
  } else if (kind === 'listening-sentence-fill-blank') {
    await user.click(screen.getByTestId('submit-answer-button'));
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

describe('App (v5 Batch/Round flow)', () => {
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

  it('completes Round 1, shows a round score summary, and Round 2 begins on listening-sentence-fill-blank (AC17, AC18)', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<App />);

    await startBatch(user);
    const round1Kinds = await completeActiveRound(user);
    expect(round1Kinds).toEqual(new Set(['extra-letter']));
    expect(screen.getByTestId('round-score-summary')).toBeVisible();

    await user.click(screen.getByTestId('next-round-button'));

    expect(screen.getByTestId('round-progress')).toHaveTextContent('2/4');
    expect(screen.getByTestId('question-card')).toHaveAttribute(
      'data-question-kind',
      'listening-sentence-fill-blank',
    );
  });

  it('completing Round 1 and Round 2, then passing through Round 3/4 stubs, reaches the Batch summary (AC17, AC21)', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<App />);

    await startBatch(user);
    await completeActiveRound(user);
    await user.click(screen.getByTestId('next-round-button'));

    const round2Kinds = await completeActiveRound(user);
    expect(round2Kinds).toEqual(new Set(['listening-sentence-fill-blank']));
    expect(screen.getByTestId('round-score-summary')).toBeVisible();
    await user.click(screen.getByTestId('next-round-button'));

    // Round 3 stub
    expect(screen.getByTestId('round-progress')).toHaveTextContent('3/4');
    expect(screen.queryByTestId('question-card')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('next-round-button'));

    // Round 4 stub
    expect(screen.getByTestId('round-progress')).toHaveTextContent('4/4');
    expect(screen.queryByTestId('question-card')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('next-round-button'));

    expect(screen.getByTestId('batch-score-summary')).toBeVisible();
    expect(screen.getByTestId('round-breakdown-1')).toBeVisible();
    expect(screen.getByTestId('round-breakdown-2')).toBeVisible();
    expect(screen.getByTestId('round-breakdown-3')).toHaveTextContent('Chưa có nội dung');
    expect(screen.getByTestId('round-breakdown-4')).toHaveTextContent('Chưa có nội dung');
  });

  it('"Luyện tập bài mới" starts a fresh Batch back at Round 1', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<App />);

    await startBatch(user);
    await completeActiveRound(user);
    await user.click(screen.getByTestId('next-round-button'));
    await completeActiveRound(user);
    await user.click(screen.getByTestId('next-round-button'));
    await user.click(screen.getByTestId('next-round-button'));
    await user.click(screen.getByTestId('next-round-button'));

    await user.click(screen.getByTestId('practice-again-button'));

    expect(screen.getByTestId('round-progress')).toHaveTextContent('1/4');
    expect(screen.getByTestId('question-card')).toHaveAttribute('data-question-kind', 'extra-letter');
  });

  it('"Chọn lớp khác" from the Batch summary returns all the way to grade selection', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<App />);

    await startBatch(user);
    await completeActiveRound(user);
    await user.click(screen.getByTestId('next-round-button'));
    await completeActiveRound(user);
    await user.click(screen.getByTestId('next-round-button'));
    await user.click(screen.getByTestId('next-round-button'));
    await user.click(screen.getByTestId('next-round-button'));

    await user.click(screen.getByTestId('back-to-grades'));

    expect(screen.getByTestId('grade-card-grade-2')).toBeVisible();
  });
});
