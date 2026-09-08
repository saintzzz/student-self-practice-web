import type { BatchResult } from '../lib/batch/batchSession';
import { getScoreStatus } from '../lib/batch/scoreStatus';
import { CONTINUE_BUTTON_CLASSNAME } from './actionButtonStyle';
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
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <Mascot mood="celebrating" />
      <h1 className="mb-3 text-4xl font-extrabold text-sky-900">Hoàn thành bài luyện tập!</h1>
      <p data-testid="batch-points-summary" className="mb-1 text-4xl font-extrabold text-amber-600">
        {result.points}/{result.maxPoints} điểm
      </p>
      <p data-testid="batch-score-summary" className="mb-2 text-xl font-semibold text-sky-700">
        Tổng điểm: {result.totalCorrect}/{result.totalQuestions} câu đúng.
      </p>
      <p
        data-testid="batch-completion-badge"
        className={`mb-10 text-lg font-semibold ${status.isComplete ? 'text-emerald-700' : 'text-sky-700'}`}
      >
        {status.label}
      </p>

      <div className="mb-10 text-left">
        <h2 className="mb-4 text-xl font-bold text-sky-900">Kết quả từng vòng</h2>
        <ul className="space-y-3">
          {result.rounds.map((round) => (
            <li
              key={round.roundNumber}
              data-testid={`round-breakdown-${round.roundNumber}`}
              className="rounded-2xl border-4 border-sky-200 bg-sky-50 p-4"
            >
              <p className="text-lg font-bold text-sky-900">{round.titleVi}</p>
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
          className="flex min-h-[76px] items-center justify-center rounded-2xl border-4 border-sky-300 bg-white px-8 py-4 text-2xl font-bold text-sky-700 transition hover:bg-sky-50"
        >
          Chọn lớp khác
        </button>
      </div>
    </div>
  );
}
