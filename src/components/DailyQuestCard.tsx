import { useEffect, useState } from 'react';
import {
  claimDailyBonus,
  getDailyQuests,
  getState,
  DAILY_QUEST_BONUS,
  type DailyQuestId,
} from '../lib/engagement/store';
import { CARD } from '../lib/ui/tokens';

const QUEST_META: Record<DailyQuestId, { icon: string; label: string }> = {
  drill: { icon: '✏️', label: 'Hoàn thành 1 lượt Luyện đề' },
  correct: { icon: '🎯', label: 'Trả lời đúng 10 câu' },
  big: { icon: '🏆', label: 'Hoàn thành 1 lượt Thi thử hoặc Luyện tập' },
};

/**
 * CR-27: daily quest card on the grade home screen - the retention hook.
 * Three quests per day, resets at local midnight, +3 stars when all done.
 */
export default function DailyQuestCard() {
  const [snapshot, setSnapshot] = useState(() => getDailyQuests());
  const streak = getState().streak.count;

  // Refresh when the local date rolls over while the page stays open -
  // yesterday's progress/claimed state must not linger overnight.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSnapshot((current) => {
        const next = getDailyQuests();
        return next.dateISO === current.dateISO ? current : next;
      });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  function claim(): void {
    claimDailyBonus();
    // Always refresh - a denied claim (e.g. stale button past midnight)
    // still needs the card to re-render the current-day state.
    setSnapshot(getDailyQuests());
  }

  return (
    <div data-testid="daily-quest-card" className={`mt-4 ${CARD} text-left`}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-extrabold text-amber-300">📋 Nhiệm vụ ngày</h2>
        {streak > 0 && (
          <span data-testid="quest-streak" className="rounded-full bg-orange-500/20 px-3 py-1 text-sm font-extrabold text-orange-300 ring-1 ring-orange-400/40">
            🔥 {streak} ngày liên tiếp
          </span>
        )}
      </div>
      <ul className="mt-3 space-y-2">
        {snapshot.quests.map((quest) => {
          const meta = QUEST_META[quest.id];
          const pct = Math.round((quest.progress / quest.target) * 100);
          return (
            <li
              key={quest.id}
              data-testid={`quest-${quest.id}`}
              className="rounded-2xl bg-[#16232e] p-3 ring-1 ring-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold ${quest.done ? 'text-emerald-300' : 'text-white'}`}>
                    {meta.label}
                  </p>
                  {quest.target > 1 && !quest.done && (
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all motion-reduce:transition-none"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
                {quest.done ? (
                  <span className="text-xl" aria-label="done">✅</span>
                ) : (
                  <span className="text-sm font-extrabold text-slate-400">
                    {quest.progress}/{quest.target}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {snapshot.allDone && !snapshot.bonusClaimed && (
        <button
          type="button"
          data-testid="claim-daily-bonus"
          onClick={claim}
          className="mt-3 w-full rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-3 font-display text-lg font-extrabold text-amber-950 shadow-[inset_0_-3px_0_rgba(0,0,0,0.15)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
        >
          🎁 Nhận thưởng +{DAILY_QUEST_BONUS} sao
        </button>
      )}
      {snapshot.bonusClaimed && (
        <p data-testid="quest-all-done" className="mt-3 text-center text-sm font-bold text-emerald-300">
          ✨ Hoàn thành nhiệm vụ ngày! Hẹn bạn ngày mai nhé.
        </p>
      )}
    </div>
  );
}
