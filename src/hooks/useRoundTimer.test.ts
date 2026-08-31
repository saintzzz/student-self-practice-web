import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUND_DURATION_SECONDS, useRoundTimer } from './useRoundTimer';

describe('useRoundTimer (plan.md v7 "Round Timer", AC27-AC29)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at 5:00 (300 seconds)', () => {
    const { result } = renderHook(() => useRoundTimer('round-1', true, vi.fn()));

    expect(result.current.secondsRemaining).toBe(ROUND_DURATION_SECONDS);
  });

  it('ticks down by 1 every second while active', () => {
    const { result } = renderHook(() => useRoundTimer('round-1', true, vi.fn()));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.secondsRemaining).toBe(ROUND_DURATION_SECONDS - 1);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.secondsRemaining).toBe(ROUND_DURATION_SECONDS - 5);
  });

  it('does not tick while isActive is false', () => {
    const { result } = renderHook(() => useRoundTimer('round-1', false, vi.fn()));

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current.secondsRemaining).toBe(ROUND_DURATION_SECONDS);
  });

  it('calls onExpire exactly once when the countdown reaches 0 (AC28)', () => {
    const onExpire = vi.fn();
    renderHook(() => useRoundTimer('round-1', true, onExpire));

    act(() => {
      vi.advanceTimersByTime(ROUND_DURATION_SECONDS * 1000 - 1000);
    });
    expect(onExpire).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('never decrements below 0', () => {
    const { result } = renderHook(() => useRoundTimer('round-1', true, vi.fn()));

    act(() => {
      vi.advanceTimersByTime((ROUND_DURATION_SECONDS + 30) * 1000);
    });

    expect(result.current.secondsRemaining).toBe(0);
  });

  it('resets to a fresh 5:00 when roundKey changes (new Round, AC29)', () => {
    const { result, rerender } = renderHook(
      ({ roundKey }: { roundKey: string }) => useRoundTimer(roundKey, true, vi.fn()),
      { initialProps: { roundKey: 'batch-a:0' } },
    );

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.secondsRemaining).toBe(ROUND_DURATION_SECONDS - 60);

    rerender({ roundKey: 'batch-a:1' });

    expect(result.current.secondsRemaining).toBe(ROUND_DURATION_SECONDS);
  });

  it('resets to a fresh 5:00 for Round 1 of a brand-new Batch (different seed, same round index)', () => {
    const { result, rerender } = renderHook(
      ({ roundKey }: { roundKey: string }) => useRoundTimer(roundKey, true, vi.fn()),
      { initialProps: { roundKey: 'batch-a:0' } },
    );

    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(result.current.secondsRemaining).toBe(ROUND_DURATION_SECONDS - 120);

    rerender({ roundKey: 'batch-b:0' });

    expect(result.current.secondsRemaining).toBe(ROUND_DURATION_SECONDS);
  });

  it('stops ticking and never fires onExpire once isActive becomes false (Round ended before timeout)', () => {
    const onExpire = vi.fn();
    const { rerender } = renderHook(
      ({ isActive }: { isActive: boolean }) => useRoundTimer('round-1', isActive, onExpire),
      { initialProps: { isActive: true } },
    );

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    rerender({ isActive: false });

    act(() => {
      vi.advanceTimersByTime(ROUND_DURATION_SECONDS * 1000);
    });

    expect(onExpire).not.toHaveBeenCalled();
  });

  it('clears its interval on unmount (no leaked timer, no post-unmount onExpire)', () => {
    const onExpire = vi.fn();
    const { unmount } = renderHook(() => useRoundTimer('round-1', true, onExpire));

    unmount();

    act(() => {
      vi.advanceTimersByTime(ROUND_DURATION_SECONDS * 1000);
    });

    expect(onExpire).not.toHaveBeenCalled();
  });

  describe('dev-only E2E fast-forward hook', () => {
    afterEach(() => {
      delete window.__setRoundTimerRemainingSecondsForTesting;
    });

    it('registers window.__setRoundTimerRemainingSecondsForTesting in dev builds', () => {
      renderHook(() => useRoundTimer('round-1', true, vi.fn()));

      expect(typeof window.__setRoundTimerRemainingSecondsForTesting).toBe('function');
    });

    it('fast-forwarding to 0 fires onExpire, matching a real countdown reaching 0:00 (AC28)', () => {
      const onExpire = vi.fn();
      const { result } = renderHook(() => useRoundTimer('round-1', true, onExpire));

      act(() => {
        window.__setRoundTimerRemainingSecondsForTesting?.(0);
      });

      expect(result.current.secondsRemaining).toBe(0);
      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('unregisters the hook on unmount', () => {
      const { unmount } = renderHook(() => useRoundTimer('round-1', true, vi.fn()));

      unmount();

      expect(window.__setRoundTimerRemainingSecondsForTesting).toBeUndefined();
    });
  });
});
