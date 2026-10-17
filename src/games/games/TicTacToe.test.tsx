import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import TicTacToe from './TicTacToe';
import { imageChoiceRounds } from '../sources';
import type { Grade } from '../../types';

const GRADE: Grade = { id: 'grade-2', name: 'Lớp 2' };
const SEED = 'test-ttt';

describe('TicTacToe', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders a 3x3 board and the pending-cell prompt', () => {
    render(<TicTacToe grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    expect(screen.getByTestId('game-tic-tac-toe')).toBeVisible();
    for (let i = 0; i < 9; i += 1) {
      expect(screen.getByTestId(`ttt-cell-${i}`)).toBeVisible();
    }
    expect(screen.getByTestId('ttt-prompt')).toBeVisible();
  });

  it('a correct answer claims the cell with X and lets the CPU reply', () => {
    const rounds = imageChoiceRounds(GRADE.id, SEED, 9);
    render(<TicTacToe grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByTestId('ttt-cell-4'));
    // Options appear for the pending cell's question.
    fireEvent.click(screen.getByTestId(`option-${rounds[0]!.correctIndex}`));
    expect(screen.getByTestId('ttt-cell-4').textContent).toBe('X');
  });

  it('a wrong answer hands the cell to the CPU (O)', () => {
    const rounds = imageChoiceRounds(GRADE.id, SEED, 9);
    const wrong = [0, 1, 2, 3].find((i) => i !== rounds[0]!.correctIndex)!;
    render(<TicTacToe grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByTestId('ttt-cell-0'));
    fireEvent.click(screen.getByTestId(`option-${wrong}`));
    // CPU claimed a different cell - cell 0 stays empty and becomes O-free.
    const cells = Array.from({ length: 9 }, (_, i) =>
      screen.getByTestId(`ttt-cell-${i}`).textContent,
    );
    expect(cells.filter((c) => c === 'O').length).toBeGreaterThanOrEqual(1);
    expect(cells[0]).not.toBe('X');
  });

  it('reports a GameEnd once the board resolves', () => {
    const onEnd = vi.fn();
    const rounds = imageChoiceRounds(GRADE.id, SEED, 9);
    render(<TicTacToe grade={GRADE} seed={SEED} onEnd={onEnd} />);
    // Play through: always pick the first empty cell and answer correctly.
    for (let i = 0; i < 9 && !onEnd.mock.calls.length; i += 1) {
      const empty = Array.from({ length: 9 }, (_, c) => c).find(
        (c) => !screen.getByTestId(`ttt-cell-${c}`).textContent,
      );
      if (empty === undefined) break;
      fireEvent.click(screen.getByTestId(`ttt-cell-${empty}`));
      const q = rounds[i] ?? rounds[rounds.length - 1];
      fireEvent.click(screen.getByTestId(`option-${q!.correctIndex}`));
      // Two chained timers: lock release (~700ms) then finish->onEnd (~700ms).
      act(() => vi.advanceTimersByTime(1500));
    }
    expect(onEnd).toHaveBeenCalledWith(
      expect.objectContaining({ maxPoints: 9 }),
    );
  });
});
