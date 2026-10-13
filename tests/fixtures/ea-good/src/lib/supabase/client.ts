// r17 good: the e2e escape hatch only exists in dev builds.
export function isSupabaseConfigured() {
  if (import.meta.env.DEV && localStorage.getItem('beheo-force-guest') === '1') return false;
  return true;
}
