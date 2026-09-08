import type { RoundOutcome } from '../lib/batch/batchSession';
import { CONTINUE_BUTTON_CLASSNAME } from './actionButtonStyle';

interface RoundSummaryProps {
  outcome: RoundOutcome;
  onNextRound: () => void;
}

/**
 * Shown right after a Round's last question is answered (plan.md v5 -
 * "After each Round: a round score"). No own mx-auto/max-w/px-4 (plan.md
 * v9 fix) - always nested inside BatchScreen's wrapper, which already
 * provides that padding; re-applying it here doubled the horizontal
 * padding on narrow phones.
 */
export default function RoundSummary({ outcome, onNextRound }: RoundSummaryProps) {
  return (
    <div className="py-4 text-center">
      <h2 className="mb-2 text-2xl font-extrabold text-sky-900">{outcome.titleVi}</h2>
      <p data-testid="round-score-summary" className="mb-4 text-2xl font-semibold text-sky-700">
        Em trả lời đúng {outcome.correctCount}/{outcome.totalCount} câu ở vòng này.
      </p>
      <button type="button" data-testid="next-round-button" onClick={onNextRound} className={CONTINUE_BUTTON_CLASSNAME}>
        Vòng tiếp theo →
      </button>
    </div>
  );
}
