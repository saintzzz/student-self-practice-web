import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import TreasureChest from './TreasureChest';
import { imageChoiceRounds } from '../sources';
import type { Grade } from '../../types';

const GRADE: Grade = { id: 'grade-2', name: 'Lớp 2' };
const SEED = 'test-chest';
const ROUNDS = 5;

describe('TreasureChest', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders the chest with 3 closed locks', () => {
    render(<TreasureChest grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    expect(screen.getByTestId('game-treasure-chest')).toBeVisible();
    for (let i = 0; i < 3; i += 1) {
      expect(screen.getByTestId(`lock-${i}`).textContent).toBe('🔒');
    }
  });

  it('each correct answer cracks one lock; 3 locks opens the chest and ends', () => {
    const onEnd = vi.fn();
    const rounds = imageChoiceRounds(GRADE.id, SEED, ROUNDS);
    render(<TreasureChest grade={GRADE} seed={SEED} onEnd={onEnd} />);
    // Two correct answers -> two locks open, game continues.
    for (const q of rounds.slice(0, 2)) {
      fireEvent.click(screen.getByTestId(`option-${q.correctIndex}`));
      act(() => vi.advanceTimersByTime(800));
    }
    expect(screen.getByTestId('lock-0').textContent).toBe('🔓');
    expect(screen.getByTestId('lock-1').textContent).toBe('🔓');
    expect(screen.getByTestId('lock-2').textContent).toBe('🔒');
    expect(onEnd).not.toHaveBeenCalled();
    // Third correct opens the chest -> GameEnd.
    fireEvent.click(screen.getByTestId(`option-${rounds[2]!.correctIndex}`));
    act(() => vi.advanceTimersByTime(800));
    expect(onEnd).toHaveBeenCalledWith({ points: 6, maxPoints: 10, correctCount: 3 });
  });

  it('two misses on a round earn nothing but consume the round', () => {
    const rounds = imageChoiceRounds(GRADE.id, SEED, ROUNDS);
    const wrongs = [0, 1, 2, 3].filter((i) => i !== rounds[0]!.correctIndex);
    render(<TreasureChest grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByTestId(`option-${wrongs[0]!}`));
    fireEvent.click(screen.getByTestId(`option-${wrongs[1]!}`));
    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByTestId('lock-0').textContent).toBe('🔒');
    expect(screen.getByTestId('game-round-dots')).toHaveAttribute('aria-label', 'Câu 2 trên 5');
  });
});
