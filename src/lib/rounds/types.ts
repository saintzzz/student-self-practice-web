import type { Question, RoundType } from '../../types';

/**
 * One entry in the fixed 4-Round Batch registry (plan.md v5 "New
 * Interaction Model: Batch / Round"). `buildQuestions` is the pluggable
 * seam: a Round with real content sets it; a Round without real content yet
 * would omit it entirely, and batchSession.ts / BatchScreen.tsx would render
 * a stub placeholder instead of a question loop. All 4 Rounds now set
 * `buildQuestions` (plan.md v6 AC24/AC25) - see round1ExtraLetter.ts,
 * round2ListeningSentence.ts, round3Pronunciation.ts and
 * round4DescribeAndChooseImage.ts for the shared shape.
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
