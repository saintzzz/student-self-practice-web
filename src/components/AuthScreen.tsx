import { useState } from 'react';
import Mascot from './Mascot';
import { CARD_DARK, NAV_PILL_DARK, SCREEN_ENTER } from '../lib/ui/tokens';
import { login, USERNAME_RE } from '../lib/auth/practiceAuth';

/** CR-14: dark navy + gold (VieSchool landing palette) on the auth surface. */
const INPUT_DARK =
  'w-full rounded-2xl border-2 border-[#2a3a5e] bg-[#0b1224]/60 px-5 py-4 text-lg font-bold text-slate-100 shadow-inner transition placeholder:font-normal placeholder:text-slate-500 focus:border-amber-300 focus:outline-none focus:ring-4 focus:ring-amber-300/30 focus:shadow-[0_8px_20px_-8px_rgba(242,201,87,0.35)]';

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
      <div className={CARD_DARK}>
        <div className="mb-4 flex justify-center">
          <Mascot mood="greeting" />
        </div>
        <p className="mb-1 text-center font-display text-sm font-extrabold uppercase tracking-[0.2em] text-amber-300">
          English Arena
        </p>
        <h1 className="mb-2 text-center font-display text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
          Chào bé!
        </h1>
        <p className="mb-6 text-center text-xl text-slate-300">Đăng nhập để vào lớp của mình</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-lg text-slate-300">
            <span className="font-bold text-slate-200">Tên đăng nhập</span>
            <input
              data-testid="login-username"
              className={INPUT_DARK}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>
          <label className="flex flex-col gap-1 text-lg text-slate-300">
            <span className="font-bold text-slate-200">Mã PIN</span>
            <input
              data-testid="login-pin"
              className={INPUT_DARK}
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && (
            <div
              data-testid="login-error"
              className="rounded-3xl bg-rose-400/15 py-3 text-center font-bold text-rose-200 ring-1 ring-rose-400/40"
            >
              {error}
            </div>
          )}
          <button
            data-testid="login-submit"
            type="submit"
            disabled={busy}
            className="min-h-[76px] rounded-3xl bg-gradient-to-b from-amber-300 to-amber-500 px-8 font-display text-2xl font-extrabold text-[#0b1224] shadow-[inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-4px_0_rgba(0,0,0,0.18),0_6px_16px_-4px_rgba(242,201,87,0.5)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-4px_0_rgba(0,0,0,0.18),0_10px_22px_-6px_rgba(242,201,87,0.6)] active:translate-y-0 active:scale-95 active:shadow-[inset_0_2px_0_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.18)] disabled:translate-y-0 disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-amber-300/60"
          >
            {busy ? 'Đang vào...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
      <button
        data-testid="guest-button"
        type="button"
        onClick={onGuest}
        className={`mt-6 self-center ${NAV_PILL_DARK}`}
      >
        Chơi không cần tài khoản
      </button>
      <p className="mt-4 text-center text-xs font-semibold text-slate-400">
        English Arena - sản phẩm của VieSchool
      </p>
    </div>
  );
}
