import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import LetterCatch from './LetterCatch';
import { spellableWords } from '../sources';
import type { Grade } from '../../types';

const GRADE: Grade = { id: 'grade-2', name: 'Lớp 2' };
const SEED = 'test-letters';
const WORDS_PER_RUN = 4; // mirrors the component constant

let wordIdx = 0;
function currentWord(): string {
  return spellableWords(GRADE.id, SEED, WORDS_PER_RUN)[wordIdx]!.word.toLowerCase();
}

/** Tap the i-th target tile `letter-{char}-{i}` for each position. */
function spellCurrentWord() {
  const word = currentWord();
  for (let i = 0; i < word.length; i += 1) {
    fireEvent.click(screen.getByTestId(`letter-${word[i]}-${i}`));
    act(() => vi.advanceTimersByTime(60));
  }
}

describe('LetterCatch', () => {
  beforeEach(() => {
    wordIdx = 0;
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('renders blanks + letter bubbles for the first word', () => {
    render(<LetterCatch grade={GRADE} seed={SEED} onEnd={vi.fn()} />);
    expect(screen.getByTestId('game-letter-catch')).toBeVisible();
    expect(screen.getByTestId('letter-order-field')).toBeVisible();
    expect(screen.getByTestId('game-listen-button')).toBeVisible();
  });

  it('spelling all words cleanly reports full points', () => {
    const onEnd = vi.fn();
    render(<LetterCatch grade={GRADE} seed={SEED} onEnd={onEnd} />);
    for (wordIdx = 0; wordIdx < WORDS_PER_RUN; wordIdx += 1) {
      spellCurrentWord();
      act(() => vi.advanceTimersByTime(800));
    }
    expect(onEnd).toHaveBeenCalledWith({
      points: WORDS_PER_RUN * 2,
      maxPoints: WORDS_PER_RUN * 2,
      correctCount: WORDS_PER_RUN,
      attempted: WORDS_PER_RUN,
    });
  });

  it('a wrong bubble drops the word to 1 point - no inflated 3 stars', () => {
    const onEnd = vi.fn();
    render(<LetterCatch grade={GRADE} seed={SEED} onEnd={onEnd} />);
    const word = currentWord();
    // Tap a distractor tile (`*-xK` id) before spelling.
    const allIds = Array.from(
      screen.getByTestId('letter-order-field').querySelectorAll('[data-testid^="letter-"]'),
    ).map((el) => el.getAttribute('data-testid')!);
    const wrong = allIds.find((id) => /-x\d+$/.test(id));
    expect(wrong, 'a distractor tile').toBeTruthy();
    fireEvent.click(screen.getByTestId(wrong!));
    act(() => vi.advanceTimersByTime(600));
    expect(word.length).toBeGreaterThanOrEqual(3);
    spellCurrentWord();
    act(() => vi.advanceTimersByTime(800));
    // Finish the rest cleanly; word 0 earned 1 not 2.
    for (wordIdx = 1; wordIdx < WORDS_PER_RUN; wordIdx += 1) {
      spellCurrentWord();
      act(() => vi.advanceTimersByTime(800));
    }
    expect(onEnd).toHaveBeenCalledWith({
      points: WORDS_PER_RUN * 2 - 1,
      maxPoints: WORDS_PER_RUN * 2,
      correctCount: WORDS_PER_RUN,
      attempted: WORDS_PER_RUN,
    });
  });
});
