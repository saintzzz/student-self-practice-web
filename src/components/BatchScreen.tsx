import { computeBatchResult, currentRoundDefinition, type BatchState } from '../lib/batch/batchSession';
import { useRoundTimer } from '../hooks/useRoundTimer';
import RoundProgress from './RoundProgress';
import LiveScore from './LiveScore';
import RoundTimer from './RoundTimer';
import ActiveRoundQuestion from './ActiveRoundQuestion';
import RoundSummary from './RoundSummary';
import RoundStub from './RoundStub';
import BatchSummary from './BatchSummary';

interface BatchScreenProps {
  batch: BatchState;
  onSubmitOption: (index: number) => void;
  onSubmitListening: (typedAnswer: string) => void;
  onSubmitExtraLetter: (letterIndex: number) => void;
  onSubmitPronunciation: (transcript: string) => void;
  onSubmitPairMatching: (isCorrect: boolean) => void;
  onNextQuestion: () => void;
  onNextRound: () => void;
  onStartNewBatch: () => void;
  onChooseGrade: () => void;
  /** Called exactly once when the active Round's 5:00 timer expires (plan.md v7 AC28). */
  onRoundTimeExpired: () => void;
}

const TOTAL_ROUNDS = 4;

/**
 * Routes among a Batch's phases (plan.md v5 "New Interaction Model: Batch /
 * Round"). This is the single seam that will need a new branch when Round
 * 3/4 get real content in a follow-up task: once their RoundContentDefinition
 * gets a `buildQuestions`, `phase` naturally becomes 'active' for them too
 * and they render through the exact same ActiveRoundQuestion/RoundSummary
 * path Round 1/2 already use - no new phase or component is required here.
 *
 * Also owns the per-Round timer (plan.md v7 "Round Timer"): `useRoundTimer`
 * is called unconditionally (Rules of Hooks) before any phase branch, keyed
 * on `${batch.seed}:${batch.roundIndex}` so it resets to a fresh 5:00 on
 * every new Round, including Round 1 of a brand-new Batch (AC29), and only
 * ticks while `phase === 'active'`.
 */
export default function BatchScreen({
  batch,
  onSubmitOption,
  onSubmitListening,
  onSubmitExtraLetter,
  onSubmitPronunciation,
  onSubmitPairMatching,
  onNextQuestion,
  onNextRound,
  onStartNewBatch,
  onChooseGrade,
  onRoundTimeExpired,
}: BatchScreenProps) {
  const roundKey = `${batch.seed}:${batch.roundIndex}`;
  const { secondsRemaining } = useRoundTimer(roundKey, batch.phase === 'active', onRoundTimeExpired);

  if (batch.phase === 'batch-summary') {
    return (
      <BatchSummary
        result={computeBatchResult(batch)}
        onStartNewBatch={onStartNewBatch}
        onChooseGrade={onChooseGrade}
      />
    );
  }

  const definition = currentRoundDefinition(batch);
  if (!definition) {
    return (
      <BatchSummary
        result={computeBatchResult(batch)}
        onStartNewBatch={onStartNewBatch}
        onChooseGrade={onChooseGrade}
      />
    );
  }

  const lastCompletedOutcome = batch.completedRounds[batch.completedRounds.length - 1];

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8">
      <RoundProgress roundNumber={definition.roundNumber} totalRounds={TOTAL_ROUNDS} titleVi={definition.titleVi} />

      {batch.phase === 'stub' && <RoundStub titleVi={definition.titleVi} onNextRound={onNextRound} />}

      {batch.phase === 'active' && batch.roundSession && (
        <>
          <div className="mb-4 flex items-center justify-center gap-6">
            <LiveScore session={batch.roundSession} />
            <RoundTimer secondsRemaining={secondsRemaining} />
          </div>
          <ActiveRoundQuestion
            session={batch.roundSession}
            onSubmitOption={onSubmitOption}
            onSubmitListening={onSubmitListening}
            onSubmitExtraLetter={onSubmitExtraLetter}
            onSubmitPronunciation={onSubmitPronunciation}
            onSubmitPairMatching={onSubmitPairMatching}
            onNextQuestion={onNextQuestion}
          />
        </>
      )}

      {batch.phase === 'round-summary' && lastCompletedOutcome && (
        <RoundSummary outcome={lastCompletedOutcome} onNextRound={onNextRound} />
      )}
    </div>
  );
}
