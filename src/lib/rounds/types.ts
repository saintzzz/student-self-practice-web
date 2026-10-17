import type { Question, RoundType, VocabWord } from '../../types';

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
   * possible without quick repetition"). CR-07: `words` is the selected
   * grade's vocabulary pool - builders never read ALL_WORDS directly, so
   * a Batch only ever draws from the grade the student picked.
   *
   * CR-82 (ARCHITECTURE-v5 D-04): optional `ctx.gradeId` lets builders bake
   * grade-specific payloads (G1-2 tracing/spell/gap mechanics) at build
   * time - components render what the payload carries. Older call sites
   * pass no ctx and get the legacy (grade-agnostic) mix.
   */
  buildQuestions?: (
    seed: string,
    words: readonly VocabWord[],
    ctx?: { gradeId: string },
  ) => Question[];
}
