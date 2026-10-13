import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { GatedLink } from './GatedLink';
import { clearParentVerification } from './ParentGate';

/**
 * kids-UX step 5 (design-kids-ux s3.0, ADR KUX-3): external links on kid
 * surfaces always pass through ParentGate and open in a new tab.
 */
const WORD_TO_DIGIT: Record<string, number> = {
  hai: 2,
  ba: 3,
  'bốn': 4,
  'năm': 5,
  'sáu': 6,
  'bảy': 7,
  'tám': 8,
  'chín': 9,
};

function passGate(): void {
  const q = screen.getByTestId('parent-gate-question').textContent ?? '';
  const m = q.match(/(\p{L}+) nhân (\p{L}+) bằng bao nhiêu\?/u);
  if (!m) throw new Error(`unparseable question: ${q}`);
  const answer = WORD_TO_DIGIT[m[1]!.toLowerCase()]! * WORD_TO_DIGIT[m[2]!.toLowerCase()]!;
  for (const ch of String(answer)) {
    fireEvent.click(screen.getByTestId(`parent-gate-key-${ch}`));
  }
  fireEvent.click(screen.getByTestId('parent-gate-ok'));
  act(() => {
    vi.advanceTimersByTime(300); // pass beat
  });
}

let openSpy: MockInstance<typeof window.open>;

beforeEach(() => {
  vi.useFakeTimers();
  clearParentVerification();
  openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
});

afterEach(() => {
  openSpy.mockRestore();
  vi.useRealTimers();
});

describe('GatedLink', () => {
  it('gates the first tap, then opens the link in a new tab after passing', () => {
    render(<GatedLink href="https://vieschool.com">Trang chủ</GatedLink>);

    fireEvent.click(screen.getByRole('button', { name: 'Trang chủ' }));
    expect(openSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('parent-gate')).toBeInTheDocument();

    passGate();
    expect(screen.queryByTestId('parent-gate')).not.toBeInTheDocument();
    expect(openSpy).toHaveBeenCalledWith('https://vieschool.com', '_blank', 'noopener,noreferrer');
  });

  it('opens immediately while the 5-minute pass is still valid', () => {
    render(<GatedLink href="https://zalo.me/oa">Zalo</GatedLink>);

    fireEvent.click(screen.getByRole('button', { name: 'Zalo' }));
    passGate();
    expect(openSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Zalo' }));
    expect(screen.queryByTestId('parent-gate')).not.toBeInTheDocument();
    expect(openSpy).toHaveBeenCalledTimes(2);
  });

  it('cancelling the gate never opens the link', () => {
    render(<GatedLink href="https://vieschool.com">Trang chủ</GatedLink>);

    fireEvent.click(screen.getByRole('button', { name: 'Trang chủ' }));
    fireEvent.click(screen.getByTestId('parent-gate-cancel'));

    expect(screen.queryByTestId('parent-gate')).not.toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('dev-review #14: non-allowlisted origins render nothing - no click path exists', () => {
    const { container } = render(<GatedLink href="https://example.com/page">Đi</GatedLink>);
    expect(container.innerHTML).toBe('');
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByTestId('parent-gate')).toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('dev-review #14: javascript: and http: hrefs are rejected too', () => {
    for (const href of ['javascript:alert(1)', 'http://vieschool.com', 'notaurl']) {
      const { container } = render(<GatedLink href={href}>x</GatedLink>);
      expect(container.innerHTML).toBe('');
    }
    expect(openSpy).not.toHaveBeenCalled();
  });
});
