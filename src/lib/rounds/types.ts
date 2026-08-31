import type { Question, RoundType } from '../../types';

/**
 * One entry in the fixed 4-Round Batch registry (plan.md v5 "New
 * Interaction Model: Batch / Round"). `buildQuestions` is the pluggable
 * seam: a Round with real content sets it; a Round without real content yet
 * (Round 4 in this build) omits it entirely, and batchSession.ts /
 * BatchScreen.tsx render a stub placeholder instead of a question loop.
 *
 * To light up Round 4 in a follow-up task: build its generator under
 * src/lib/generators/, build its Round-level "pick ~10 from the pool"
 * function under src/lib/rounds/ (same shape as round1ExtraLetter.ts /
 * round2ListeningSentence.ts / round3Pronunciation.ts), then add
 * `buildQuestions` to that round's entry in roundDefinitions.ts. No changes
 * to batchSession.ts, BatchScreen.tsx, or the Batch state machine are
 * needed for that step alone.
 */
export interface RoundContentDefinition {
  roundNumber: 1 | 2 | 3 | 4;
  roundType: RoundType;
  titleVi: string;
  /**
   * Builds this Round's ~10 question instances for one Batch attempt.
   * `seed` varies per Batch so repeated batches by the same student are not
   * quick repeats of each other (plan.md v5, "Multiple batches must be
   * possible without quick repetition").
   */
  buildQuestions?: (seed: string) => Question[];
}
