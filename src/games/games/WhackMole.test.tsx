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
      /* CR-115: only a popped-up mole is whackable - advance the tick
         until the correct mole is up before tapping. */
      const target = screen.getByTestId(`option-${q.correctIndex}`);
      for (let guard = 0; guard < 24 && target.dataset.up !== 'true'; guard += 1) {
        act(() => vi.advanceTimersByTime(250));
      }
      expect(target.dataset.up).toBe('true');
      fireEvent.click(target);
      act(() => vi.advanceTimersByTime(600));
    }
    expect(onEnd).toHaveBeenCalledWith({
      points: ROUNDS * 2,
      maxPoints: ROUNDS * 2,
      correctCount: ROUNDS,
      attempted: ROUNDS,
    });
  });

  it('a mole that is down cannot be whacked', () => {
    const rounds = listeningImageRounds(GRADE.id, SEED, ROUNDS);
    const q = rounds[0]!;
    const onEnd = vi.fn();
    render(<WhackMole grade={GRADE} seed={SEED} onEnd={onEnd} />);
    /* Sweep one full 4s cycle: there must be a tick where the correct
       mole is down, and at that moment its button is disabled. */
    let sawDown = false;
    for (let t = 0; t < 16 && !sawDown; t += 1) {
      act(() => vi.advanceTimersByTime(250));
      const target = screen.getByTestId(`option-${q.correctIndex}`);
      if (target.dataset.up === 'false') {
        sawDown = true;
        expect(target).toBeDisabled();
        fireEvent.click(target);
        // The click while down must not score nor advance the round.
        expect(target.dataset.up).toBe('false');
      }
    }
    expect(sawDown).toBe(true);
    expect(onEnd).not.toHaveBeenCalled();
  });
});
