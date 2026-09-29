/**
 * Session-level Lottie circuit breaker (DS-9, confirmed in ADR-6). The
 * breaker trips when the player path is structurally broken - lazy chunk
 * import failure, a player runtime error after valid JSON, or a ready
 * timeout on a session that has never rendered a single frame. A timeout
 * AFTER at least one successful frame, or a single JSON data failure, only
 * falls back that one mount and never trips the breaker.
 *
 * Module-scope state = page lifetime; no persistence, no React dependency.
 */

let lottieDisabledForSession = false;
let lottieEverReady = false;

export const LOTTIE_READY_TIMEOUT_MS = 2500;

export function isLottieDisabledForSession(): boolean {
  return lottieDisabledForSession;
}

export function disableLottieForSession(): void {
  lottieDisabledForSession = true;
}

export function markLottieReady(): void {
  lottieEverReady = true;
}

export function hasLottieEverRendered(): boolean {
  return lottieEverReady;
}

/** Test-only escape hatch (T-4): module state must reset between specs. */
export function resetLottieSessionForTests(): void {
  lottieDisabledForSession = false;
  lottieEverReady = false;
}
