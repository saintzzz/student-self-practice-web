import type { RoundOutcome } from '../lib/batch/batchSession';

interface RoundSummaryProps {
  outcome: RoundOutcome;
  onNextRound: () => void;
}

/** Shown right after a Round's last question is answered (plan.md v5 - "After each Round: a round score"). */
export default function RoundSummary({ outcome, onNextRound }: RoundSummaryProps) {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 text-center">
      <h2 className="mb-3 text-2xl font-extrabold text-sky-900">{outcome.titleVi}</h2>
      <p data-testid="round-score-summary" className="mb-8 text-2xl font-semibold text-sky-700">
        Em trả lời đúng {outcome.correctCount}/{outcome.totalCount} câu ở vòng này.
      </p>
      <button
        type="button"
        data-testid="next-round-button"
        onClick={onNextRound}
        className="rounded-2xl bg-amber-500 px-10 py-4 text-2xl font-bold text-white shadow-md transition hover:bg-amber-600"
      >
        Vòng tiếp theo →
      </button>
    </div>
  );
}
