import { useEffect, useState } from 'react';
import { fetchLeaderboard, type LeaderboardEntry } from '../lib/leaderboard';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { CARD } from '../lib/ui/tokens';

interface LeaderboardCardProps {
  gradeId: string;
  /** Guest -> lock prompt instead of any data. */
  isGuest: boolean;
  onLogin?: () => void;
}

const MEDAL = ['🥇', '🥈', '🥉'];

/**
 * CR-30: weekly leaderboard card on the grade home screen. Aggregate
 * standings only (name + weekly totals) - the rpc never exposes other
 * students' history.
 */
export default function LeaderboardCard({ gradeId, isGuest, onLogin }: LeaderboardCardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (isGuest || !configured) return;
    let cancelled = false;
    void fetchLeaderboard(gradeId).then((rows) => {
      if (!cancelled) {
        setEntries(rows ?? []);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [gradeId, isGuest, configured]);

  return (
    <div data-testid="leaderboard-card" className={`mt-4 ${CARD} text-left`}>
      <h2 className="font-display text-xl font-extrabold text-amber-300">🏆 Bảng xếp hạng tuần</h2>
      {isGuest ? (
        <div className="mt-3 text-center">
          <p className="text-sm font-semibold text-slate-300">
            Đăng nhập để thi đua xếp hạng với các bạn cùng lớp nhé!
          </p>
          {onLogin && (
            <button
              type="button"
              data-testid="leaderboard-login"
              onClick={onLogin}
              className="mt-3 rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-sky-500 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              Đăng nhập
            </button>
          )}
        </div>
      ) : !loaded ? (
        <p className="mt-3 text-sm font-semibold text-slate-400">Đang tải bảng xếp hạng...</p>
      ) : entries!.length === 0 ? (
        <p data-testid="leaderboard-empty" className="mt-3 text-sm font-semibold text-slate-300">
          Chưa có ai lên bảng tuần này - bé hãy là người đầu tiên!
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {entries!.map((entry) => (
            <li
              key={`${entry.rank}-${entry.display_name}`}
              data-testid={`leaderboard-row-${entry.rank}`}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                entry.is_me
                  ? 'bg-amber-400/20 ring-2 ring-amber-400/60'
                  : 'bg-[#16232e] ring-1 ring-white/10'
              }`}
            >
              <span className="w-8 shrink-0 text-center font-display text-lg font-extrabold text-white">
                {MEDAL[entry.rank - 1] ?? `${entry.rank}`}
              </span>
              <span className={`min-w-0 flex-1 truncate text-sm font-bold ${entry.is_me ? 'text-amber-200' : 'text-white'}`}>
                {entry.display_name}
                {entry.is_me && ' (mình)'}
              </span>
              <span className="shrink-0 text-sm font-extrabold text-amber-300">
                {entry.weekly_points} điểm
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
