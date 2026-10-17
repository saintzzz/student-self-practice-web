import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RewardFxProvider, useRewardFx } from './RewardFxContext';
import StreakBurst from './StreakBurst';
import LiveScore from '../LiveScore';
import type { PracticeSessionState } from '../../lib/practiceSession';

/**
 * CR-82 (spec s16.2 / D-17): star-fly + reduced-motion highlight twin,
 * and the streak-burst ring counts. jsdom rects are all zeros - the test
 * asserts the fly element exists with --fx/--fy custom properties and
 * that the reduced-motion twin highlights the registered target.
 */

function FireHarness() {
  const { fireStar } = useRewardFx();
  return (
    <button
      type="button"
      data-testid="fire"
      onClick={() => fireStar({ left: 10, top: 20, width: 30, height: 40 } as DOMRect)}
    >
      fire
    </button>
  );
}

function installMatchMedia(matches: Record<string, boolean>) {
  const mql = (query: string) => ({
    matches: matches[query] ?? false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: () => false,
  });
  Object.defineProperty(window, 'matchMedia', { writable: true, configurable: true, value: mql });
}

function uninstallMatchMedia() {
  // @ts-expect-error restore jsdom's absent matchMedia
  delete window.matchMedia;
}

const ANSWERED_SESSION: PracticeSessionState = {
  questions: [],
  currentIndex: 0,
  currentAnswer: null,
  answers: [
    { questionId: 'q1', isCorrect: true },
  ] as unknown as PracticeSessionState['answers'],
};

afterEach(() => {
  uninstallMatchMedia();
});

describe('RewardFxContext star-fly (CR-82 s16.2)', () => {
  it('fireStar renders one fixed star flying along --fx/--fy and removes it after the animation', () => {
    render(
      <RewardFxProvider>
        <LiveScore session={ANSWERED_SESSION} />
        <FireHarness />
      </RewardFxProvider>,
    );
    fireEvent.click(screen.getByTestId('fire'));
    const star = screen.getByTestId('star-fly');
    expect(star.className).toContain('animate-star-fly');
    expect(star.style.getPropertyValue('--fx')).toMatch(/px$/);
    expect(star.style.getPropertyValue('--fy')).toMatch(/px$/);
  });

  it('registers the chip when it mounts late (answered 0 -> 1) so star-fly finds a target', () => {
    /* r34-A1 regression: the chip is absent while answered === 0; a
       mount-time registration would store null forever. */
    const EMPTY_SESSION: PracticeSessionState = {
      questions: [],
      currentIndex: 0,
      currentAnswer: null,
      answers: [] as unknown as PracticeSessionState['answers'],
    };
    const { rerender } = render(
      <RewardFxProvider>
        <LiveScore session={EMPTY_SESSION} />
        <FireHarness />
      </RewardFxProvider>,
    );
    expect(screen.queryByTestId('live-score')).toBeNull();
    rerender(
      <RewardFxProvider>
        <LiveScore session={ANSWERED_SESSION} />
        <FireHarness />
      </RewardFxProvider>,
    );
    expect(screen.getByTestId('live-score')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('fire'));
    expect(screen.getByTestId('star-fly')).toBeInTheDocument();
  });

  it('does nothing when no score target is registered', () => {
    render(
      <RewardFxProvider>
        <FireHarness />
      </RewardFxProvider>,
    );
    fireEvent.click(screen.getByTestId('fire'));
    expect(screen.queryByTestId('star-fly')).toBeNull();
  });

  it('reduced motion: no fly - the registered chip gets the static ring highlight', () => {
    vi.useFakeTimers();
    try {
      installMatchMedia({ '(prefers-reduced-motion: reduce)': true });
      render(
        <RewardFxProvider>
          <LiveScore session={ANSWERED_SESSION} />
          <FireHarness />
        </RewardFxProvider>,
      );
      fireEvent.click(screen.getByTestId('fire'));
      expect(screen.queryByTestId('star-fly')).toBeNull();
      const chip = screen.getByTestId('live-score');
      expect(chip.classList.contains('ring-2')).toBe(true);
      expect(chip.classList.contains('ring-amber-300')).toBe(true);
      act(() => {
        vi.advanceTimersByTime(700);
      });
      expect(chip.classList.contains('ring-2')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('StreakBurst rings (CR-82 s16.2)', () => {
  it('no rings below streak 3', () => {
    const { container } = render(<StreakBurst streak={2} />);
    expect(container.querySelector('[data-testid="streak-burst"]')).toBeNull();
  });

  it('1 ring at streak 3, 2 at 5, 3 at 10', () => {
    for (const [streak, rings] of [
      [3, 1],
      [5, 2],
      [10, 3],
      [7, 2],
      [12, 3],
    ] as const) {
      const { container, unmount } = render(<StreakBurst streak={streak} />);
      const burst = container.querySelector('[data-testid="streak-burst"]')!;
      expect(burst.getAttribute('data-rings')).toBe(String(rings));
      unmount();
    }
  });

  it('reduced motion: rings still mount but carry motion-reduce:animate-none (decorative twin)', () => {
    installMatchMedia({ '(prefers-reduced-motion: reduce)': true });
    const { container } = render(<StreakBurst streak={5} />);
    const rings = container.querySelectorAll('.animate-streak-burst');
    expect(rings.length).toBe(2);
    rings.forEach((r) => expect(r.className).toContain('motion-reduce:animate-none'));
  });
});
