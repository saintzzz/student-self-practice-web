/** r17 cross-tab-stale-session: one seam between "identity changed
 *  underneath us" and the browser reload that resets every bound
 *  module (engagement owner, activity owner, cached account state).
 *  Indirect so tests can mock the reload without touching jsdom's
 *  non-navigable Location. */
export function reloadPage(): void {
  window.location.reload();
}

/** CR-104 (r103): content-load failures recover via reload, but a chunk
 *  that stays broken (deploy mismatch, corrupted cache) must not spin a
 *  reload loop forever - bound the auto-reload per scope per tab; the
 *  caller keeps control when it returns false (e.g. surface an error). */
export function reloadPageOnce(scope: string, maxAttempts = 2): boolean {
  const key = `reloadOnce:${scope}`;
  let n = 0;
  try {
    n = Number(sessionStorage.getItem(key) ?? '0');
  } catch {
    /* sessionStorage unavailable - treat as first attempt */
  }
  if (n >= maxAttempts) return false;
  try {
    sessionStorage.setItem(key, String(n + 1));
  } catch {
    /* best-effort stamp */
  }
  reloadPage();
  return true;
}
