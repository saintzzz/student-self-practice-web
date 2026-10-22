import { useEffect, useState } from 'react';
import type { TracingMeta } from '../types';
import { GRADES } from '../data/grades';
import { computeBatchResult, currentRoundDefinition, type BatchState } from '../lib/batch/batchSession';
import { TOTAL_ROUNDS } from '../lib/rounds/roundDefinitions';
import type { GameEnd } from '../games/types';
import GameSection from './GameSection';
import { prefetchTracingChunk } from './tracing/TracingChunkBoundary';
import { computeLiveScore } from '../lib/liveScore';
import { material, SCREEN_ENTER, scene } from '../lib/ui/tokens';
import { useRoundTimer } from '../hooks/useRoundTimer';
import { useSceneJourney } from './scene/SceneJourneyContext';
import RoundProgress from './RoundProgress';
import LiveScore from './LiveScore';
import { RewardFxProvider } from './fx/RewardFxContext';
import RoundTimer from './RoundTimer';
import ActiveRoundQuestion from './ActiveRoundQuestion';
import RoundSummary from './RoundSummary';
import RoundStub from './RoundStub';
import BatchSummary from './BatchSummary';
import ConfirmEndDialog from './ConfirmEndDialog';

interface BatchScreenProps {
  batch: BatchState;
  onSubmitOption: (index: number) => void;
  onSubmitListening: (typedAnswer: string) => void;
  onSubmitExtraLetter: (letterIndex: number) => void;
  onSubmitPronunciation: (transcript: string, options?: import('../lib/rounds/pronunciationScoring').PronunciationScoringOptions) => void;
  onSubmitPairMatching: (isCorrect: boolean) => void;
  /** CR-82 (D-10): tracing submits carry TracingMeta (assisted flag). */
  onSubmitTracing?: (isCorrect: boolean, meta: TracingMeta) => void;
  onNextQuestion: () => void;
  onNextRound: () => void;
  onStartNewBatch: () => void;
  onChooseGrade: () => void;
  /** CR-55: ends the whole Batch mid-flight - lands on the Batch summary. */
  onEndBatch: () => void;
  /** Called exactly once when the active Round's 5:00 timer expires (plan.md v7 AC28). */
  onRoundTimeExpired: () => void;
  /** CR-86: the bonus game Round's run finished - GameEnd becomes the RoundOutcome. */
  onCompleteGameRound: (end: GameEnd) => void;
  /** CR-13: guest trial - lock rounds after the free Round 1 behind login. */
  guestLocked?: boolean;
  onRequestLogin?: () => void;
}

