import { useEffect, useState } from 'react';
import { fetchMyClassName, joinClassByCode } from '../lib/classJoin';
import { CARD } from '../lib/ui/tokens';

/**
 * CR-47: lets a logged-in student join their teacher's class with a
 * 6-char code - the self-serve path that unblocks "parents buy via
 * class code" sales. Rendered on the grade picker so students with no
 * enrollment (the ones who need it) can reach it. Renders nothing for
 * guests; once enrolled it shows the class name instead of the input
 * (one class per student - switching is an admin action).
 * `onJoined` lets the parent refresh grade scopes right after a join.
 */
export default function JoinClassCard({ isGuest, onJoined }: { isGuest: boolean; onJoined?: () => void }) {
  const [myClass, setMyClass] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setMyClass(null);
    setLoaded(false);
    setMessage(null);
    if (isGuest) return;
    let cancelled = false;
    void fetchMyClassName().then((name) => {
      if (!cancelled) {
        setMyClass(name);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isGuest]);

  if (isGuest) return null;

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length < 4 || busy) return;
    setBusy(true);
    setMessage(null);
    const result = await joinClassByCode(trimmed);
    setBusy(false);
    if (result.ok) {
      setMyClass(result.className);
      setMessage(null);
      onJoined?.();
    } else {
      setMessage(result.message);
    }
  }

  return (
    <div data-testid="join-class-card" className={`mt-4 ${CARD}`}>
      <h2 className="font-display text-xl font-extrabold text-amber-300">🏫 Lớp của em</h2>
      {!loaded ? (
        <p className="mt-3 text-sm font-semibold text-slate-400">Đang tải...</p>
      ) : myClass ? (
        <p data-testid="join-class-current" className="mt-3 text-sm font-bold text-emerald-300">
          Em đang học trong lớp: <span className="text-white">{myClass}</span>
        </p>
      ) : (
        <form onSubmit={submit} className="mt-3">
          <p className="text-sm font-semibold text-slate-300">
            Cô giáo cho em mã lớp chưa? Nhập vào đây để học chung với các bạn nhé!
          </p>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              data-testid="join-class-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[ILO01]|[^A-Z0-9]/g, ''))}
              maxLength={6}
              placeholder="VD: R8WHYF"
              className="w-32 rounded-xl border-2 border-slate-500/60 bg-[#0d1b26] px-3 py-2 text-center font-display text-lg font-extrabold uppercase tracking-[0.3em] text-white placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
            />
            <button
              type="submit"
              data-testid="join-class-submit"
              disabled={busy || code.trim().length < 4}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-sky-500 active:scale-95 disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {busy ? 'Đang vào...' : 'Vào lớp'}
            </button>
          </div>
          {message && (
            <p data-testid="join-class-error" className="mt-2 text-sm font-semibold text-rose-300">
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
