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
  points: 70,
  maxPoints: 100,
  implemented: true,
};

describe('RoundSummary', () => {
  it('shows the round-score-summary testid with an "X/Y" fraction', () => {
    render(<RoundSummary outcome={OUTCOME} onNextRound={vi.fn()} />);

    expect(screen.getByTestId('round-score-summary')).toHaveTextContent('7/10');
  });

  it('shows the points/maxPoints total (plan.md v10, AC36)', () => {
    render(<RoundSummary outcome={OUTCOME} onNextRound={vi.fn()} />);

    expect(screen.getByTestId('round-points-summary')).toHaveTextContent('70/100');
  });

  it('shows an encouraging completion badge below the 75% threshold, never "failed"/"incomplete" (AC37)', () => {
    render(<RoundSummary outcome={OUTCOME} onNextRound={vi.fn()} />);

    const badge = screen.getByTestId('round-completion-badge');
    expect(badge).not.toHaveTextContent(/thất bại|chưa hoàn thành|incomplete|failed/i);
  });

  it('shows the "hoàn thành" badge at/above the 75% threshold', () => {
    render(
      <RoundSummary
        outcome={{ ...OUTCOME, correctCount: 8, points: 80, maxPoints: 100 }}
        onNextRound={vi.fn()}
      />,
    );

    expect(screen.getByTestId('round-completion-badge')).toHaveTextContent('Hoàn thành');
  });

  it('shows the app-wide pig mascot in celebrating mood (AC38)', () => {
    render(<RoundSummary outcome={OUTCOME} onNextRound={vi.fn()} />);

    expect(screen.getByTestId('mascot')).toHaveAttribute('data-mascot-mood', 'celebrating');
  });

  it('calls onNextRound when next-round-button is clicked', async () => {
    const onNextRound = vi.fn();
    const user = userEvent.setup();
    render(<RoundSummary outcome={OUTCOME} onNextRound={onNextRound} />);

    await user.click(screen.getByTestId('next-round-button'));

    expect(onNextRound).toHaveBeenCalledOnce();
  });
});
