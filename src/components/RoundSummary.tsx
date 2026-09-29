import type { RoundOutcome } from '../lib/batch/batchSession';
import { getScoreStatus } from '../lib/batch/scoreStatus';
import { CONTINUE_BUTTON_CLASSNAME } from './actionButtonStyle';
import { CARD, SCREEN_ENTER } from '../lib/ui/tokens';
import Mascot from './Mascot';

interface RoundSummaryProps {
  outcome: RoundOutcome;
  onNextRound: () => void;
}

/**
 * Shown right after a Round's last question is answered (plan.md v5 -
 * "After each Round: a round score"; plan.md v10 - points headline + 75%
 * completion badge + celebrating mascot). No own mx-auto/max-w/px-4 (plan.md
 * v9 fix) - always nested inside BatchScreen's wrapper, which already
 * provides that padding; re-applying it here doubled the horizontal
 * padding on narrow phones.
 */
export default function RoundSummary({ outcome, onNextRound }: RoundSummaryProps) {
  const status = getScoreStatus(outcome.points, outcome.maxPoints);

  return (
    <div className={`${CARD} ${SCREEN_ENTER} py-6 text-center [@media(max-height:420px)]:py-3`}>
      <Mascot mood="celebrating" />
      <h2 className="mb-2 font-display text-2xl font-extrabold text-sky-900">{outcome.titleVi}</h2>
      <p data-testid="round-score-summary" className="mb-2 text-2xl font-semibold text-sky-700">
        Em trả lời đúng {outcome.correctCount}/{outcome.totalCount} câu ở vòng này.
      </p>
      <p className="mb-3 flex justify-center">
        <span
          data-testid="round-points-summary"
          className="inline-flex items-center justify-center rounded-full bg-amber-400 px-6 py-2 font-display text-xl font-extrabold text-amber-950 shadow-md ring-4 ring-amber-200"
        >
          {outcome.points}/{outcome.maxPoints} điểm
        </span>
      </p>
      <p
        data-testid="round-completion-badge"
        className={`mb-4 text-lg font-semibold ${status.isComplete ? 'text-emerald-700' : 'text-sky-700'}`}
      >
        {status.label}
      </p>
      <button type="button" data-testid="next-round-button" onClick={onNextRound} className={CONTINUE_BUTTON_CLASSNAME}>
        Vòng tiếp theo →
      </button>
    </div>
  );
}
