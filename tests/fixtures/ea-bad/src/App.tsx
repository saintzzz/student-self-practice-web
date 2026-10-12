import { confirmParentEmail } from './lib/parentContact';
export function App() {
  function handleGuest(): void {
    setAuthMode('guest');
  }
  const token = new URLSearchParams(window.location.search).get('verify_email');
  if (token) void confirmParentEmail(token);
}
