import { parkOwnerBlob } from './lib/engagement/store';
export function App() {
  function handleGuest(): void {
    parkOwnerBlob();
    setAuthMode('guest');
  }
}
