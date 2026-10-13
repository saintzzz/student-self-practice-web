import { parkOwnerBlob } from './lib/engagement/store';
import { getSession, onAuthChange } from './lib/auth/practiceAuth';
export function App() {
  async function init() {
    const session = await getSession();
    if (!session) setAuthMode('login');
  }
  // r17 good: a bound identity that changes under us reloads cleanly.
  void onAuthChange((session) => {
    if (session) reloadPage();
  });
  function handleGuest(): void {
    parkOwnerBlob();
    setAuthMode('guest');
  }
}
