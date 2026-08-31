import { computeBatchResult, currentRoundDefinition, type BatchState } from '../lib/batch/batchSession';
import RoundProgress from './RoundProgress';
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
  onNextQuestion: () => void;
  onNextRound: () => void;
  onStartNewBatch: () => void;
  onChooseGrade: () => void;
}

const TOTAL_ROUNDS = 4;

/**
 * Routes among a Batch's phases (plan.md v5 "New Interaction Model: Batch /
 * Round"). This is the single seam that will need a new branch when Round
 * 3/4 get real content in a follow-up task: once their RoundContentDefinition
 * gets a `buildQuestions`, `phase` naturally becomes 'active' for them too
 * and they render through the exact same ActiveRoundQuestion/RoundSummary
 * path Round 1/2 already use - no new phase or component is required here.
 */
export default function BatchScreen({
  batch,
  onSubmitOption,
  onSubmitListening,
  onSubmitExtraLetter,
  onSubmitPronunciation,
  onNextQuestion,
  onNextRound,
  onStartNewBatch,
  onChooseGrade,
}: BatchScreenProps) {
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
        <ActiveRoundQuestion
          session={batch.roundSession}
          onSubmitOption={onSubmitOption}
          onSubmitListening={onSubmitListening}
          onSubmitExtraLetter={onSubmitExtraLetter}
          onSubmitPronunciation={onSubmitPronunciation}
          onNextQuestion={onNextQuestion}
        />
      )}

      {batch.phase === 'round-summary' && lastCompletedOutcome && (
        <RoundSummary outcome={lastCompletedOutcome} onNextRound={onNextRound} />
      )}
    </div>
  );
}
