import { useEffect, useRef, useState } from 'react';

/* CR-148 (P2-6): "Gio nghi" screen-time nudge - a soft banner after
 * REST_MINUTES of continuous play, per the Game PO pacing spec
 * (GAMEFI-DESIGN-po.md: session pacing). Parents can switch it off in
 * the report corner; kids cannot - the flag lives outside the gated
 * parent surface but is only honored, never set, by the banner itself.
 */

const KEY = 'ea-rest-reminder';
/** Minutes of continuous active play before the nudge fires. */
export const REST_MINUTES = 30;
/** A break longer than this resets the stretch - the kid really rested. */
export const BREAK_RESET_MINUTES = 5;
const TICK_MS = 5_000;

export function restReminderEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setRestReminderEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* private-mode safari: the toggle just won't persist - honest no-op. */
  }
}

/** Pure stretch-timer step for tests: `active` accrues only while the
 *  tab is visible; a hidden span longer than the break window is a real
 *  rest and resets the stretch - including on the return tick, when a
 *  suspended interval may have skipped the hidden ticks entirely
 *  (r243). Returns the new active-stretch ms. */
export function tickStretch(activeMs: number, tickMs: number, visible: boolean, hiddenForMs: number): number {
  const rested = hiddenForMs >= BREAK_RESET_MINUTES * 60_000;
  if (visible) return (rested ? 0 : activeMs) + tickMs;
  return rested ? 0 : activeMs;
}

/** React hook: true while the banner should show. `dismiss` ends the
 *  stretch so the next nudge lands after another full REST_MINUTES. */
export function useRestReminder(): { show: boolean; dismiss: () => void } {
  const [show, setShow] = useState(false);
  const activeMs = useRef(0);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt.current = Date.now();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const timer = setInterval(() => {
      if (!restReminderEnabled()) {
        activeMs.current = 0;
        /* r243: a toggle-off also retracts an already-visible banner. */
        setShow(false);
        return;
      }
      const visible = document.visibilityState !== 'hidden';
      const hiddenFor = hiddenAt.current == null ? 0 : Date.now() - hiddenAt.current;
      activeMs.current = tickStretch(activeMs.current, TICK_MS, visible, hiddenFor);
      if (visible) hiddenAt.current = null;
      if (activeMs.current >= REST_MINUTES * 60_000) setShow(true);
    }, TICK_MS);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return {
    show,
    dismiss: () => {
      activeMs.current = 0;
      setShow(false);
    },
  };
}
