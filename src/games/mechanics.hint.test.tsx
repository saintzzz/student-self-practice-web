import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { pickFiftyFifty } from './mechanics';
import BalloonPop from './games/BalloonPop';
import type { Grade } from '../types';

const GRADE: Grade = { id: 'grade-1', name: 'Lớp 1' };

describe('pickFiftyFifty (CR-101)', () => {
  it('returns 2 distinct indexes, never the correct one, deterministic per seed', () => {
    for (const seed of ['a', 'b', 'c:1']) {
      const a = pickFiftyFifty(1, 4, seed);
      const b = pickFiftyFifty(1, 4, seed);
      expect(a).toEqual(b);
      expect(a).toHaveLength(2);
      expect(new Set(a).size).toBe(2);
      expect(a).not.toContain(1);
      for (const i of a) expect(i).toBeGreaterThanOrEqual(0);
      for (const i of a) expect(i).toBeLessThan(4);
    }
  });
});

describe('HintButton adoption (CR-101)', () => {
  it('BalloonPop: hint dims 2 wrong options once per run and costs no heart', async () => {
    const onEnd = vi.fn();
    render(<BalloonPop grade={GRADE} seed="s1" level={1} onEnd={onEnd} />);
    const hint = screen.getByTestId('hint-5050');
    expect(screen.getByTestId('heart-meter').getAttribute('aria-label')).toContain('3/3');
    fireEvent.click(hint);
    // Two options got the wrong-pick styling (disabled) after the hint.
    const disabled = document.querySelectorAll('[data-testid^="option-"][disabled]');
    expect(disabled.length).toBe(2);
    // Hearts are untouched - a hint is a bail-out, not a miss.
    expect(screen.getByTestId('heart-meter').getAttribute('aria-label')).toContain('3/3');
    // Once per run: the button reports used.
    expect(screen.getByTestId('hint-5050')).toBeDisabled();
  });
});