/* CR-86: TOTAL_ROUNDS comes from the round registry (4 question rounds +
   the seeded bonus game Round 5). */

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
  onSubmitTracing,
  onNextQuestion,
  onNextRound,
  onStartNewBatch,
  onChooseGrade,
  onEndBatch,
  onRoundTimeExpired,
  onCompleteGameRound,
  guestLocked = false,
  onRequestLogin,
}: BatchScreenProps) {
  const roundKey = `${batch.seed}:${batch.roundIndex}`;
  const { secondsRemaining } = useRoundTimer(roundKey, batch.phase === 'active', onRoundTimeExpired);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);

  /* kids-UX: run-seeded keys - `round:<seed>:<n>` / `batch:<seed>` keep
     reward grants idempotent (AC-4.4), and the round-scoped speaker key
     makes G1-2 instruction autoplay fire once per round (design s3.2). */
  const roundObjectiveId = `round:${batch.seed}:${batch.roundIndex}`;
  const roundSpeakerKey = `round-${batch.gradeId}-${batch.roundIndex}-${batch.seed}`;

  // CR-09 header track: live question progress while playing, whole-round
  // position on stub/summary screens. CR-82 (M2, s6.3): the same fraction
  // also pans the hero land beneath the board via an imperative
  // `--journey` write (D-06) - progress moves on every advance, correct
  // or not, and resets with a crossfade on each new roundKey.
  const progressFraction =
    batch.phase === 'active' && batch.roundSession
      ? computeLiveScore(batch.roundSession).answered / batch.roundSession.questions.length
      : batch.completedRounds.length / TOTAL_ROUNDS;
  useSceneJourney(progressFraction, roundKey);

  /* CR-82 (D-22): when the active round contains a tracing item, warm
     the lazy chunk with attempt 0 - a successful prefetch is reused by
     the boundary, a failed one is silently reported there. */
  const roundHasTracing =
    batch.phase === 'active' &&
    batch.roundSession?.questions.some((q) => q.kind === 'letter-tracing');
  useEffect(() => {
    if (roundHasTracing) prefetchTracingChunk();
  }, [roundHasTracing]);

  if (batch.phase === 'batch-summary') {
    return (
      <BatchSummary
        result={computeBatchResult(batch)}
        gradeId={batch.gradeId}
        onStartNewBatch={onStartNewBatch}
        onChooseGrade={onChooseGrade}
        objectiveId={`batch:${batch.seed}`}
        speakerKey={`batch-${batch.gradeId}-${batch.seed}`}
      />
    );
  }

  const definition = currentRoundDefinition(batch);
  if (!definition) {
    return (
      <BatchSummary
        result={computeBatchResult(batch)}
        gradeId={batch.gradeId}
        onStartNewBatch={onStartNewBatch}
        onChooseGrade={onChooseGrade}
        objectiveId={`batch:${batch.seed}`}
        speakerKey={`batch-${batch.gradeId}-${batch.seed}`}
      />
    );
  }

  const lastCompletedOutcome = batch.completedRounds[batch.completedRounds.length - 1];

  return (
    /* CR-82 (D-17): reward FX scope - LiveScore registers its chip as
       the score target, QuestionCard fires the star-fly on correct
       verdicts; the fixed fly layer renders inside the provider. */
    <RewardFxProvider>
    <div className={`mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-4 pt-2 ${scene.glow} ${SCREEN_ENTER} pb-16 sm:pb-20 [@media(max-height:420px)]:pb-2`}>
      {/* CR-81: bottom padding floats the board above the moonlit land
          scene - the journey world peeks from beneath instead of a
          dead navy void. Shrinks to a sliver on short landscape. */}
      {/* CR-79 C1: full-viewport column - chrome shrink-0, question card
          flex-1 so content fills the screen instead of leaving a dead
          bottom band. */}
      {/* DS-U2 single play chrome: round chip + track + score/timer chips
          in one card strip; title line drops on <=420px heights. */}
      <div className={`mb-2 flex shrink-0 flex-col gap-1.5 ${material.chrome} p-2 sm:flex-row sm:items-start sm:gap-2 sm:px-4 sm:py-2.5 [@media(max-height:420px)]:mb-1`}>
        <RoundProgress
          roundNumber={definition.roundNumber}
          totalRounds={TOTAL_ROUNDS}
          titleVi={definition.titleVi}
          progressFraction={progressFraction}
        />
        {batch.phase === 'active' && batch.roundSession && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 self-end sm:self-auto">
            <LiveScore session={batch.roundSession} />
            <RoundTimer secondsRemaining={secondsRemaining} />
          </div>
        )}
        {/* CR-55: same-purpose "KẾT THÚC" as the drill/exam header - ends the
            whole Batch from any phase and lands on the Batch summary.
            CR-69: one mis-tap used to kill the session - confirm first. */}
        <button
          type="button"
          data-testid="batch-end-early"
          onClick={() => setEndConfirmOpen(true)}
          className="min-h-[48px] shrink-0 self-end rounded-full bg-sky-700 px-4 font-display text-sm font-extrabold tracking-wide text-white shadow-md transition hover:bg-sky-600 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 sm:self-auto"
        >
          KẾT THÚC
        </button>
      </div>

      {endConfirmOpen && (
        <ConfirmEndDialog
          title="Kết thúc bài?"
          body="Em sẽ xem điểm các câu đã làm luôn nhé."
          confirmLabel="Kết thúc"
          onConfirm={() => {
            setEndConfirmOpen(false);
            onEndBatch();
          }}
          onCancel={() => setEndConfirmOpen(false)}
        />
      )}

      {batch.phase === 'stub' && <RoundStub titleVi={definition.titleVi} onNextRound={onNextRound} />}

      {/* CR-86: the seeded bonus game Round mounts the registered game
          inside GameSection - its GameEnd becomes the RoundOutcome via
          onCompleteGameRound. Deterministic seed per Batch run keeps the
          engagement grants idempotent. */}
      {batch.phase === 'game' && definition.game && (
        <GameSection
          grade={GRADES.find((g) => g.id === batch.gradeId) ?? { id: batch.gradeId, name: batch.gradeId }}
          gameId={definition.game.gameId}
          seed={`batch:${batch.seed}:r${batch.roundIndex}`}
          level={definition.game.level}
          onComplete={onCompleteGameRound}
        />
      )}

      {batch.phase === 'active' && batch.roundSession && (
        <ActiveRoundQuestion
          session={batch.roundSession}
          speakerKey={roundSpeakerKey}
          onSubmitOption={onSubmitOption}
          onSubmitListening={onSubmitListening}
          onSubmitExtraLetter={onSubmitExtraLetter}
          onSubmitPronunciation={onSubmitPronunciation}
          onSubmitPairMatching={onSubmitPairMatching}
          onSubmitTracing={onSubmitTracing}
          onNextQuestion={onNextQuestion}
        />
      )}

      {batch.phase === 'round-summary' && lastCompletedOutcome && (
        <RoundSummary
          outcome={lastCompletedOutcome}
          gradeId={batch.gradeId}
          onNextRound={onNextRound}
          locked={guestLocked}
          onRequestLogin={onRequestLogin}
          onExit={onChooseGrade}
          onEndBatch={onEndBatch}
          objectiveId={roundObjectiveId}
          speakerKey={roundSpeakerKey}
        />
      )}
    </div>
    </RewardFxProvider>
  );
}
