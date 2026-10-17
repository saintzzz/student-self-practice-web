import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MazeChase from './MazeChase';
import type { Grade } from '../../types';

const GRADE: Grade = { id: 'grade-3', name: 'Lớp 3' };
const SEED = 'test-maze';
const COLS = 6;
const ROWS = 4;

describe('MazeChase', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders the board, hearts and the word prompt with a listen chip', () => {
    render(<MazeChase grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    expect(screen.getByTestId('game-maze-chase')).toBeVisible();
    expect(screen.getByTestId('maze-board')).toBeVisible();
    expect(screen.getByTestId('maze-hearts')).toBeVisible();
    expect(screen.getByTestId('game-listen-button')).toBeVisible();
    expect(screen.getByTestId('maze-cell-0').textContent).toBe('🐷');
  });

  it('only adjacent cells are tappable', () => {
    render(<MazeChase grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    const cell1 = screen.getByTestId('maze-cell-1') as HTMLButtonElement;
    const cell6 = screen.getByTestId('maze-cell-6') as HTMLButtonElement;
    const far = screen.getByTestId('maze-cell-23') as HTMLButtonElement;
    // Hero at 0: neighbors are 1 and 6 (unless a wall blocks one).
    expect(far.disabled).toBe(true);
    expect(cell1.disabled || cell6.disabled).toBe(false);
  });

  it('tapping an open adjacent cell moves Heo', () => {
    render(<MazeChase grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    const neighbors = [1, COLS].map(
      (i) => screen.getByTestId(`maze-cell-${i}`) as HTMLButtonElement,
    );
    const open = neighbors.find((b) => !b.disabled && b.textContent !== '🧱')!;
    fireEvent.click(open);
    // Hero occupies whichever open neighbor was tapped.
    const heroCell = Array.from({ length: COLS * ROWS }, (_, i) =>
      screen.getByTestId(`maze-cell-${i}`),
    ).find((c) => c.textContent === '🐷');
    expect(heroCell).toBe(open);
  });
});
