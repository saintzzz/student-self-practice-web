import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import MemoryMatch from './MemoryMatch';
import { pickGameWords } from '../sources';
import { seededShuffleIndices } from '../../lib/prng';
import type { Grade } from '../../types';

const GRADE: Grade = { id: 'grade-1', name: 'Lớp 1' };
const SEED = 'test-memory';

/** Rebuilds the exact board order the component computes. */
function boardOrder() {
  const words = pickGameWords(GRADE.id, SEED, 4);
  const raw = words.flatMap((w) => [
    { id: `${w.id}-img`, pairId: w.id },
    { id: `${w.id}-word`, pairId: w.id },
  ]);
  return seededShuffleIndices(raw.length, `${SEED}:order`).map((i) => raw[i]!);
}

function pairIndexes() {
  const board = boardOrder();
  const pairs = new Map<string, number[]>();
  board.forEach((t, i) => pairs.set(t.pairId, [...(pairs.get(t.pairId) ?? []), i]));
  return [...pairs.values()];
}

/** Tap a full pair and let the mismatch timer settle. */
function clearPair(pair: number[]) {
  for (const i of pair) fireEvent.click(screen.getByTestId(`memory-card-${i}`));
  act(() => vi.advanceTimersByTime(900));
}

describe('MemoryMatch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders an 8-card face-down board', () => {
    render(<MemoryMatch grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    expect(screen.getByTestId('game-memory-match')).toBeVisible();
    expect(screen.getAllByTestId(/^memory-card-/).length).toBe(8);
  });

  it('flawless 4-move run earns max points (3-star clean play)', () => {
    const onEnd = vi.fn();
    render(<MemoryMatch grade={GRADE} seed={SEED} onEnd={onEnd} />);
    for (const pair of pairIndexes()) clearPair(pair);
    expect(onEnd).toHaveBeenCalledWith({
      points: 10,
      maxPoints: 10,
      correctCount: 4,
    });
  });

  it('one mismatch drops below max - no 3 stars for sloppy play', () => {
    const onEnd = vi.fn();
    render(<MemoryMatch grade={GRADE} seed={SEED} onEnd={onEnd} />);
    const pairs = pairIndexes();
    // Deliberate mismatch: first tile of pair 0 + first tile of pair 1.
    fireEvent.click(screen.getByTestId(`memory-card-${pairs[0]![0]!}`));
    fireEvent.click(screen.getByTestId(`memory-card-${pairs[1]![0]!}`));
    act(() => vi.advanceTimersByTime(900)); // mismatch reset
    for (const pair of pairs) clearPair(pair);
    expect(onEnd).toHaveBeenCalledWith({
      points: 9, // 5 moves -> +1 bonus only
      maxPoints: 10,
      correctCount: 4,
    });
  });
});
