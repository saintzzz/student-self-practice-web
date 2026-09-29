import { useEffect, useRef, useState } from 'react';
import type { BatchResult } from '../lib/batch/batchSession';
import { getScoreStatus } from '../lib/batch/scoreStatus';
import { CONTINUE_BUTTON_CLASSNAME } from './actionButtonStyle';
import { CARD, H1, H2, NAV_PILL, SCREEN_ENTER } from '../lib/ui/tokens';
import Mascot from './Mascot';
import ChestReveal from './celebrations/ChestReveal';
import {
  checkStreakStickers,
  getState,
  recordBatchResult,
  touchStreak,
  type BatchAwardResult,
  type Sticker,
} from '../lib/engagement/store';

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
 */
export default function BatchSummary({ result, gradeId, onStartNewBatch, onChooseGrade }: BatchSummaryProps) {
  const status = getScoreStatus(result.points, result.maxPoints);
  const awarded = useRef<{ batch: BatchAwardResult; streakStickers: Sticker[]; totalStars: number } | null>(null);
  const [award, setAward] = useState(awarded.current);

  useEffect(() => {
    if (!awarded.current) {
      const batch = recordBatchResult(gradeId);
      touchStreak();
      const streakStickers = checkStreakStickers();
      awarded.current = { batch, streakStickers, totalStars: getState().totalStars };
      setAward(awarded.current);
    }
  }, [gradeId]);

  const newStickers = award ? [...award.batch.newStickers, ...award.streakStickers] : [];

  return (
    <div className={`mx-auto max-w-2xl px-4 py-12 ${SCREEN_ENTER}`}>
      <div className={`${CARD} text-center`}>
      <Mascot mood="celebrating" />
      <h1 className={`mb-3 ${H1}`}>Hoàn thành bài luyện tập!</h1>
      {award && (
        <ChestReveal
          chestStars={award.batch.chestStars}
          totalStars={award.totalStars}
          newStickers={newStickers}
        />
      )}
      <p className="mb-1 flex justify-center">
        <span
          data-testid="batch-points-summary"
          className="inline-flex items-center justify-center rounded-full bg-amber-400 px-8 py-3 font-display text-4xl font-extrabold text-amber-950 shadow-lg ring-4 ring-amber-200"
        >
          {result.points}/{result.maxPoints} điểm
        </span>
      </p>
      <p data-testid="batch-score-summary" className="mb-2 mt-3 text-xl font-semibold text-sky-700">
        Tổng điểm: {result.totalCorrect}/{result.totalQuestions} câu đúng.
      </p>
      <p
        data-testid="batch-completion-badge"
        className={`mb-10 text-lg font-semibold ${status.isComplete ? 'text-emerald-700' : 'text-sky-700'}`}
      >
        {status.label}
      </p>

      <div className="mb-10 text-left">
        <h2 className={`mb-4 ${H2}`}>Kết quả từng vòng</h2>
        <ul className="space-y-3">
          {result.rounds.map((round) => (
            <li
              key={round.roundNumber}
              data-testid={`round-breakdown-${round.roundNumber}`}
              className="rounded-2xl bg-sky-50 p-4 shadow-sm ring-1 ring-sky-200"
            >
              <p className="font-display text-lg font-bold text-sky-900">{round.titleVi}</p>
              <p className="text-base text-slate-700">
                {round.implemented
                  ? `${round.correctCount}/${round.totalCount} câu đúng (${round.points}/${round.maxPoints} điểm)`
                  : 'Chưa có nội dung ở bản này'}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col justify-center gap-4 sm:flex-row">
        <button type="button" data-testid="practice-again-button" onClick={onStartNewBatch} className={CONTINUE_BUTTON_CLASSNAME}>
          Luyện tập bài mới
        </button>
        <button
          type="button"
          data-testid="back-to-grades"
          onClick={onChooseGrade}
          className={`${NAV_PILL} text-2xl`}
        >
          Chọn lớp khác
        </button>
      </div>
      </div>
    </div>
  );
}
