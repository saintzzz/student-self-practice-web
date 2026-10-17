import { useEffect, useRef, useState } from 'react';

/**
 * CR-82 (ARCHITECTURE D-15, spec s9.2): the G1-2 `thinking` pose clock.
 * Returns true when Bé Heo should swap `idle` -> `thinking`:
 *   - 12 s without a `pointerdown`/`keydown` inside `question-card`,
 *     counted from `idleStartAt` (set by InstructionSpeaker.onSettled); or
 *   - while `audioLoading` has been true for more than 400 ms (so a fast
 *     cache hit never flickers the pose).
 * G3-5 and answered/drawing boards never enable it (spec: "G3-5 never
 * gets thinking - no nagging older kids").
 */

export const THINKING_IDLE_MS = 12_000;
export const THINKING_AUDIO_DEBOUNCE_MS = 400;

export interface UseThinkingPoseArgs {
  /** `band === 'G12' && !hasAnswered && !isDrawing`. */
  enabled: boolean;
  /** `question.id` - a new question resets every timer and the pose. */
  resetKey: string;
  /**
   * Epoch ms when the instruction settled (`InstructionSpeaker.onSettled`)
   * - the idle clock's epoch. `null` while instruction speech is still
   *   `playing` keeps the clock stopped.
   */
  idleStartAt: number | null;
  /** Latest `onAudioLoadingChange` value from the question body. */
  audioLoading: boolean;
  /** Fires once each time the pose switches on (instruction replay +
      demo-hint re-arm live in the caller). */
  onThinking?: () => void;
}

export function useThinkingPose({
  enabled,
  resetKey,
  idleStartAt,
  audioLoading,
  onThinking,
}: UseThinkingPoseArgs): boolean {
  const [thinking, setThinking] = useState(false);
  const onThinkingRef = useRef(onThinking);
  onThinkingRef.current = onThinking;
  /* Last in-card activity timestamp - an input event restarts the clock. */
  const lastActivityRef = useRef<number>(0);

  const setThinkingOnce = (value: boolean) => {
    setThinking((prev) => {
      if (value && !prev) onThinkingRef.current?.();
      return value;
    });
  };

  /* Reset on question change. */
  useEffect(() => {
    setThinking(false);
    lastActivityRef.current = 0;
  }, [resetKey]);

  /* Input inside question-card clears the pose and restarts the clock. */
  useEffect(() => {
    if (!enabled) return;
    const onInput = (event: Event) => {
      const target = event.target as Element | null;
      if (!target?.closest?.('[data-testid="question-card"]')) return;
      lastActivityRef.current = Date.now();
      setThinking(false);
    };
    document.addEventListener('pointerdown', onInput, true);
    document.addEventListener('keydown', onInput, true);
    return () => {
      document.removeEventListener('pointerdown', onInput, true);
      document.removeEventListener('keydown', onInput, true);
    };
  }, [enabled, resetKey]);

  /* 12 s idle clock - armed when the instruction settles, re-armed after
     each in-card input. Poll-based so an input that lands mid-window only
     needs to bump `lastActivityRef`. */
  useEffect(() => {
    if (!enabled || idleStartAt === null) return;
    const epoch = () => Math.max(idleStartAt, lastActivityRef.current);
    const check = () => {
      if (Date.now() - epoch() >= THINKING_IDLE_MS) setThinkingOnce(true);
    };
    const timer = window.setInterval(check, 500);
    check();
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, idleStartAt, resetKey]);

  /* Audio loading >400ms -> thinking (debounced); clearing the load drops
     the pose unless the idle timer also fired (checked on next poll). */
  useEffect(() => {
    if (!enabled || !audioLoading) return;
    const timer = window.setTimeout(() => setThinkingOnce(true), THINKING_AUDIO_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, audioLoading]);

  /* Audio-load pose drops when loading ends if the idle clock hasn't
     fired - re-evaluate cheaply on the transition. */
  useEffect(() => {
    if (!enabled || audioLoading || !thinking) return;
    if (idleStartAt === null || Date.now() - Math.max(idleStartAt, lastActivityRef.current) < THINKING_IDLE_MS) {
      setThinking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, audioLoading]);

  return enabled && thinking;
}
