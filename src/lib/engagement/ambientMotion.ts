import { useSyncExternalStore } from 'react';

/* CR-150 (r255): ambient video motion switch - the accessible stop
 * mechanism WCAG 2.2.2 asks for on decorative auto-playing surfaces
 * that cannot host their own pause control (aria-hidden layers).
 * Parents toggle it in Goc ba me next to the rest-reminder flag; kids
 * get the OS-level prefers-reduced-motion gate plus this persisted one.
 * Same contract as restReminder.ts - the flag is only honored, never
 * set, by the video surfaces themselves. */

const KEY = 'ea-ambient-motion';
const EVENT = 'ea-ambient-motion-changed';

export function ambientMotionEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setAmbientMotionEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* private-mode safari: the toggle just won't persist - honest no-op. */
  }
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/** Live flag for components: flipping the toggle retracts motion on
 *  already-mounted surfaces, same-tab, no reload needed. */
export function useAmbientMotionEnabled(): boolean {
  return useSyncExternalStore(subscribe, ambientMotionEnabled, () => true);
}
