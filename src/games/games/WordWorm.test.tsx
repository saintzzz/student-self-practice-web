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

  it('eating a future target letter out of order keeps it on the board (r1 soft-lock regression)', () => {
    const words = spellableWords(GRADE.id, SEED, 3);
    const word = words[0]!.word.toLowerCase();
    render(<WordWorm grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    // Reproduce the placement the component computes (head at cell 14).
    const free = Array.from({ length: COLS * ROWS }, (_, i) => i).filter((c) => c !== 14);
    const order = seededShuffleIndices(free.length, `${SEED}:worm:0`);
    const placed = word
      .split('')
      .map((letter, i) => ({ cell: free[order[i]!]!, letter, target: i }));
    const distractors = [1, 2, 3]
      .map((d) => free[order[word.length - 1 + d]!]!)
      .filter(Boolean);
    const occupied = new Set([...placed.map((p) => p.cell), ...distractors]);

    // Find a future target letter reachable by a clean greedy path
    // (x-first, then y) so no other letter is touched on the way.
    const head = 14;
    const hx = head % COLS;
    const hy = Math.floor(head / COLS);
    const target = placed
      .filter((p) => p.target > 0)
      .find((p) => {
        const tx = p.cell % COLS;
        const ty = Math.floor(p.cell / COLS);
        const path: number[] = [];
        for (let x = hx; x !== tx; x += Math.sign(tx - hx)) path.push(hy * COLS + x);
        for (let y = hy; y !== ty; y += Math.sign(ty - hy)) path.push(y * COLS + tx);
        return path.every((c) => !occupied.has(c));
      });
    expect(target, 'test requires a clean path to a future letter').toBeTruthy();

    // Drive the worm onto that letter - wrong order, so a heart is lost
    // but the letter must STAY on the board (it was previously deleted,
    // making the word impossible to finish).
    const tx = target!.cell % COLS;
    const ty = Math.floor(target!.cell / COLS);
    let cx = hx;
    let cy = hy;
    while (cx !== tx) {
      fireEvent.click(screen.getByTestId(cx < tx ? 'worm-right' : 'worm-left'));
      cx += Math.sign(tx - cx);
    }
    while (cy !== ty) {
      fireEvent.click(screen.getByTestId(cy < ty ? 'worm-down' : 'worm-up'));
      cy += Math.sign(ty - cy);
    }
    // The worm is now on the future letter (head hides the glyph), so
    // step onto an empty neighbor to reveal the preserved letter.
    const stepBack: [string, number][] = [
      ['worm-left', -1], ['worm-right', 1], ['worm-up', -COLS], ['worm-down', COLS],
    ];
    const back = stepBack.find(([, d]) => {
      const n = target!.cell + d;
      const nx = n % COLS;
      return n >= 0 && n < COLS * ROWS && !occupied.has(n) &&
        !(d === -1 && nx === COLS - 1) && !(d === 1 && nx === 0);
    });
    expect(back, 'test requires an empty neighbor to step back to').toBeTruthy();
    fireEvent.click(screen.getByTestId(back![0]));
    expect(screen.getByTestId(`worm-cell-${target!.cell}`).textContent).toBe(target!.letter);
    const hearts = screen.getByTestId('worm-hearts');
    expect(hearts.querySelectorAll('.opacity-25').length).toBe(1);
  });

  it('moving into an open cell slides the worm', () => {
    render(<WordWorm grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByTestId('worm-right'));
    expect(screen.getByTestId('worm-cell-15').textContent).toBe('🐛');
    expect(screen.getByTestId('worm-cell-14').textContent).not.toBe('🐛');
  });
});
