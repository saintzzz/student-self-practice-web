import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import CastleGuard from './CastleGuard';
import { imageChoiceRounds } from '../sources';
import type { Grade } from '../../types';

const GRADE: Grade = { id: 'grade-3', name: 'Lớp 3' };
const SEED = 'test-castle';
const ROUNDS = 8;

describe('CastleGuard', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders the path, gate, hearts and a slime on cell 0', () => {
    render(<CastleGuard grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    expect(screen.getByTestId('game-castle-guard')).toBeVisible();
    expect(screen.getByTestId('castle-gate')).toBeVisible();
    expect(screen.getByTestId('castle-hearts')).toBeVisible();
    expect(screen.getByTestId('path-cell-0').textContent).toBeTruthy();
  });

  it('a correct answer pops the front slime', () => {
    const rounds = imageChoiceRounds(GRADE.id, SEED, ROUNDS);
    render(<CastleGuard grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByTestId(`option-${rounds[0]!.correctIndex}`));
    // Bolt flash on the front slime.
    expect(screen.getByTestId('path-cell-0').textContent).toContain('💥');
    act(() => vi.advanceTimersByTime(800));
    // New wave entered - one slime back at cell 0.
    expect(screen.getByTestId('path-cell-0').textContent).not.toContain('💥');
    expect(screen.getByTestId('path-cell-0').textContent).toBeTruthy();
  });

  it('a double-miss advances the wave by one cell', () => {
    const rounds = imageChoiceRounds(GRADE.id, SEED, ROUNDS);
    const wrongs = [0, 1, 2, 3].filter((i) => i !== rounds[0]!.correctIndex);
    render(<CastleGuard grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByTestId(`option-${wrongs[0]!}`));
    fireEvent.click(screen.getByTestId(`option-${wrongs[1]!}`));
    act(() => vi.advanceTimersByTime(900));
    // The starting slime moved to cell 1; the new wave slime sits at cell 0.
    expect(screen.getByTestId('path-cell-1').textContent).toBeTruthy();
    expect(screen.getByTestId('path-cell-0').textContent).toBeTruthy();
  });

  it('a flawless run reports max points with all hearts', () => {
    const onEnd = vi.fn();
    const rounds = imageChoiceRounds(GRADE.id, SEED, ROUNDS);
    render(<CastleGuard grade={GRADE} seed={SEED} onEnd={onEnd} />);
    for (const q of rounds) {
      fireEvent.click(screen.getByTestId(`option-${q.correctIndex}`));
      act(() => vi.advanceTimersByTime(800));
    }
    expect(onEnd).toHaveBeenCalledWith({ points: ROUNDS, maxPoints: ROUNDS, correctCount: ROUNDS });
  });
});
