import type { BatchResult } from '../lib/batch/batchSession';

interface BatchSummaryProps {
  result: BatchResult;
  onStartNewBatch: () => void;
  onChooseGrade: () => void;
}

/** Shown after Round 4 (plan.md v5 AC21: total score + per-round breakdown). */
export default function BatchSummary({ result, onStartNewBatch, onChooseGrade }: BatchSummaryProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <h1 className="mb-3 text-4xl font-extrabold text-sky-900">Hoàn thành bài luyện tập!</h1>
      <p data-testid="batch-score-summary" className="mb-10 text-2xl font-semibold text-sky-700">
        Tổng điểm: {result.totalCorrect}/{result.totalQuestions} câu đúng.
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
                  ? `${round.correctCount}/${round.totalCount} câu đúng`
                  : 'Chưa có nội dung ở bản này'}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col justify-center gap-4 sm:flex-row">
        <button
          type="button"
          data-testid="practice-again-button"
          onClick={onStartNewBatch}
          className="rounded-2xl bg-amber-500 px-8 py-4 text-2xl font-bold text-white shadow-md transition hover:bg-amber-600"
        >
          Luyện tập bài mới
        </button>
        <button
          type="button"
          data-testid="back-to-grades"
          onClick={onChooseGrade}
          className="rounded-2xl border-4 border-sky-300 bg-white px-8 py-4 text-2xl font-bold text-sky-700 transition hover:bg-sky-50"
        >
          Chọn lớp khác
        </button>
      </div>
    </div>
  );
}
