import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import QuizShow from './QuizShow';
import { imageChoiceRounds } from '../sources';
import type { Grade } from '../../types';

const GRADE: Grade = { id: 'grade-4', name: 'Lớp 4' };
const SEED = 'test-quiz';
const ROUNDS = 8;

describe('QuizShow', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders ladder, timer and a question', () => {
    render(<QuizShow grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    expect(screen.getByTestId('game-quiz-show')).toBeVisible();
    expect(screen.getByTestId('prize-ladder')).toBeVisible();
    expect(screen.getByTestId('quiz-timer').textContent).toBe('20');
  });

  it('the countdown ticks down', () => {
    render(<QuizShow grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByTestId('quiz-timer').textContent).toBe('17');
  });

  it('50:50 disables two wrong options exactly once', () => {
    const rounds = imageChoiceRounds(GRADE.id, SEED, ROUNDS);
    render(<QuizShow grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    fireEvent.click(screen.getByTestId('lifeline-5050'));
    const disabled = [0, 1, 2, 3].filter(
      (i) => (screen.getByTestId(`option-${i}`) as HTMLButtonElement).disabled,
    );
    expect(disabled.length).toBe(2);
    expect(disabled).not.toContain(rounds[0]!.correctIndex);
    expect((screen.getByTestId('lifeline-5050') as HTMLButtonElement).disabled).toBe(true);
  });

  it('a wrong answer ends the run immediately', () => {
    const onEnd = vi.fn();
    const rounds = imageChoiceRounds(GRADE.id, SEED, ROUNDS);
    const wrong = [0, 1, 2, 3].find((i) => i !== rounds[0]!.correctIndex)!;
    render(<QuizShow grade={GRADE} seed={SEED} onEnd={onEnd} />);
    fireEvent.click(screen.getByTestId(`option-${wrong}`));
    act(() => vi.advanceTimersByTime(1000));
    expect(onEnd).toHaveBeenCalledWith({ points: 0, maxPoints: ROUNDS, correctCount: 0 });
  });

  it('timing out ends the run', () => {
    const onEnd = vi.fn();
    render(<QuizShow grade={GRADE} seed={SEED} onEnd={onEnd} />);
    act(() => vi.advanceTimersByTime(21000));
    expect(onEnd).toHaveBeenCalledWith({ points: 0, maxPoints: ROUNDS, correctCount: 0 });
  });

  it('an accepted last-second answer does not race the timeout', () => {
    const onEnd = vi.fn();
    const rounds = imageChoiceRounds(GRADE.id, SEED, ROUNDS);
    render(<QuizShow grade={GRADE} seed={SEED} onEnd={onEnd} />);
    // 19 ticks -> 1 second left; the correct pick must stop the clock.
    act(() => vi.advanceTimersByTime(19000));
    fireEvent.click(screen.getByTestId(`option-${rounds[0]!.correctIndex}`));
    act(() => vi.advanceTimersByTime(3000));
    expect(onEnd).not.toHaveBeenCalled();
    // Round 2 runs with a fresh countdown.
    expect(Number(screen.getByTestId('quiz-timer').textContent)).toBeGreaterThan(0);
  });

  it('a flawless climb reports max points', () => {
    const onEnd = vi.fn();
    const rounds = imageChoiceRounds(GRADE.id, SEED, ROUNDS);
    render(<QuizShow grade={GRADE} seed={SEED} onEnd={onEnd} />);
    for (const q of rounds) {
      fireEvent.click(screen.getByTestId(`option-${q.correctIndex}`));
      act(() => vi.advanceTimersByTime(700));
    }
    expect(onEnd).toHaveBeenCalledWith({ points: ROUNDS, maxPoints: ROUNDS, correctCount: ROUNDS });
  });
});
