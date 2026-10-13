import { confirmParentEmail } from './lib/parentContact';
import { getSession } from './lib/auth/practiceAuth';
export function App() {
  async function init() {
    // r17 bad: auth loads once - no session-change subscription, so a
    // second tab's sign-out or switch leaves stale account state live.
    const session = await getSession();
    if (!session) setAuthMode('login');
  }
  function handleGuest(): void {
    setAuthMode('guest');
  }
  const token = new URLSearchParams(window.location.search).get('verify_email');
  if (token) void confirmParentEmail(token);
}
