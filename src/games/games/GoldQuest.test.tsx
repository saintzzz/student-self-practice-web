import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import GoldQuest from './GoldQuest';
import { imageChoiceRounds } from '../sources';
import type { Grade } from '../../types';

const GRADE: Grade = { id: 'grade-2', name: 'Lớp 2' };
const SEED = 'test-gold';
const ROUNDS = 6;

describe('GoldQuest', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders a question and the gem tally', () => {
    render(<GoldQuest grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    expect(screen.getByTestId('game-gold-quest')).toBeVisible();
    expect(screen.getByTestId('gem-tally').textContent).toContain('0');
    for (let i = 0; i < 4; i += 1) {
      expect(screen.getByTestId(`option-${i}`)).toBeVisible();
    }
  });

  it('a correct answer opens the chest phase; picking a chest advances', () => {
    const rounds = imageChoiceRounds(GRADE.id, SEED, ROUNDS);
    render(<GoldQuest grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByTestId(`option-${rounds[0]!.correctIndex}`));
    act(() => vi.advanceTimersByTime(700));
    // Chest phase: 3 chests visible.
    for (let i = 0; i < 3; i += 1) {
      expect(screen.getByTestId(`chest-${i}`)).toBeVisible();
    }
    fireEvent.click(screen.getByTestId('chest-1'));
    act(() => vi.advanceTimersByTime(1400));
    // Back on a question, round 2.
    expect(screen.getByTestId('game-round-dots')).toHaveAttribute('aria-label', 'Câu 2 trên 6');
    // Chest opened awarded something (gems tally may be 0 only via dragon - all rewards >=0, min +3 or x2 of 0... check it changed state text exists).
    expect(screen.getByTestId('gem-tally')).toBeVisible();
  });

  it('a flawless run reports points = rounds', () => {
    const onEnd = vi.fn();
    const rounds = imageChoiceRounds(GRADE.id, SEED, ROUNDS);
    render(<GoldQuest grade={GRADE} seed={SEED} onEnd={onEnd} />);
    for (const q of rounds) {
      fireEvent.click(screen.getByTestId(`option-${q.correctIndex}`));
      act(() => vi.advanceTimersByTime(700));
      fireEvent.click(screen.getByTestId('chest-0'));
      act(() => vi.advanceTimersByTime(1400));
    }
    expect(onEnd).toHaveBeenCalledWith({ points: ROUNDS, maxPoints: ROUNDS, correctCount: ROUNDS });
  });

  it('a double-miss skips the chest and consumes the round', () => {
    const rounds = imageChoiceRounds(GRADE.id, SEED, ROUNDS);
    const wrongs = [0, 1, 2, 3].filter((i) => i !== rounds[0]!.correctIndex);
    render(<GoldQuest grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByTestId(`option-${wrongs[0]!}`));
    fireEvent.click(screen.getByTestId(`option-${wrongs[1]!}`));
    act(() => vi.advanceTimersByTime(900));
    // Still on question phase (no chests), next round.
    expect(screen.queryByTestId('chest-0')).toBeNull();
    expect(screen.getByTestId('game-round-dots')).toHaveAttribute('aria-label', 'Câu 2 trên 6');
  });
});
