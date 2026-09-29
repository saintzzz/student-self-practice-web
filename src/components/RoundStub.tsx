import { CONTINUE_BUTTON_CLASSNAME } from './actionButtonStyle';
import { CARD, SCREEN_ENTER } from '../lib/ui/tokens';

interface RoundStubProps {
  titleVi: string;
  onNextRound: () => void;
}

/**
 * Placeholder shown for a Round with no real content yet (Round 3/4 in this
 * build - plan.md v5). No question loop, no crash - just a clear Vietnamese
 * "coming soon" message and the same next-round-button affordance used to
 * finish a real Round, so the Batch flow never gets stuck. No own
 * mx-auto/max-w/px-4 (plan.md v9 fix) - see RoundSummary for the same
 * double-padding reasoning; this component is always nested the same way.
 */
export default function RoundStub({ titleVi, onNextRound }: RoundStubProps) {
  return (
    <div className={`${CARD} ${SCREEN_ENTER} py-6 text-center`}>
      <div className="mb-3 text-6xl" aria-hidden="true">
        🚧
      </div>
      <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-sky-900">{titleVi}</h2>
      <p className="mt-3 text-xl font-semibold text-sky-700">
        Vòng này đang được phát triển. Hẹn gặp lại em trong bản cập nhật tiếp theo nhé!
      </p>
      <button type="button" data-testid="next-round-button" onClick={onNextRound} className={`mt-6 w-full sm:w-auto ${CONTINUE_BUTTON_CLASSNAME}`}>
        Tiếp tục →
      </button>
    </div>
  );
}
