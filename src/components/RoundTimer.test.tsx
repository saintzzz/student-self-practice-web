import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RoundTimer from './RoundTimer';

describe('RoundTimer (plan.md v7 "Round Timer", AC27)', () => {
  it('formats 300 seconds as 5:00', () => {
    render(<RoundTimer secondsRemaining={300} />);

    expect(screen.getByTestId('round-timer')).toHaveTextContent('5:00');
  });

  it('pads single-digit seconds with a leading zero', () => {
    render(<RoundTimer secondsRemaining={65} />);

    expect(screen.getByTestId('round-timer')).toHaveTextContent('1:05');
  });

  it('formats 0 seconds as 0:00', () => {
    render(<RoundTimer secondsRemaining={0} />);

    expect(screen.getByTestId('round-timer')).toHaveTextContent('0:00');
  });

  it('applies an urgent style in the final 30 seconds', () => {
    render(<RoundTimer secondsRemaining={30} />);

    const cls = screen.getByTestId('round-timer').className;
    expect(cls).toContain('rose');
    expect(cls).toContain('animate-pulse');
  });

  it('does not apply the urgent style above 30 seconds remaining', () => {
    render(<RoundTimer secondsRemaining={31} />);

    const cls = screen.getByTestId('round-timer').className;
    expect(cls).not.toContain('rose');
    expect(cls).not.toContain('animate-pulse');
  });
});
