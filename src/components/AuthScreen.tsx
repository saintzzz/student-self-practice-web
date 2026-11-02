import { useState } from 'react';
import { MascotAvatar } from './mascot/MascotAvatar';
import { CARD_DAY, NAV_PILL_DAY, SCREEN_ENTER } from '../lib/ui/tokens';
import { login, USERNAME_RE } from '../lib/auth/practiceAuth';
import { IconEye, IconEyeOff } from './icons';

/** CR-116 rev3: day register - the kid login rides the same sunny
 *  world-map surface as the journey map (was CR-14 navy/gold). */
const INPUT_DAY =
  'w-full rounded-2xl border-2 border-sky-300 bg-white px-5 py-4 text-lg font-bold text-sky-950 shadow-inner transition placeholder:font-normal placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-300/40 focus:shadow-[0_8px_20px_-8px_rgba(242,201,87,0.35)]';

interface AuthScreenProps {
  onLoggedIn: () => void;
  onGuest: () => void;
}

export default function AuthScreen({ onLoggedIn, onGuest }: AuthScreenProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slowLogin, setSlowLogin] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!USERNAME_RE.test(username)) {
      setError('Tên đăng nhập gồm 3-20 ký tự a-z, 0-9, _ hoặc -.');
      return;
    }
    setBusy(true);
    setError(null);
    // CR-006 note: the Turnstile challenge can hold login ~30s on strict
    // networks - staged copy tells the user it is a security check, not a
    // hang.
    const slowTimer = setTimeout(() => setSlowLogin(true), 4000);
    let err: string | null = null;
    try {
      err = await login(username, pin);
    } finally {
      clearTimeout(slowTimer);
      setSlowLogin(false);
      setBusy(false);
    }
    if (err) {
      setError(err);
    } else {
      onLoggedIn();
    }
  }

  return (
    <div className={`mx-auto -mt-[22vh] flex min-h-[64vh] max-w-md flex-col px-4 pb-10 ${SCREEN_ENTER}`}>
      <div className={CARD_DAY}>
        <div className="mb-3 flex justify-center">
          {/* Same golden medallion idiom as the map header - the pig is
              the badge that greets you into the sunny world. */}
          <span className="rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 p-[5px] shadow-[0_0_24px_rgba(251,191,36,0.3),0_8px_18px_-8px_rgba(0,0,0,0.3)]">
            <span className="block rounded-full bg-gradient-to-b from-sky-600 to-sky-800 p-1.5 ring-1 ring-inset ring-white/25">
              <MascotAvatar sizePx={72} />
            </span>
          </span>
        </div>
        <p className="mb-1 text-center font-display text-sm font-extrabold uppercase tracking-[0.2em] text-amber-800">
          English Arena
        </p>
        <h1 className="mb-2 text-center font-display text-3xl font-extrabold tracking-tight text-sky-950 sm:text-4xl">
          Chào bé!
        </h1>
        <p className="mb-4 text-center text-xl text-sky-800">Đăng nhập để vào lớp của mình</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-lg text-sky-800">
            <span className="font-bold text-sky-900">Tên đăng nhập</span>
            <input
              data-testid="login-username"
              className={INPUT_DAY}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>
          <label className="flex flex-col gap-1 text-lg text-sky-800">
            <span className="font-bold text-sky-900">Mã PIN</span>
            <span className="relative block">
              <input
                data-testid="login-pin"
                className={`${INPUT_DAY} pr-16`}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="current-password"
              />
              {/* CR-69: young students cannot verify a masked PIN - the
                  eye toggle lets them check what they typed. */}
              <button
                type="button"
                data-testid="pin-visibility-toggle"
                aria-label={showPin ? 'Ẩn mã PIN' : 'Hiện mã PIN'}
                aria-pressed={showPin}
                onClick={() => setShowPin((v) => !v)}
                className="absolute right-2 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-xl text-xl text-sky-700 transition hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
              >
                {showPin ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </span>
          </label>
          {error && (
            <div
              data-testid="login-error"
              className="rounded-3xl bg-rose-50 py-3 text-center font-bold text-rose-700 ring-1 ring-rose-300"
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
            {busy ? (slowLogin ? 'Đang kiểm tra bảo mật...' : 'Đang vào...') : 'Đăng nhập'}
          </button>
        </form>
      </div>
      <button
        data-testid="guest-button"
        type="button"
        onClick={onGuest}
        className={`mt-6 self-center ${NAV_PILL_DAY}`}
      >
        Chơi không cần tài khoản
      </button>
      <p className="mt-4 self-center rounded-full bg-white/70 px-3 py-1 text-center text-xs font-semibold text-slate-600 ring-1 ring-sky-200/70">
        English Arena - sản phẩm của VieSchool
      </p>
      <p className="mt-2 text-center text-xs font-semibold">
        <a href="/guides" className="text-amber-800 underline-offset-2 transition hover:text-amber-700 hover:underline">
          Cẩm nang phụ huynh: luyện IOE, phonics, tiếng Anh SGK
        </a>
      </p>
    </div>
  );
}
