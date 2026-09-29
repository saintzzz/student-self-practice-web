import { useState } from 'react';
import Mascot from './Mascot';
import { BODY, CARD, CARD_TINT, H1, NAV_PILL, PROMPT, SCREEN_ENTER } from '../lib/ui/tokens';
import { login, USERNAME_RE } from '../lib/auth/practiceAuth';

const INPUT =
  'w-full rounded-2xl border-2 border-sky-200 bg-sky-50 px-5 py-4 text-lg font-bold text-sky-900 placeholder:font-normal placeholder:text-sky-400 focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-200';

interface AuthScreenProps {
  onLoggedIn: () => void;
  onGuest: () => void;
}

export default function AuthScreen({ onLoggedIn, onGuest }: AuthScreenProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!USERNAME_RE.test(username)) {
      setError('Tên đăng nhập gồm 3-20 ký tự a-z, 0-9, _ hoặc -.');
      return;
    }
    setBusy(true);
    setError(null);
    const err = await login(username, pin);
    setBusy(false);
    if (err) {
      setError(err);
    } else {
      onLoggedIn();
    }
  }

  return (
    <div className={`mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 ${SCREEN_ENTER}`}>
      <div className={CARD}>
        <div className="mb-4 flex justify-center">
          <Mascot mood="greeting" />
        </div>
        <h1 className={`mb-2 text-center ${H1}`}>Chào bé!</h1>
        <p className={`mb-6 text-center ${PROMPT}`}>Đăng nhập để vào lớp của mình</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className={`${BODY} flex flex-col gap-1`}>
            <span className="font-bold text-sky-800">Tên đăng nhập</span>
            <input
              data-testid="login-username"
              className={INPUT}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>
          <label className={`${BODY} flex flex-col gap-1`}>
            <span className="font-bold text-sky-800">Mã PIN</span>
            <input
              data-testid="login-pin"
              className={INPUT}
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && (
            <div data-testid="login-error" className={`${CARD_TINT.rose} py-3 text-center font-bold`}>
              {error}
            </div>
          )}
          <button
            data-testid="login-submit"
            type="submit"
            disabled={busy}
            className="min-h-[76px] rounded-3xl bg-emerald-500 px-8 text-2xl font-extrabold text-white shadow-md transition hover:bg-emerald-600 active:scale-95 disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-emerald-400"
          >
            {busy ? 'Đang vào...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
      <button
        data-testid="guest-button"
        type="button"
        onClick={onGuest}
        className={`mt-6 self-center ${NAV_PILL}`}
      >
        Chơi không cần tài khoản
      </button>
    </div>
  );
}
