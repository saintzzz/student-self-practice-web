import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    /**
     * Dev-only test hook so E2E can deterministically exercise AC28 (Round
     * ends at 0:00) without waiting out a real 5:00 countdown. Only
     * registered when `import.meta.env.DEV` is true - absent from
     * production builds (`vite build`).
     */
    __setRoundTimerRemainingSecondsForTesting?: (seconds: number) => void;
  }
}

/** 5 minutes per Round (plan.md v7 "Round Timer" - a deliberate default, not a specific IOE citation). */
export const ROUND_DURATION_SECONDS = 300;

export interface UseRoundTimerResult {
  secondsRemaining: number;
}

/**
 * Drives a single Round's countdown (plan.md v7 "Round Timer", AC27-AC29).
 *
 * - `roundKey` must change whenever a new Round starts (including Round 1 of
 *   a brand-new Batch) so the countdown resets to a fresh 5:00 (AC29).
 * - `isActive` gates the tick to only run while the Round's question loop is
 *   on screen (`phase === 'active'`) - paused/irrelevant during
 *   round-summary, stub, and batch-summary phases.
 * - `onExpire` fires exactly once per Round the instant the countdown
 *   reaches 0 (AC28); the caller is responsible for ending the Round.
 *
 * Ticks via a plain 1-second `setInterval` counter (never `Date.now()`
 * wall-clock diffing) so `vi.useFakeTimers()` + `vi.advanceTimersByTime()`
 * drive it deterministically in tests.
 */
export function useRoundTimer(roundKey: string, isActive: boolean, onExpire: () => void): UseRoundTimerResult {
  const [secondsRemaining, setSecondsRemaining] = useState(ROUND_DURATION_SECONDS);
  const onExpireRef = useRef(onExpire);
  const expiredRef = useRef(false);

  onExpireRef.current = onExpire;

  // Fresh 5:00 every time a new Round starts (AC29).
  useEffect(() => {
    setSecondsRemaining(ROUND_DURATION_SECONDS);
    expiredRef.current = false;
  }, [roundKey]);

  // Tick once per second only while this Round's question loop is active.
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setSecondsRemaining((previous) => (previous <= 1 ? 0 : previous - 1));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [roundKey, isActive]);

  // Fire onExpire exactly once when the countdown reaches 0 (AC28).
  useEffect(() => {
    if (secondsRemaining === 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpireRef.current();
    }
  }, [secondsRemaining]);

  // Dev-only E2E fast-forward hook (see the `Window` declaration above) - lets
  // Playwright drive AC28 to 0:00 deterministically instead of waiting out a
  // real 5:00 countdown. Never registered in production builds.
  useEffect(() => {
    if (!import.meta.env.DEV) {
      return undefined;
    }

    window.__setRoundTimerRemainingSecondsForTesting = (seconds: number) => {
      setSecondsRemaining(Math.max(0, Math.floor(seconds)));
    };

    return () => {
      delete window.__setRoundTimerRemainingSecondsForTesting;
    };
  }, []);

  return { secondsRemaining };
}
