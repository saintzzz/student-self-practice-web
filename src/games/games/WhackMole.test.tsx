import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import WhackMole from './WhackMole';
import { listeningImageRounds } from '../sources';
import type { Grade } from '../../types';

const GRADE: Grade = { id: 'grade-1', name: 'Lớp 1' };
const SEED = 'test-mole';
const ROUNDS = 5;

describe('WhackMole', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders 4 mole holes + listen chip', () => {
    render(<WhackMole grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    expect(screen.getByTestId('game-whack-a-mole')).toBeVisible();
    expect(screen.getByTestId('game-listen-button')).toBeVisible();
    for (let i = 0; i < 4; i += 1) {
      expect(screen.getByTestId(`option-${i}`)).toBeVisible();
    }
  });

  it('full clean run reports max points', () => {
    const onEnd = vi.fn();
    const rounds = listeningImageRounds(GRADE.id, SEED, ROUNDS);
    render(<WhackMole grade={GRADE} seed={SEED} onEnd={onEnd} />);
    for (const q of rounds) {
      fireEvent.click(screen.getByTestId(`option-${q.correctIndex}`), { force: true });
      act(() => vi.advanceTimersByTime(600));
    }
    expect(onEnd).toHaveBeenCalledWith({
      points: ROUNDS * 2,
      maxPoints: ROUNDS * 2,
      correctCount: ROUNDS,
      attempted: ROUNDS,
    });
  });
});
