import type { DescribeAndChooseImageQuestion, PicturePairMatchingQuestion } from '../../types';
import { ALL_WORDS } from '../../data/vocabulary';
import { generateDescribeAndChooseImageQuestions } from '../generators/describeAndChooseImage';
import { generatePicturePairMatchingBoards } from '../generators/picturePairMatching';
import { seededShuffleIndices } from '../prng';
import { stratifiedSample } from './stratifiedSample';

/** "About 10 questions" per Round, per plan.md v5. */
export const ROUND_4_QUESTION_COUNT = 10;

/**
 * Round 4 mix ratio (plan.md v8 "Round 4 Addition: Picture-Pair-Matching
 * Board"): ~3 pair-matching boards + ~7 describe-and-choose-image questions
 * out of the ~10-question Round, per the plan's own "e.g. ~3 boards + ~7
 * sentence-based questions" suggestion. A board is a heavier, multi-attempt
 * interaction than a single describe-and-choose-image click, so keeping it a
 * minority share preserves Round 4's overall pace while still giving every
 * Batch attempt real exposure to the new format.
 */
export const ROUND_4_PAIR_MATCHING_COUNT = 3;
export const ROUND_4_DESCRIBE_COUNT = ROUND_4_QUESTION_COUNT - ROUND_4_PAIR_MATCHING_COUNT;

export type Round4Question = DescribeAndChooseImageQuestion | PicturePairMatchingQuestion;

/**
 * Round 4 - Describe and Choose Image + Picture-Pair-Matching (plan.md v5
 * "Round 4 - Describe and Choose Image", v8 "Round 4 Addition:
 * Picture-Pair-Matching Board"). Draws from the WHOLE vocabulary pool
 * (ALL_WORDS), not a single topic, same as every other Round. A fresh `seed`
 * per Batch samples a different ~10-question slice each time so repeated
 * batches vary.
 *
 * Both question kinds are drawn independently via `stratifiedSample`
 * (plan.md v6 "Topic-Balanced Sampling", AC23) so each kind's own slice
 * spreads across topics instead of being dominated by large topics like
 * Animals - then the two slices are combined and shuffled together so the
 * kinds interleave within the Round instead of appearing as two blocks (same
 * pattern as round2ListeningSentence.ts's mix of its two kinds).
 */
export function buildRound4Questions(seed: string): Round4Question[] {
  const describePool = generateDescribeAndChooseImageQuestions(ALL_WORDS);
  const pairMatchingPool = generatePicturePairMatchingBoards(ALL_WORDS);

  const describeQuestions = stratifiedSample(describePool, ROUND_4_DESCRIBE_COUNT, `round4-describe-${seed}`);
  const pairMatchingQuestions = stratifiedSample(
    pairMatchingPool,
    ROUND_4_PAIR_MATCHING_COUNT,
    `round4-pairmatch-${seed}`,
  );

  const combined: Round4Question[] = [...describeQuestions, ...pairMatchingQuestions];
  const order = seededShuffleIndices(combined.length, `round4-mix-${seed}`);
  return order.map((i) => combined[i]!);
}
