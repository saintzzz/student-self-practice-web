import { useEffect, useState } from 'react';
import { arenaOpen, arenaRecent, type ArenaOpenChallenge, type ArenaRecentRow } from '../lib/arena';
import { CARD, BTN_SECONDARY_NAVY } from '../lib/ui/tokens';
import { useViewer } from '../lib/viewer/ViewerContext';
import { IconClock, IconHandshake, IconSwords, IconTrophy, IconX } from './icons';

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
  /* CR-73: the accept list caps at 2 visible challenges + an inline
     "Xem thêm" expansion - keeps hub expansions inside the ≤4-new-controls
     rule on the G1-2 path. */
  const [showAllAccepts, setShowAllAccepts] = useState(false);
  const { density } = useViewer();

  // CR-56: my own open challenges wait for an accepter - they are not
  // accept-able and must not hide behind the "nothing here" empty state.
  const mine = open?.filter((c) => c.i_created) ?? [];
  const theirs = open?.filter((c) => !c.i_created) ?? [];

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
      <h2 className="flex items-center justify-center gap-2 text-center font-display text-xl font-extrabold text-amber-300"><IconSwords size={20} /> Arena</h2>
      <p className="mt-1 text-center text-sm font-semibold text-slate-300">
        10 câu cùng một đề - ai nhiều điểm hơn thắng, hòa thì ai nhanh hơn thắng.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          data-testid="arena-create"
          onClick={isGuest ? onBot : onCreate}
          className={`flex-1 ${BTN_SECONDARY_NAVY}`}
          style={{ minHeight: density.primaryMinH }}
        >
          <span className="inline-flex items-center gap-2"><IconSwords size={18} /> {isGuest ? "Đấu với máy" : "Tạo thử thách"}</span>
        </button>
        {isGuest && onLogin && (
          <button
            type="button"
            onClick={onLogin}
            className={`flex-1 ${BTN_SECONDARY_NAVY}`}
            style={{ minHeight: density.primaryMinH }}
          >
            Đăng nhập để đấu với bạn thật
          </button>
        )}
      </div>

      {!isGuest && open !== null && (
        <div className="mt-4">
          {mine.length > 0 && (
            <>
              <div className="text-sm font-extrabold text-slate-300">
                Thử thách của em - đang chờ bạn nhận
              </div>
              <ul className="mt-2 space-y-2">
                {mine.map((c) => (
                  <li
                    key={c.id}
                    data-testid="arena-own-challenge"
                    className="flex items-center justify-between gap-2 rounded-xl bg-[#16232e] px-3 py-2 ring-1 ring-sky-400/30"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-white">{c.creator_name}</div>
                      <div className="text-xs font-bold text-slate-400">
                        {c.creator_score} điểm - {Math.floor(c.creator_time_ms / 60000)}:
                        {String(Math.floor(c.creator_time_ms / 1000) % 60).padStart(2, '0')}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-sky-500/20 px-3 py-2 text-sm font-extrabold text-sky-300">
                      <span className="inline-flex items-center gap-1"><IconClock size={14} /> Đang chờ</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className={`${mine.length > 0 ? 'mt-4 ' : ''}text-sm font-extrabold text-slate-300`}>
            Thử thách đang mở
          </div>
          {theirs.length === 0 ? (
            <p className="mt-2 text-sm font-semibold text-slate-400">
              Chưa có thử thách nào của bạn bè - em có thể tạo thử thách mới nhé!
            </p>
          ) : (
            <>
              <ul className="mt-2 space-y-2">
                {(showAllAccepts ? theirs : theirs.slice(0, 2)).map((c) => (
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
                      className={`shrink-0 ${BTN_SECONDARY_NAVY} px-3 py-2 text-sm`}
                    >
                      Nhận kèo
                    </button>
                  </li>
                ))}
              </ul>
              {theirs.length > 2 && !showAllAccepts && (
                <button
                  type="button"
                  data-testid="arena-accept-more"
                  onClick={() => setShowAllAccepts(true)}
                  className={`mt-2 w-full ${BTN_SECONDARY_NAVY}`}
                  style={{ minHeight: density.primaryMinH }}
                >
                  Xem thêm {theirs.length - 2} thử thách
                </button>
              )}
            </>
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
                    <span className="inline-flex items-center gap-1.5">{m.is_draw ? <IconHandshake size={16} /> : m.i_won ? <IconTrophy size={16} /> : <IconX size={16} />} {mine} - {theirs}</span>
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
