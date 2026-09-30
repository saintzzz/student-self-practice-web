import { useEffect, useRef, useState } from 'react';
import type { RoundOutcome } from '../lib/batch/batchSession';
import { getScoreStatus } from '../lib/batch/scoreStatus';
import { CONTINUE_BUTTON_CLASSNAME } from './actionButtonStyle';
import { CARD, SCORE_PILL, SCREEN_ENTER } from '../lib/ui/tokens';
import Mascot from './Mascot';
import StarRain from './celebrations/StarRain';
import { EmojiVisual } from './EmojiVisual';
import {
  checkStreakStickers,
  recordRoundResult,
  touchStreak,
  type RoundAwardResult,
} from '../lib/engagement/store';

interface RoundSummaryProps {
  outcome: RoundOutcome;
  /** CR-10: grade the batch belongs to - stars bank into that land. */
  gradeId: string;
  onNextRound: () => void;
  /** CR-13: guest trial - after the free round, lock the rest behind login. */
  locked?: boolean;
  onRequestLogin?: () => void;
  onExit?: () => void;
}

/**
 * Shown right after a Round's last question is answered (plan.md v5 -
 * "After each Round: a round score"; plan.md v10 - points headline + 75%
 * completion badge + celebrating mascot). No own mx-auto/max-w/px-4 (plan.md
 * v9 fix) - always nested inside BatchScreen's wrapper, which already
 * provides that padding; re-applying it here doubled the horizontal
 * padding on narrow phones.
 *
 * CR-10 DS-R3: awards 0-3 stars to the grade's land once per mount
 * (ref guard survives StrictMode's effect double-invoke) and rains
 * them over the points chip.
 *
 * CR-11 DS-P1: single vertical rhythm (mt-3 lines, mt-6 before CTA) -
 * the centered inline-flex CTA finally honors text-center after the
 * Chromium flex-button quirk fix in actionButtonStyle.
 */
export default function RoundSummary({
  outcome,
  gradeId,
  onNextRound,
  locked = false,
  onRequestLogin,
  onExit,
}: RoundSummaryProps) {
  const status = getScoreStatus(outcome.points, outcome.maxPoints);
  const awarded = useRef<RoundAwardResult | null>(null);
  const [award, setAward] = useState<RoundAwardResult | null>(null);

  useEffect(() => {
    if (!awarded.current) {
      const r = recordRoundResult(gradeId, outcome.roundNumber, outcome.points, outcome.maxPoints);
      // A finished round is real practice - it counts toward the day streak.
      touchStreak();
      const streakStickers = checkStreakStickers();
      awarded.current = { ...r, newStickers: [...r.newStickers, ...streakStickers] };
      setAward(awarded.current);
    }
  }, [gradeId, outcome.roundNumber, outcome.points, outcome.maxPoints]);

  return (
    <div className={`${CARD} ${SCREEN_ENTER} py-6 text-center [@media(max-height:420px)]:py-3`}>
      <Mascot mood="celebrating" />
      <StarRain stars={award?.stars ?? 0} />
      <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-sky-900">{outcome.titleVi}</h2>
      <p data-testid="round-score-summary" className="mt-3 text-2xl font-semibold text-sky-700">
        Em trả lời đúng {outcome.correctCount}/{outcome.totalCount} câu ở vòng này.
      </p>
      <p className="mt-3 flex justify-center">
        <span data-testid="round-points-summary" className={SCORE_PILL}>
          {outcome.points}/{outcome.maxPoints} điểm
        </span>
      </p>
      {award && award.newStickers.length > 0 && (
        <p data-testid="round-new-stickers" className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {award.newStickers.map((s) => (
            <span
              key={s.id}
              className="sticker-chip inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900 ring-2 ring-amber-300"
            >
              <EmojiVisual emoji={s.emoji} /> Huy hiệu mới: {s.nameVi}
            </span>
          ))}
        </p>
      )}
      <p
        data-testid="round-completion-badge"
        className={`mt-3 text-lg font-semibold ${status.isComplete ? 'text-emerald-700' : 'text-sky-700'}`}
      >
        {status.label}
      </p>
      {locked ? (
        <div
          data-testid="guest-lock-panel"
          className="mt-6 rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-amber-50 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_28px_-12px_rgba(79,70,229,0.35)]"
        >
          <p className="font-display text-xl font-extrabold tracking-tight text-indigo-900">
            Hết vòng chơi thử miễn phí
          </p>
          <p className="mt-2 text-base font-semibold text-indigo-800/80">
            Đăng nhập để mở đủ 4 vòng mỗi bài, lưu sao và huy hiệu vĩnh viễn.
          </p>
          <button
            type="button"
            data-testid="guest-lock-login"
            onClick={onRequestLogin}
            className={`mt-4 w-full sm:w-auto ${CONTINUE_BUTTON_CLASSNAME}`}
          >
            Đăng nhập để chơi tiếp →
          </button>
          {onExit && (
            <button
              type="button"
              data-testid="guest-lock-exit"
              onClick={onExit}
              className="mt-3 block w-full text-center text-sm font-bold text-indigo-600 underline-offset-2 hover:underline sm:inline sm:w-auto"
            >
              Chơi thử lớp khác
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          data-testid="next-round-button"
          onClick={onNextRound}
          className={`mt-6 w-full sm:w-auto ${CONTINUE_BUTTON_CLASSNAME}`}
        >
          Vòng tiếp theo →
        </button>
      )}
    </div>
  );
}
