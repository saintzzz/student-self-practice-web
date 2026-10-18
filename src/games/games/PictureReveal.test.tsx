import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import PictureReveal from './PictureReveal';
import { imageChoiceRounds } from '../sources';
import { seededShuffleIndices } from '../../lib/prng';
import type { Grade } from '../../types';

const GRADE: Grade = { id: 'grade-3', name: 'Lớp 3' };
const SEED = 'test-reveal';
const TILES = 9;

describe('PictureReveal', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders 9 covered tiles and a word question', () => {
    render(<PictureReveal grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    expect(screen.getByTestId('game-picture-reveal')).toBeVisible();
    for (let i = 0; i < TILES; i += 1) {
      expect(screen.getByTestId(`reveal-tile-${i}`)).toBeVisible();
    }
    for (let i = 0; i < 4; i += 1) {
      expect(screen.getByTestId(`option-${i}`)).toBeVisible();
    }
  });

  it('a correct answer lifts exactly one cover', () => {
    const rounds = imageChoiceRounds(GRADE.id, SEED, TILES);
    render(<PictureReveal grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByTestId(`option-${rounds[0]!.correctIndex}`));
    act(() => vi.advanceTimersByTime(800));
    const open = Array.from({ length: TILES }, (_, i) =>
      screen.getByTestId(`reveal-tile-${i}`).textContent,
    ).filter((t) => t && t !== '✦');
    expect(open.length).toBe(1);
    // The lifted cover is the first in the shuffled reveal order, not
    // simply the top-left tile (regression: reveal positions must shuffle).
    const order = seededShuffleIndices(TILES, `${SEED}:reveal`);
    expect(screen.getByTestId(`reveal-tile-${order[0]!}`).textContent).not.toBe('✦');
    expect(screen.getByTestId(`reveal-tile-${order[1]!}`).textContent).toBe('✦');
  });

  it('a wrong answer lifts no cover and the round still moves on', () => {
    const rounds = imageChoiceRounds(GRADE.id, SEED, TILES);
    const wrong = [0, 1, 2, 3].find((i) => i !== rounds[0]!.correctIndex)!;
    render(<PictureReveal grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByTestId(`option-${wrong}`));
    act(() => vi.advanceTimersByTime(800));
    const open = Array.from({ length: TILES }, (_, i) =>
      screen.getByTestId(`reveal-tile-${i}`).textContent,
    ).filter((t) => t && t !== '✦');
    expect(open.length).toBe(0);
    expect(screen.getByTestId('game-round-dots')).toHaveAttribute('aria-label', 'Câu 2 trên 9');
  });

  it('revealing all 9 reports a flawless GameEnd (3 stars = clean play)', () => {
    const onEnd = vi.fn();
    const rounds = imageChoiceRounds(GRADE.id, SEED, TILES);
    render(<PictureReveal grade={GRADE} seed={SEED} onEnd={onEnd} />);
    for (const q of rounds) {
      fireEvent.click(screen.getByTestId(`option-${q.correctIndex}`));
      act(() => vi.advanceTimersByTime(800));
    }
    expect(onEnd).toHaveBeenCalledWith({ points: TILES, maxPoints: TILES, correctCount: TILES, attempted: TILES });
  });

  it('one miss caps the score below max', () => {
    const onEnd = vi.fn();
    const rounds = imageChoiceRounds(GRADE.id, SEED, TILES);
    const wrong = [0, 1, 2, 3].find((i) => i !== rounds[0]!.correctIndex)!;
    render(<PictureReveal grade={GRADE} seed={SEED} onEnd={onEnd} />);
    fireEvent.click(screen.getByTestId(`option-${wrong}`));
    act(() => vi.advanceTimersByTime(800));
    for (const q of rounds.slice(1)) {
      fireEvent.click(screen.getByTestId(`option-${q.correctIndex}`));
      act(() => vi.advanceTimersByTime(800));
    }
    expect(onEnd).toHaveBeenCalledWith({ points: 8, maxPoints: TILES, correctCount: 8, attempted: TILES });
  });
});
