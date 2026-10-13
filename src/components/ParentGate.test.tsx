import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ParentGate, clearParentVerification, isParentVerified } from './ParentGate';

/**
 * kids-UX step 5 (design-kids-ux s3.6, ADR KUX-3): arithmetic parent
 * gate with Vietnamese number words + in-memory 5-minute pass token.
 */
const WORD_TO_DIGIT: Record<string, number> = {
  hai: 2,
  ba: 3,
  bốn: 4,
  'năm': 5,
  'sáu': 6,
  'bảy': 7,
  'tám': 8,
  'chín': 9,
};

function questionAnswer(): number {
  const q = screen.getByTestId('parent-gate-question').textContent ?? '';
  const m = q.match(/(\p{L}+) nhân (\p{L}+) bằng bao nhiêu\?/u);
  if (!m) throw new Error(`unparseable question: ${q}`);
  return WORD_TO_DIGIT[m[1]!.toLowerCase()]! * WORD_TO_DIGIT[m[2]!.toLowerCase()]!;
}

function typeDigits(n: number): void {
  for (const ch of String(n)) {
    fireEvent.click(screen.getByTestId(`parent-gate-key-${ch}`));
  }
}

function answerCorrectly(): void {
  typeDigits(questionAnswer());
  fireEvent.click(screen.getByTestId('parent-gate-ok'));
}

function answerWrongly(): void {
  const answer = questionAnswer();
  typeDigits(answer === 81 ? 80 : answer + 1);
  fireEvent.click(screen.getByTestId('parent-gate-ok'));
}

