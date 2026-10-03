import { useEffect, useRef, useState } from 'react';
import type { BatchResult } from '../lib/batch/batchSession';
import { getScoreStatus } from '../lib/batch/scoreStatus';
import { CONTINUE_BUTTON_CLASSNAME } from './actionButtonStyle';
import { CARD, H1, H2, NAV_PILL, SCORE_PILL_LG, SCREEN_ENTER } from '../lib/ui/tokens';
import Mascot from './Mascot';
import ChestReveal from './celebrations/ChestReveal';
import {
  checkStreakStickers,
  getState,
  recordBatchResult,
  recordBigModeComplete,
  touchStreak,
  type BatchAwardResult,
  type Sticker,
} from '../lib/engagement/store';
import { savePracticeResult } from '../lib/practiceResults';

interface BatchSummaryProps {
  result: BatchResult;
  /** CR-10: the land this batch was played in. */
  gradeId: string;
  onStartNewBatch: () => void;
  onChooseGrade: () => void;
}

/**
 * Shown after Round 4 (plan.md v5 AC21: total score + per-round breakdown;
 * plan.md v10: points is now the headline metric, matching IOE's own
 * raw-point-total convention, with the existing correct-count line kept as
 * a secondary detail).
 *
 * CR-10 DS-R4: one chest award per mount (ref guard for StrictMode):
 * +2 chest stars, batch completion, day streak and sticker checks.
 *
 * CR-11 DS-P1: single rhythm (mt-3 lines / mt-8 blocks / mt-6 CTAs),
 * w-full->auto buttons, gold gradient score pill.
 */
export default function BatchSummary({ result, gradeId, onStartNewBatch, onChooseGrade }: BatchSummaryProps) {
  const status = getScoreStatus(result.points, result.maxPoints);
  const awarded = useRef<{ batch: BatchAwardResult; streakStickers: Sticker[]; totalStars: number } | null>(null);
  const [award, setAward] = useState(awarded.current);

  useEffect(() => {
    if (!awarded.current) {
      const batch = recordBatchResult(gradeId);
      touchStreak();
      // CR-27: a finished 4-round batch counts as the daily big-mode
      // quest. Correct answers are already recorded per-round in
      // RoundSummary - re-recording here would double-count.
      recordBigModeComplete();
      const streakStickers = checkStreakStickers();
      // Luu ket qua len Supabase cho bao cao tien do - no-op voi guest.
      void savePracticeResult(gradeId, result);
      awarded.current = { batch, streakStickers, totalStars: getState().totalStars };
      setAward(awarded.current);
    }
  }, [gradeId, result]);

  const newStickers = award ? [...award.batch.newStickers, ...award.streakStickers] : [];

  return (
    <div className={`mx-auto max-w-2xl px-4 py-6 sm:py-10 ${SCREEN_ENTER}`}>
      <div className={`${CARD} text-center`}>
      <Mascot mood="celebrating" />
      <h1 className={`mt-1 ${H1}`}>Hoàn thành bài luyện tập!</h1>
      {award && (
        <ChestReveal
          chestStars={award.batch.chestStars}
          totalStars={award.totalStars}
          newStickers={newStickers}
        />
      )}
      <p className="mt-6 flex justify-center">
        <span data-testid="batch-points-summary" className={SCORE_PILL_LG}>
          {result.points}/{result.maxPoints} điểm
        </span>
      </p>
      <p data-testid="batch-score-summary" className="mt-3 text-xl font-semibold text-amber-200">
        Tổng điểm: {result.totalCorrect}/{result.totalQuestions} câu đúng.
      </p>
      <p
        data-testid="batch-completion-badge"
        className={`mt-3 text-lg font-semibold ${status.isComplete ? 'text-emerald-300' : 'text-amber-200'}`}
      >
        {status.label}
      </p>

      <div className="mt-8 text-left">
        <h2 className={`mb-4 ${H2}`}>Kết quả từng vòng</h2>
        <ul className="space-y-3">
          {result.rounds.map((round) => (
            <li
              key={round.roundNumber}
              data-testid={`round-breakdown-${round.roundNumber}`}
              className="rounded-2xl bg-sky-500/15 p-4 shadow-sm ring-1 ring-sky-400/30"
            >
              <p className="font-display text-lg font-bold text-white">{round.titleVi}</p>
              <p className="mt-0.5 text-base text-slate-300">
                {round.implemented
                  ? `${round.correctCount}/${round.totalCount} câu đúng (${round.points}/${round.maxPoints} điểm)`
                  : 'Chưa có nội dung ở bản này'}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
        <button
          type="button"
          data-testid="practice-again-button"
          onClick={onStartNewBatch}
          className={`w-full sm:w-auto ${CONTINUE_BUTTON_CLASSNAME}`}
        >
          Luyện tập bài mới
        </button>
        <button
          type="button"
          data-testid="back-to-grades"
          onClick={onChooseGrade}
          className={`${NAV_PILL} w-full text-2xl sm:w-auto`}
        >
          Chọn lớp khác
        </button>
      </div>
      </div>
    </div>
  );
}
