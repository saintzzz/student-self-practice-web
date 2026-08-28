import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoundSummary from './RoundSummary';
import type { RoundOutcome } from '../lib/batch/batchSession';

const OUTCOME: RoundOutcome = {
  roundNumber: 1,
  roundType: 'extra-letter',
  titleVi: 'Vòng 1: Bắn chữ cái thừa',
  correctCount: 7,
  totalCount: 10,
  implemented: true,
};

describe('RoundSummary', () => {
  it('shows the round-score-summary testid with an "X/Y" fraction', () => {
    render(<RoundSummary outcome={OUTCOME} onNextRound={vi.fn()} />);

    expect(screen.getByTestId('round-score-summary')).toHaveTextContent('7/10');
  });

  it('calls onNextRound when next-round-button is clicked', async () => {
    const onNextRound = vi.fn();
    const user = userEvent.setup();
    render(<RoundSummary outcome={OUTCOME} onNextRound={onNextRound} />);

    await user.click(screen.getByTestId('next-round-button'));

    expect(onNextRound).toHaveBeenCalledOnce();
  });
});