beforeEach(() => {
  clearParentVerification();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ParentGate - challenge render', () => {
  it('shows a word-form multiplication question and a full keypad', () => {
    render(<ParentGate onPass={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByTestId('parent-gate')).toHaveAttribute('role', 'dialog');
    expect(screen.getByTestId('parent-gate')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByTestId('parent-gate-question').textContent).toMatch(
      /^(Hai|Ba|Bốn|Năm|Sáu|Bảy|Tám|Chín) nhân (hai|ba|bốn|năm|sáu|bảy|tám|chín) bằng bao nhiêu\?$/,
    );
    for (let d = 0; d <= 9; d += 1) {
      expect(screen.getByTestId(`parent-gate-key-${d}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('parent-gate-back')).toBeInTheDocument();
    expect(screen.getByTestId('parent-gate-ok')).toBeDisabled(); // empty entry
    expect(screen.getByTestId('parent-gate-question')).toHaveFocus();
  });

  it('uses only plain hyphens in its copy (no em/en dashes)', () => {
    const { container } = render(<ParentGate onPass={vi.fn()} onCancel={vi.fn()} />);
    expect(container.textContent).not.toMatch(/[\u2013\u2014]/);
  });
});

describe('ParentGate - pass path', () => {
  it('correct answer verifies the parent and fires onPass after the beat', () => {
    vi.useFakeTimers();
    const onPass = vi.fn();
    render(<ParentGate onPass={onPass} onCancel={vi.fn()} />);

    answerCorrectly();

    expect(isParentVerified()).toBe(true);
    expect(screen.getByText('✓ Đã mở Góc ba mẹ')).toBeInTheDocument();
    expect(onPass).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onPass).toHaveBeenCalledTimes(1);
  });

  it('physical keyboard: digits, Backspace and Enter work like the keypad', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0); // always "Hai nhân hai" = 4
    const onPass = vi.fn();
    render(<ParentGate onPass={onPass} onCancel={vi.fn()} />);

    fireEvent.keyDown(document, { key: '5' });
    expect(screen.getByLabelText('Đáp án')).toHaveTextContent('5');
    fireEvent.keyDown(document, { key: 'Backspace' });
    expect(screen.getByLabelText('Đáp án')).not.toHaveTextContent('5');

    fireEvent.keyDown(document, { key: '4' });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(isParentVerified()).toBe(true);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onPass).toHaveBeenCalledTimes(1);
  });
});

describe('ParentGate - wrong answers', () => {
  it('wrong answer shakes the card, shows a non-shaming alert and regenerates', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    render(<ParentGate onPass={vi.fn()} onCancel={vi.fn()} />);
    const callsAtMount = randomSpy.mock.calls.length;

    answerWrongly();

    expect(screen.getByRole('alert')).toHaveTextContent('Chưa đúng - ba mẹ thử câu khác nhé.');
    expect(screen.getByLabelText('Đáp án').textContent?.trim()).toBe('');
    // The card carries the transform-only shake class + reduced-motion pair.
    const card = screen.getByTestId('parent-gate-question').closest('div[class*="tile-shake"]');
    expect(card).not.toBeNull();
    expect(card!.className).toContain('motion-reduce:animate-none');
    // A fresh question was drawn (two more Math.random calls).
    expect(randomSpy.mock.calls.length).toBe(callsAtMount + 2);
    expect(isParentVerified()).toBe(false);
  });

  it('three consecutive wrong answers start a 10 second cool-down', () => {
    vi.useFakeTimers();
    render(<ParentGate onPass={vi.fn()} onCancel={vi.fn()} />);

    answerWrongly();
    answerWrongly();
    answerWrongly();

    expect(screen.getByText('Thử lại sau 10 giây')).toBeInTheDocument();
    typeDigits(4);
    expect(screen.getByTestId('parent-gate-ok')).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.queryByText(/Thử lại sau/)).not.toBeInTheDocument();
    typeDigits(4);
    expect(screen.getByTestId('parent-gate-ok')).not.toBeDisabled();
  });
});

describe('ParentGate - cancel + focus contract', () => {
  it('Escape, backdrop tap and Hủy all cancel', () => {
    const onCancel = vi.fn();
    const view = render(<ParentGate onPass={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    view.unmount();

    const view2 = render(<ParentGate onPass={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('parent-gate')); // backdrop
    expect(onCancel).toHaveBeenCalledTimes(2);
    view2.unmount();

    render(<ParentGate onPass={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('parent-gate-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(3);
  });

  it('Tab stays trapped inside the dialog', () => {
    render(<ParentGate onPass={vi.fn()} onCancel={vi.fn()} />);
    const keys = screen.getAllByTestId(/parent-gate-(key|back|ok|cancel|new-question)/);
    const last = keys[keys.length - 1]!;
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(keys[0]);
  });

  it('dev-review #11: focus outside the tabbable list cannot escape the trap', () => {
    render(<ParentGate onPass={vi.fn()} onCancel={vi.fn()} />);
    // Initial focus lands on the question <p tabIndex={-1}> - NOT in the
    // tabbable list. Shift+Tab must route to the last focusable, not leave
    // the dialog.
    const question = screen.getByTestId('parent-gate-question');
    expect(document.activeElement).toBe(question);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    const keys = screen.getAllByTestId(/parent-gate-(key|back|ok|cancel|new-question)/);
    expect(document.activeElement).toBe(keys[keys.length - 1]);

    // And Tab from that same outside element lands on the first focusable.
    question.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(keys[0]);
  });
});

describe('ParentGate - pass token', () => {
  it('isParentVerified holds for 5 minutes then expires', () => {
    vi.useFakeTimers();
    render(<ParentGate onPass={vi.fn()} onCancel={vi.fn()} />);
    answerCorrectly();

    expect(isParentVerified()).toBe(true);
    expect(isParentVerified(Date.now() + 4 * 60 * 1000)).toBe(true);
    expect(isParentVerified(Date.now() + 6 * 60 * 1000)).toBe(false);
  });

  it('unmount after a pass keeps the token (5-minute share window)', () => {
    vi.useFakeTimers();
    const view = render(<ParentGate onPass={vi.fn()} onCancel={vi.fn()} />);
    answerCorrectly();
    view.unmount();
    expect(isParentVerified()).toBe(true);
  });

  it('leaving the gate without passing clears any token', () => {
    vi.useFakeTimers();
    const view = render(<ParentGate onPass={vi.fn()} onCancel={vi.fn()} />);
    answerCorrectly();
    view.unmount();
    expect(isParentVerified()).toBe(true);

    // A gate mounted while verified that is dismissed without passing
    // revokes the pass (no half-open state left behind).
    const second = render(<ParentGate onPass={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    second.unmount();
    expect(isParentVerified()).toBe(false);
  });

  it('clearParentVerification revokes the pass immediately', () => {
    vi.useFakeTimers();
    render(<ParentGate onPass={vi.fn()} onCancel={vi.fn()} />);
    answerCorrectly();
    clearParentVerification();
    expect(isParentVerified()).toBe(false);
  });
});
