/** r17 cross-tab-stale-session: one seam between "identity changed
 *  underneath us" and the browser reload that resets every bound
 *  module (engagement owner, activity owner, cached account state).
 *  Indirect so tests can mock the reload without touching jsdom's
 *  non-navigable Location. */
export function reloadPage(): void {
  window.location.reload();
}
