/** CR-141: service-worker registration, explicit update flow and
 *  install-prompt capture. Production-only - a dev SW caches stale
 *  modules and makes local iteration look haunted.
 *
 *  Update contract: a new SW installs then waits; we never skipWaiting
 *  silently. `onwaiting` fires once so the UI can offer "Cập nhật";
 *  applyUpdate() messages it, controllerchange reloads. If the user
 *  never taps, the waiting SW still wins on the next cold load.
 */

import type { Screen } from '../App';

type WaitingListener = () => void;

let waitingWorker: ServiceWorker | null = null;
let waitingListener: WaitingListener | null = null;
let installEvent: Event | null = null;
let installListener: WaitingListener | null = null;
let registered = false;

function emitWaiting() {
  waitingListener?.();
}

export function onSwUpdate(cb: WaitingListener): () => void {
  waitingListener = cb;
  if (waitingWorker) cb();
  return () => {
    if (waitingListener === cb) waitingListener = null;
  };
}

export function onInstallPrompt(cb: WaitingListener): () => void {
  installListener = cb;
  if (installEvent) cb();
  return () => {
    if (installListener === cb) installListener = null;
  };
}

export function swUpdatePending(): boolean {
  return waitingWorker !== null;
}

export function installPromptPending(): boolean {
  return installEvent !== null;
}

let updateInitiated = false;

export function applyUpdate(): void {
  // Defense in depth: even if the toast somehow rendered during a flush
  // window, never initiate a reload while a submit is pending.
  if (!waitingWorker || isRoundInFlight()) return;
  updateInitiated = true;
  waitingWorker.postMessage('SKIP_WAITING');
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const ev = installEvent as (Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> }) | null;
  if (!ev?.prompt) return 'unavailable';
  await ev.prompt();
  const choice = await ev.userChoice;
  installEvent = null;
  return choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
}

export function initPwa(): void {
  if (registered || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  registered = true;
  if (!import.meta.env.PROD) return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Reload only for the user-tapped update path. A natural activation
    // mid-session (browser reclaims a waiting SW) must not yank an
    // in-flight kid round; the next cold load picks it up anyway.
    if (updateInitiated) window.location.reload();
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e;
    installListener?.();
  });

  window.addEventListener('appinstalled', () => {
    installEvent = null;
  });

  // updateViaCache 'none': sw.js importScripts('/sw-rules.js') - without
  // this the browser HTTP cache could mask a predicates-only deploy.
  void navigator.serviceWorker
    .register('/sw.js', { updateViaCache: 'none' })
    .then((reg) => {
      if (reg.waiting) {
        waitingWorker = reg.waiting;
        emitWaiting();
      }
      reg.addEventListener('updatefound', () => {
        const next = reg.installing;
        if (!next) return;
        next.addEventListener('statechange', () => {
          if (next.state === 'installed' && navigator.serviceWorker.controller) {
            waitingWorker = next;
            emitWaiting();
          }
        });
      });
    })
    // Registration failure (missing sw.js, blocked SW, failed
    // importScripts) must not surface as an unhandled rejection.
    .catch(() => {});
}

/** In-flight signal complementing the screen allowlist: the CR-98
 *  assignment submit flush stores its payload as `assign-submit:<id>`
 *  from finish until server ack. That window is exactly when the screen
 *  may already have navigated to a safe surface, so this covers the
 *  gap the allowlist cannot see. A failed submit leaves the key until
 *  re-entry flush, which suppresses the toast for the session -
 *  fail-safe direction, accepted. */
export function isRoundInFlight(): boolean {
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      if (sessionStorage.key(i)?.startsWith('assign-submit:')) return true;
    }
  } catch {
    /* storage access can throw in odd embeds - defer prompts then */
    return true;
  }
  return false;
}

/** Screens where an update toast / install chip may appear (spec R3/R4).
 *  Allowlist, not denylist: any screen added to the Screen union later
 *  defaults to deferred, so a future kid flow can never be interrupted
 *  by an affordance someone forgot to list. */
export const PROMPT_SAFE_SCREENS: Set<Screen> = new Set([
  'login',
  'grade-select',
  'credits',
  'report',
  'admin',
]);
/** Adult surfaces where the install chip is allowed to appear (R4). */
export const ADULT_SURFACES: Set<Screen> = new Set(['admin', 'report']);
