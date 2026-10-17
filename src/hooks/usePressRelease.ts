import { useCallback, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * CR-82 (spec s16.1/s5.4, ARCHITECTURE-v5 s3.9): the toy press-release
 * micro-interaction for `material.tile*` / `CTA_GOLD_XL` /
 * `BTN_REWARD_EARNED` surfaces.
 *
 * Returned props spread onto exactly ONE element (lists give each tile
 * its own hook via a child component):
 *
 *  - Pointer: `pointerup` after a `pointerdown` on the same element adds
 *    `animate-press-release` (the 240ms ease-toy spring); `pointercancel`
 *    adds nothing.
 *  - Keyboard: Enter/Space `keydown` (non-repeat) sets `data-pressed`,
 *    which mirrors the `:active` sink through the token's
 *    `data-[pressed]:` variants (`:active` is unreliable for Enter across
 *    engines). Space `keyup` clears it and releases; Enter uses a 100ms
 *    timer because its click fires on keydown.
 *  - Disabled elements: no-op.
 *  - Reduced motion: the release class is never added - the
 *    `data-pressed` shadow/base swap still signals the press.
 *  - `animationend` on a press-release animation removes the class so a
 *    re-press can replay it.
 */

export const PRESS_RELEASE_CLASS = 'animate-press-release';

export interface PressReleaseHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
  onKeyUp: (e: React.KeyboardEvent<HTMLElement>) => void;
  onAnimationEnd: (e: React.AnimationEvent<HTMLElement>) => void;
  'data-pressed'?: '' | undefined;
}

export function usePressRelease(opts?: { disabled?: boolean }): PressReleaseHandlers {
  const disabled = opts?.disabled ?? false;
  const reducedMotion = usePrefersReducedMotion();
  const [pressed, setPressed] = useState(false);
  const pointerDownRef = useRef(false);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addRelease = useCallback(
    (el: HTMLElement) => {
      if (!reducedMotion) el.classList.add(PRESS_RELEASE_CLASS);
    },
    [reducedMotion],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (disabled || e.button !== 0) return;
      pointerDownRef.current = true;
    },
    [disabled],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!pointerDownRef.current) return;
      pointerDownRef.current = false;
      addRelease(e.currentTarget);
    },
    [addRelease],
  );

  const onPointerCancel = useCallback(() => {
    pointerDownRef.current = false;
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (disabled || e.repeat) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      setPressed(true);
      if (e.key === 'Enter') {
        /* Enter activates on keydown - the release follows on a 100ms
           timer since no keyup semantic exists for the activation. */
        const el = e.currentTarget;
        if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
        enterTimerRef.current = setTimeout(() => {
          enterTimerRef.current = null;
          setPressed(false);
          addRelease(el);
        }, 100);
      }
    },
    [disabled, addRelease],
  );

  const onKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key !== ' ') return;
      setPressed(false);
      addRelease(e.currentTarget);
    },
    [addRelease],
  );

  const onAnimationEnd = useCallback((e: React.AnimationEvent<HTMLElement>) => {
    if ((e.animationName ?? '').includes('press-release')) {
      e.currentTarget.classList.remove(PRESS_RELEASE_CLASS);
    }
  }, []);

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onKeyDown,
    onKeyUp,
    onAnimationEnd,
    'data-pressed': pressed ? '' : undefined,
  };
}
