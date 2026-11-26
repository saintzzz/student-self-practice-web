import { useSyncExternalStore } from 'react';

/* CR-150 (r255): ambient video motion switch - the accessible stop
 * mechanism WCAG 2.2.2 asks for on decorative auto-playing surfaces
 * that cannot host their own pause control (aria-hidden layers).
 * Parents toggle it in Goc ba me next to the rest-reminder flag and
 * kids get the ungated MotionToggle chip on screens with ambient
 * video; both write the same flag. Same contract as restReminder.ts -
 * the flag is only honored, never set, by the video surfaces
 * themselves. */

const KEY = 'ea-ambient-motion';
const EVENT = 'ea-ambient-motion-changed';

/** Session-truth override: when persistence is unavailable (private
 *  mode, quota, throwing storage stub) the toggle must still WORK -
 *  the checkbox reflects this value, not a silently-failed write
 *  (r256). Persisted value wins on a fresh load once storage works. */
let memoryOverride: boolean | null = null;

export function ambientMotionEnabled(): boolean {
  if (memoryOverride !== null) return memoryOverride;
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setAmbientMotionEnabled(on: boolean): void {
  memoryOverride = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* storage unavailable - the override above still applies live. */
  }
  window.dispatchEvent(new Event(EVENT));
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
