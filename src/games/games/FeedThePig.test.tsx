import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import FeedThePig from './FeedThePig';
import { listeningImageRounds } from '../sources';
import type { Grade } from '../../types';

const GRADE: Grade = { id: 'grade-1', name: 'Lớp 1' };
const SEED = 'test-feed';
const ROUNDS = 6;

describe('FeedThePig', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders the pig + order card + 4 plates', () => {
    render(<FeedThePig grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    expect(screen.getByTestId('game-feed-the-pig')).toBeVisible();
    expect(screen.getByTestId('pig-face')).toBeVisible();
    expect(screen.getByTestId('game-listen-button')).toBeVisible();
  });

  it('a correct plate flips the pig to fed state and advances', () => {
    const rounds = listeningImageRounds(GRADE.id, SEED, ROUNDS);
    render(<FeedThePig grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByTestId(`option-${rounds[0]!.correctIndex}`), { force: true });
    expect(screen.getByTestId('pig-face').textContent).toBe('😋');
    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByTestId('game-round-dots')).toHaveAttribute(
      'aria-label',
      `Câu 2 trên ${ROUNDS}`,
    );
  });
});
