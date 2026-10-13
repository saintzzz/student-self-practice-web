// r17 bad: the e2e flag is honored in production too - authMode 'off'
// bypasses the guest trial lock, so any visitor gets unlimited bundled
// practice.
export function isSupabaseConfigured() {
  if (localStorage.getItem('beheo-force-guest') === '1') return false;
  return true;
}
