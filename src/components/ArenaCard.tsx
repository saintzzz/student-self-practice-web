import { useEffect, useState } from 'react';
import { arenaOpen, arenaRecent, type ArenaOpenChallenge, type ArenaRecentRow } from '../lib/arena';
import { CARD } from '../lib/ui/tokens';

/** CR-34: Đấu trường card on the grade home screen.
 *  Logged-in students see open challenges (same grade) + their recent
 *  duels. Guests still get "Đấu với máy" - the whole card works offline. */
export default function ArenaCard({
  gradeId,
  isGuest,
  onCreate,
  onAccept,
  onBot,
  onLogin,
}: {
  gradeId: string;
  isGuest: boolean;
  onCreate: () => void;
  onAccept: (challenge: ArenaOpenChallenge) => void;
  onBot: () => void;
  onLogin?: () => void;
}) {
  const [open, setOpen] = useState<ArenaOpenChallenge[] | null>(null);
  const [recent, setRecent] = useState<ArenaRecentRow[] | null>(null);

  useEffect(() => {
    if (isGuest) return;
    let cancelled = false;
    void (async () => {
      const [o, r] = await Promise.all([arenaOpen(gradeId), arenaRecent(gradeId)]);
      if (cancelled) return;
      setOpen(o);
      setRecent(r);
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeId, isGuest]);

  return (
    <div className={`mt-4 ${CARD}`} data-testid="arena-card">
      <h2 className="text-center font-display text-xl font-extrabold text-amber-300">⚔️ Đấu trường Arena</h2>
      <p className="mt-1 text-center text-sm font-semibold text-slate-300">
        10 câu cùng một đề - ai nhiều điểm hơn thắng, hòa thì ai nhanh hơn thắng.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          data-testid="arena-create"
          onClick={isGuest ? onBot : onCreate}
          className="flex-1 rounded-xl bg-rose-600 px-4 py-3 font-extrabold text-white transition hover:bg-rose-500 active:scale-95"
        >
          {isGuest ? '⚔️ Đấu với máy' : '⚔️ Tạo thử thách'}
        </button>
        {isGuest && onLogin && (
          <button
            type="button"
            onClick={onLogin}
            className="flex-1 rounded-xl bg-sky-600 px-4 py-3 font-extrabold text-white transition hover:bg-sky-500"
          >
            Đăng nhập để đấu với bạn thật
          </button>
        )}
      </div>

      {!isGuest && open !== null && (
        <div className="mt-4">
          <div className="text-sm font-extrabold text-slate-300">Thử thách đang mở</div>
          {open.length === 0 ? (
            <p className="mt-2 text-sm font-semibold text-slate-400">
              Chưa có thử thách nào - hãy là người đầu tiên tạo nhé!
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {open.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-[#16232e] px-3 py-2 ring-1 ring-white/10"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-white">{c.creator_name}</div>
                    <div className="text-xs font-bold text-slate-400">
                      {c.creator_score} điểm - {Math.floor(c.creator_time_ms / 60000)}:
                      {String(Math.floor(c.creator_time_ms / 1000) % 60).padStart(2, '0')}
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid={`arena-accept-${c.id}`}
                    onClick={() => onAccept(c)}
                    className="shrink-0 rounded-lg bg-amber-400 px-3 py-2 text-sm font-extrabold text-amber-950 transition hover:bg-amber-300 active:scale-95"
                  >
                    Nhận kèo
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!isGuest && recent !== null && recent.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-extrabold text-slate-300">Trận gần đây của bạn</div>
          <ul className="mt-2 space-y-2">
            {recent.map((m) => {
              const opp = m.i_created ? m.opponent_name : m.creator_name;
              const mine = m.i_created ? m.creator_score : m.opponent_score;
              const theirs = m.i_created ? m.opponent_score : m.creator_score;
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-xl bg-[#16232e] px-3 py-2 text-sm font-bold ring-1 ring-white/10"
                >
                  <span className="text-slate-300">vs {opp ?? '?'}</span>
                  <span className={m.is_draw ? 'text-sky-300' : m.i_won ? 'text-emerald-300' : 'text-rose-300'}>
                    {m.is_draw ? '🤝' : m.i_won ? '🏆' : '😢'} {mine} - {theirs}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
