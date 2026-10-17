import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useThinkingPose,
  THINKING_IDLE_MS,
  THINKING_AUDIO_DEBOUNCE_MS,
} from './useThinkingPose';

/**
 * CR-82 (D-15): the G1-2 thinking pose fires 12s after the instruction
 * settles with no in-card input, or while content audio has been loading
 * >400ms. G3-5 / answered / drawing boards never enable it.
 */
function fireCardInput() {
  const card = document.createElement('div');
  card.setAttribute('data-testid', 'question-card');
  document.body.appendChild(card);
  card.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  card.remove();
}

describe('useThinkingPose (D-15)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const base = {
    enabled: true,
    resetKey: 'q1',
    idleStartAt: null as number | null,
    audioLoading: false,
  };

  it('stays idle while the instruction clock has not started', () => {
    const { result } = renderHook((props) => useThinkingPose(props), { initialProps: base });
    act(() => vi.advanceTimersByTime(THINKING_IDLE_MS + 5000));
    expect(result.current).toBe(false);
  });

  it('fires 12s after idleStartAt with no in-card input', () => {
    const { result } = renderHook((props) => useThinkingPose(props), {
      initialProps: { ...base, idleStartAt: Date.now() },
    });
    act(() => vi.advanceTimersByTime(THINKING_IDLE_MS + 100));
    expect(result.current).toBe(true);
  });

  it('an input inside question-card clears the pose and restarts the clock', () => {
    const { result } = renderHook((props) => useThinkingPose(props), {
      initialProps: { ...base, idleStartAt: Date.now() },
    });
    act(() => vi.advanceTimersByTime(THINKING_IDLE_MS + 100));
    expect(result.current).toBe(true);
    act(() => fireCardInput());
    expect(result.current).toBe(false);
    // The clock restarted at the input - not yet 12s.
    act(() => vi.advanceTimersByTime(THINKING_IDLE_MS - 2000));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(2500));
    expect(result.current).toBe(true);
  });

  it('an input OUTSIDE question-card does not reset the clock', () => {
    const { result } = renderHook((props) => useThinkingPose(props), {
      initialProps: { ...base, idleStartAt: Date.now() },
    });
    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      vi.advanceTimersByTime(THINKING_IDLE_MS + 100);
    });
    expect(result.current).toBe(true);
  });

  it('audio loading fires only after the 400ms debounce', () => {
    const { result, rerender } = renderHook((props) => useThinkingPose(props), {
      initialProps: { ...base, idleStartAt: Date.now() },
    });
    rerender({ ...base, idleStartAt: Date.now(), audioLoading: true });
    act(() => vi.advanceTimersByTime(THINKING_AUDIO_DEBOUNCE_MS - 50));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe(true);
  });

  it('a fast audio load (<400ms) never flicks the pose on', () => {
    const { result, rerender } = renderHook((props) => useThinkingPose(props), {
      initialProps: { ...base, idleStartAt: Date.now() },
    });
    rerender({ ...base, idleStartAt: Date.now(), audioLoading: true });
    act(() => vi.advanceTimersByTime(200));
    rerender({ ...base, idleStartAt: Date.now(), audioLoading: false });
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe(false);
  });

  it('drops the audio pose when loading ends (idle clock not yet fired)', () => {
    const start = Date.now();
    const { result, rerender } = renderHook((props) => useThinkingPose(props), {
      initialProps: { ...base, idleStartAt: start },
    });
    rerender({ ...base, idleStartAt: start, audioLoading: true });
    act(() => vi.advanceTimersByTime(THINKING_AUDIO_DEBOUNCE_MS + 100));
    expect(result.current).toBe(true);
    rerender({ ...base, idleStartAt: start, audioLoading: false });
    expect(result.current).toBe(false);
  });

  it('disabled boards (G3-5 / answered / drawing) never fire', () => {
    const { result } = renderHook((props) => useThinkingPose(props), {
      initialProps: { ...base, enabled: false, idleStartAt: Date.now(), audioLoading: true },
    });
    act(() => vi.advanceTimersByTime(THINKING_IDLE_MS + 5000));
    expect(result.current).toBe(false);
  });

  it('a question change (resetKey) clears the pose', () => {
    const { result, rerender } = renderHook((props) => useThinkingPose(props), {
      initialProps: { ...base, idleStartAt: Date.now() },
    });
    act(() => vi.advanceTimersByTime(THINKING_IDLE_MS + 100));
    expect(result.current).toBe(true);
    rerender({ ...base, resetKey: 'q2', idleStartAt: Date.now() });
    expect(result.current).toBe(false);
  });

  it('onThinking fires once per pose activation', () => {
    const onThinking = vi.fn();
    const { result } = renderHook((props) => useThinkingPose(props), {
      initialProps: { ...base, idleStartAt: Date.now(), onThinking },
    });
    act(() => vi.advanceTimersByTime(THINKING_IDLE_MS + 100));
    expect(result.current).toBe(true);
    expect(onThinking).toHaveBeenCalledTimes(1);
    // Stays fired - no repeat calls while the pose holds.
    act(() => vi.advanceTimersByTime(3000));
    expect(onThinking).toHaveBeenCalledTimes(1);
  });
});
