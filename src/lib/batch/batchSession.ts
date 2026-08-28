import type { RoundType } from '../../types';
import { ROUND_DEFINITIONS } from '../rounds/roundDefinitions';
import type { RoundContentDefinition } from '../rounds/types';
import {
  advanceToNextQuestion,
  computeSessionResult,
  createSession,
  isSessionComplete,
  type PracticeSessionState,
} from '../practiceSession';

export interface RoundOutcome {
  roundNumber: number;
  roundType: RoundType;
  titleVi: string;
  correctCount: number;
  totalCount: number;
  /** False for a Round rendered as a stub placeholder (no real content yet). */
  implemented: boolean;
}

export interface BatchResult {
  totalCorrect: number;
  totalQuestions: number;
  rounds: RoundOutcome[];
}

export type BatchPhase = 'active' | 'round-summary' | 'stub' | 'batch-summary';

export interface BatchState {
  seed: string;
  roundIndex: number;
  phase: BatchPhase;
  /** Set only while phase === 'active' - the current Round's question loop. */
  roundSession: PracticeSessionState | null;
  completedRounds: RoundOutcome[];
}

function randomSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildRoundOutcome(
  definition: RoundContentDefinition,
  session: PracticeSessionState | null,
): RoundOutcome {
  if (!session) {
    return {
      roundNumber: definition.roundNumber,
      roundType: definition.roundType,
      titleVi: definition.titleVi,
      correctCount: 0,
      totalCount: 0,
      implemented: false,
    };
  }

  const result = computeSessionResult(session);
  return {
    roundNumber: definition.roundNumber,
    roundType: definition.roundType,
    titleVi: definition.titleVi,
    correctCount: result.correctCount,
    totalCount: result.totalCount,
    implemented: true,
  };
}

function startRound(roundIndex: number, completedRounds: RoundOutcome[], seed: string): BatchState {
  const definition = ROUND_DEFINITIONS[roundIndex];
  if (!definition) {
    return { seed, roundIndex, phase: 'batch-summary', roundSession: null, completedRounds };
  }

  if (!definition.buildQuestions) {
    return {
      seed,
      roundIndex,
      phase: 'stub',
      roundSession: null,
      completedRounds: [...completedRounds, buildRoundOutcome(definition, null)],
    };
  }

  return {
    seed,
    roundIndex,
    phase: 'active',
    roundSession: createSession(definition.buildQuestions(seed)),
    completedRounds,
  };
}

/** Starts a brand-new Batch: Round 1 of 4, freshly seeded unless a seed is given (tests). */
export function createBatch(seed: string = randomSeed()): BatchState {
  return startRound(0, [], seed);
}

export function currentRoundDefinition(state: BatchState): RoundContentDefinition | null {
  return ROUND_DEFINITIONS[state.roundIndex] ?? null;
}

/** Applies a per-round answer reducer (e.g. submitExtraLetterAnswer) to the active Round's session. */
export function updateRoundSession(
  state: BatchState,
  update: (session: PracticeSessionState) => PracticeSessionState,
): BatchState {
  if (state.phase !== 'active' || !state.roundSession) {
    return state;
  }
  return { ...state, roundSession: update(state.roundSession) };
}

/**
 * Advances to the next question within the active Round, or - once the
 * Round's last question is answered - transitions to that Round's
 * round-summary phase (AC17: each Round is scored immediately after its
 * last question).
 */
export function advanceRoundQuestion(state: BatchState): BatchState {
  if (state.phase !== 'active' || !state.roundSession) {
    return state;
  }

  const advanced = advanceToNextQuestion(state.roundSession);
  if (!isSessionComplete(advanced)) {
    return { ...state, roundSession: advanced };
  }

  const definition = ROUND_DEFINITIONS[state.roundIndex];
  if (!definition) {
    return { ...state, roundSession: advanced, phase: 'batch-summary' };
  }

  return {
    ...state,
    roundSession: advanced,
    phase: 'round-summary',
    completedRounds: [...state.completedRounds, buildRoundOutcome(definition, advanced)],
  };
}

/** Moves from the current Round's summary/stub to the next Round, or to the Batch summary after Round 4. */
export function goToNextRound(state: BatchState): BatchState {
  const nextIndex = state.roundIndex + 1;
  if (nextIndex >= ROUND_DEFINITIONS.length) {
    return { ...state, roundIndex: nextIndex, phase: 'batch-summary', roundSession: null };
  }
  return startRound(nextIndex, state.completedRounds, state.seed);
}

/** Total score and per-round breakdown, shown on the Batch summary screen (AC21). */
export function computeBatchResult(state: BatchState): BatchResult {
  const totalCorrect = state.completedRounds.reduce((sum, round) => sum + round.correctCount, 0);
  const totalQuestions = state.completedRounds.reduce((sum, round) => sum + round.totalCount, 0);
  return { totalCorrect, totalQuestions, rounds: state.completedRounds };
}
