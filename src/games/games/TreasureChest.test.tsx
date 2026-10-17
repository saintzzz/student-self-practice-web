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

  it('renders the chest with 5 closed locks', () => {
    render(<TreasureChest grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    expect(screen.getByTestId('game-treasure-chest')).toBeVisible();
    for (let i = 0; i < 5; i += 1) {
      expect(screen.getByTestId(`lock-${i}`).textContent).toBe('🔒');
    }
  });

  it('each correct answer cracks one lock; a flawless run opens the chest and reports max score', () => {
    const onEnd = vi.fn();
    const rounds = imageChoiceRounds(GRADE.id, SEED, ROUNDS);
    render(<TreasureChest grade={GRADE} seed={SEED} onEnd={onEnd} />);
    for (const q of rounds.slice(0, 4)) {
      fireEvent.click(screen.getByTestId(`option-${q.correctIndex}`));
      act(() => vi.advanceTimersByTime(800));
    }
    expect(screen.getByTestId('lock-3').textContent).toBe('🔓');
    expect(screen.getByTestId('lock-4').textContent).toBe('🔒');
    expect(onEnd).not.toHaveBeenCalled();
    // Fifth correct opens the chest; GameEnd follows the payoff beat.
    fireEvent.click(screen.getByTestId(`option-${rounds[4]!.correctIndex}`));
    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByTestId('chest-visual').textContent).toContain('🎁');
    act(() => vi.advanceTimersByTime(1000));
    expect(onEnd).toHaveBeenCalledWith({ points: 10, maxPoints: 10, correctCount: 5 });
  });

  it('a miss leaves the chest closed and the score below max', () => {
    const onEnd = vi.fn();
    const rounds = imageChoiceRounds(GRADE.id, SEED, ROUNDS);
    const wrongs = [0, 1, 2, 3].filter((i) => i !== rounds[0]!.correctIndex);
    render(<TreasureChest grade={GRADE} seed={SEED} onEnd={onEnd} />);
    fireEvent.click(screen.getByTestId(`option-${wrongs[0]!}`));
    fireEvent.click(screen.getByTestId(`option-${wrongs[1]!}`));
    act(() => vi.advanceTimersByTime(800));
    for (const q of rounds.slice(1)) {
      fireEvent.click(screen.getByTestId(`option-${q.correctIndex}`));
      act(() => vi.advanceTimersByTime(800));
    }
    act(() => vi.advanceTimersByTime(1000));
    expect(onEnd).toHaveBeenCalledWith({ points: 8, maxPoints: 10, correctCount: 4 });
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
