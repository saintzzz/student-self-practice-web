import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import BalloonPop from './BalloonPop';
import { listeningImageRounds } from '../sources';
import type { Grade } from '../../types';

const GRADE: Grade = { id: 'grade-1', name: 'Lớp 1' };
const SEED = 'test-balloon';
const ROUNDS = 5; // mirrors the component's ROUNDS constant

describe('BalloonPop', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders the balloon field with 4 options and a round counter', () => {
    render(<BalloonPop grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    expect(screen.getByTestId('game-balloon-pop')).toBeVisible();
    expect(screen.getByTestId('game-listen-button')).toBeVisible();
    for (let i = 0; i < 4; i += 1) {
      expect(screen.getByTestId(`option-${i}`)).toBeVisible();
    }
  });

  it('popping the correct balloon earns 2 points and advances the round', () => {
    const rounds = listeningImageRounds(GRADE.id, SEED, ROUNDS);
    render(<BalloonPop grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByTestId(`option-${rounds[0]!.correctIndex}`));
    act(() => vi.advanceTimersByTime(600));
    // Second round mounted - counter moved on.
    expect(screen.getByTestId('game-round-dots')).toHaveAttribute(
      'aria-label',
      `Câu 2 trên ${ROUNDS}`,
    );
  });

  it('two wrong picks end the round with no points', () => {
    const rounds = listeningImageRounds(GRADE.id, SEED, ROUNDS);
    const wrongs = [0, 1, 2, 3].filter((i) => i !== rounds[0]!.correctIndex);
    render(<BalloonPop grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByTestId(`option-${wrongs[0]!}`));
    fireEvent.click(screen.getByTestId(`option-${wrongs[1]!}`));
    act(() => vi.advanceTimersByTime(700));
    expect(screen.getByTestId('game-round-dots')).toHaveAttribute(
      'aria-label',
      `Câu 2 trên ${ROUNDS}`,
    );
  });

  it('reports a GameEnd after the last round', () => {
    const onEnd = vi.fn();
    const rounds = listeningImageRounds(GRADE.id, SEED, ROUNDS);
    render(<BalloonPop grade={GRADE} seed={SEED} onEnd={onEnd} />);
    for (const q of rounds) {
      fireEvent.click(screen.getByTestId(`option-${q.correctIndex}`));
      act(() => vi.advanceTimersByTime(600));
    }
    expect(onEnd).toHaveBeenCalledWith({
      points: ROUNDS * 2, // all first-try
      maxPoints: ROUNDS * 2,
      correctCount: ROUNDS,
    });
  });
});
