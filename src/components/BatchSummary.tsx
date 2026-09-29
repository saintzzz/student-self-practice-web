import type { BatchResult } from '../lib/batch/batchSession';
import { getScoreStatus } from '../lib/batch/scoreStatus';
import { CONTINUE_BUTTON_CLASSNAME } from './actionButtonStyle';
import { CARD, H1, H2, NAV_PILL, SCREEN_ENTER } from '../lib/ui/tokens';
import Mascot from './Mascot';

interface BatchSummaryProps {
  result: BatchResult;
  onStartNewBatch: () => void;
  onChooseGrade: () => void;
}

/**
 * Shown after Round 4 (plan.md v5 AC21: total score + per-round breakdown;
 * plan.md v10: points is now the headline metric, matching IOE's own
 * raw-point-total convention, with the existing correct-count line kept as
 * a secondary detail).
 */
export default function BatchSummary({ result, onStartNewBatch, onChooseGrade }: BatchSummaryProps) {
  const status = getScoreStatus(result.points, result.maxPoints);

  return (
    <div className={`mx-auto max-w-2xl px-4 py-12 ${SCREEN_ENTER}`}>
      <div className={`${CARD} text-center`}>
      <Mascot mood="celebrating" />
      <h1 className={`mb-3 ${H1}`}>Hoàn thành bài luyện tập!</h1>
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
