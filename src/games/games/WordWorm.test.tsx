import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import WordWorm from './WordWorm';
import { spellableWords } from '../sources';
import { seededShuffleIndices } from '../../lib/prng';
import type { Grade } from '../../types';

const GRADE: Grade = { id: 'grade-2', name: 'Lớp 2' };
const SEED = 'test-worm';
const COLS = 6;
const ROWS = 5;

describe('WordWorm', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders the board, spelling strip and direction pad', () => {
    const words = spellableWords(GRADE.id, SEED, 3);
    render(<WordWorm grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    expect(screen.getByTestId('game-word-worm')).toBeVisible();
    expect(screen.getByTestId('worm-board')).toBeVisible();
    expect(screen.getByTestId('worm-pad')).toBeVisible();
    expect(screen.getByTestId('worm-word').textContent).toHaveLength(words[0]!.word.length);
  });

  it('scatters the word letters plus distractors onto free cells', () => {
    const words = spellableWords(GRADE.id, SEED, 3);
    const word = words[0]!.word.toLowerCase();
    render(<WordWorm grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    // Head starts at floor(5/2)*6+2 = 14 - every other cell is free.
    const free = Array.from({ length: COLS * ROWS }, (_, i) => i).filter((c) => c !== 14);
    const order = seededShuffleIndices(free.length, `${SEED}:worm:0`);
    const firstLetterCell = free[order[0]!]!;
    expect(screen.getByTestId(`worm-cell-${firstLetterCell}`).textContent).toBe(word[0]);
  });

  it('bumping a wall costs a heart; three bumps ends the run', () => {
    const words = spellableWords(GRADE.id, SEED, 3);
    const total = words.reduce((s, w) => s + w.word.length, 0);
    const onEnd = vi.fn();
    render(<WordWorm grade={GRADE} seed={SEED} onEnd={onEnd} />);
    // Head at cell 14 (x=2,y=2): two ups reach the top edge, then each
    // further up is a wall bump.
    const up = screen.getByTestId('worm-up');
    fireEvent.click(up); // y=1
    fireEvent.click(up); // y=0
    fireEvent.click(up); // wall -> 2 hearts
    fireEvent.click(up); // wall -> 1 heart
    fireEvent.click(up); // wall -> 0 hearts -> end
    expect(onEnd).toHaveBeenCalledWith({ points: 0, maxPoints: total, correctCount: 0 });
  });

  it('moving into an open cell slides the worm', () => {
    render(<WordWorm grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByTestId('worm-right'));
    expect(screen.getByTestId('worm-cell-15').textContent).toBe('🐛');
    expect(screen.getByTestId('worm-cell-14').textContent).not.toBe('🐛');
  });
});
