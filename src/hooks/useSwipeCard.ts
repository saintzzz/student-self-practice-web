import { useCallback, useRef, useState } from 'react';

/**
 * CR-82 (spec s14.4): horizontal swipe gesture for the flashcard stack.
 *
 * - Direction lock: within the first LOCK_PX of movement, |dy| > |dx|
 *   releases the gesture to the page (vertical scroll; the card itself
 *   carries `touch-action: pan-y`).
 * - While locked horizontal the card follows `dx` (the caller renders
 *   translate/rotate + swipe-label opacity from it).
 * - Release commits when |dx| >= COMMIT_FRACTION x card width or
 *   |velocity| >= COMMIT_VELOCITY px/ms -> `onCommit('left' | 'right')`;
 *   otherwise `onCancel` (spring back).
 * - A committed or cancelled drag suppresses the gesture's trailing
 *   click so it never reaches `flashcard-flip`; taps (< threshold, no
 *   lock) stay native clicks, keyboard clicks (detail === 0) always pass.
 */

export const SWIPE_LOCK_PX = 10;
export const SWIPE_COMMIT_FRACTION = 0.3;
export const SWIPE_COMMIT_VELOCITY = 0.6;
export const SWIPE_FLIP_TAP_PX = 8;

export type SwipeDirection = 'left' | 'right';

interface SwipeSession {
  pointerId: number;
  startX: number;
  startY: number;
  /** 'pending' = inside the direction-lock window; 'x' = locked
   *  horizontal (following); 'y' = released to the page. */
  lock: 'pending' | 'x' | 'y';
  /** (t, x) history for velocity at release. */
  trail: { t: number; x: number }[];
}

export function useSwipeCard(opts: {
  enabled: boolean;
  onCommit: (dir: SwipeDirection) => void;
  onCancel?: () => void;
}) {
  const sessionRef = useRef<SwipeSession | null>(null);
  const suppressClickRef = useRef(false);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);

  const cleanup = useCallback(() => {
    sessionRef.current = null;
    setDx(0);
    setDragging(false);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      suppressClickRef.current = false;
      if (!opts.enabled || e.button !== 0) return;
      sessionRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lock: 'pending',
        trail: [{ t: e.timeStamp, x: e.clientX }],
      };
    },
    [opts.enabled],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const s = sessionRef.current;
      if (!s || s.pointerId !== e.pointerId || s.lock === 'y') return;
      const ddx = e.clientX - s.startX;
      const ddy = e.clientY - s.startY;
      if (s.lock === 'pending') {
        if (Math.hypot(ddx, ddy) <= SWIPE_LOCK_PX) return;
        if (Math.abs(ddy) > Math.abs(ddx)) {
          s.lock = 'y'; // vertical wins - hand the gesture back to the page
          sessionRef.current = null;
          return;
        }
        s.lock = 'x';
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
      s.trail.push({ t: e.timeStamp, x: e.clientX });
      if (s.trail.length > 12) s.trail.shift();
      setDx(ddx);
      setDragging(true);
    },
    [],
  );

  const velocityAtRelease = useCallback((s: SwipeSession, endX: number, endT: number): number => {
    /* px/ms over the trailing ~80ms window. */
    const windowStart = endT - 80;
    let first = s.trail[0] ?? { t: endT, x: endX };
    for (const point of s.trail) {
      if (point.t >= windowStart) {
        first = point;
        break;
      }
    }
    const dt = endT - first.t;
    if (dt <= 0) return 0;
    return (endX - first.x) / dt;
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const s = sessionRef.current;
      if (!s || s.pointerId !== e.pointerId) return;
      if (s.lock !== 'x') {
        sessionRef.current = null; // plain tap or vertical release - native click proceeds
        return;
      }
      suppressClickRef.current = true; // real drag - the trailing click must not flip
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      const width = e.currentTarget.getBoundingClientRect().width;
      const v = velocityAtRelease(s, e.clientX, e.timeStamp);
      const ddx = e.clientX - s.startX;
      const commit =
        Math.abs(ddx) >= width * SWIPE_COMMIT_FRACTION ||
        Math.abs(v) >= SWIPE_COMMIT_VELOCITY;
      const dir: SwipeDirection = (Math.abs(v) >= SWIPE_COMMIT_VELOCITY ? v : ddx) >= 0 ? 'right' : 'left';
      cleanup();
      if (commit) opts.onCommit(dir);
      else opts.onCancel?.();
    },
    [cleanup, velocityAtRelease, opts.onCommit, opts.onCancel],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const s = sessionRef.current;
      if (!s || s.pointerId !== e.pointerId) return;
      if (s.lock === 'x') suppressClickRef.current = true;
      cleanup();
      if (s.lock === 'x') opts.onCancel?.();
    },
    [cleanup, opts.onCancel],
  );

  const onLostPointerCapture = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const s = sessionRef.current;
      if (!s || s.pointerId !== e.pointerId) return;
      cleanup();
    },
    [cleanup],
  );

  /** Same contract as useDragTile: call inside onClick; true = this click
   *  is the synthetic trailing click of a swipe and must be ignored. */
  const shouldSuppressClick = useCallback((detail: number): boolean => {
    if (detail === 0) return false;
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    dx,
    dragging,
    shouldSuppressClick,
  };
}

export type SwipeHandlers = ReturnType<typeof useSwipeCard>;
