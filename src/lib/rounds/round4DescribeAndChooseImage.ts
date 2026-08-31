import type { DescribeAndChooseImageQuestion } from '../../types';
import { ALL_WORDS } from '../../data/vocabulary';
import { generateDescribeAndChooseImageQuestions } from '../generators/describeAndChooseImage';
import { stratifiedSample } from './stratifiedSample';

/** "About 10 questions" per Round, per plan.md v5. */
export const ROUND_4_QUESTION_COUNT = 10;

/**
 * Round 4 - Describe and Choose Image (plan.md v5/v6 "Round 4"). Draws from
 * the WHOLE vocabulary pool (ALL_WORDS), not a single topic, same as Round
 * 1/2/3. A fresh `seed` per Batch samples a different ~10-question slice
 * each time so repeated batches vary.
 *
 * Sampling is stratified by topic (plan.md v6 "Topic-Balanced Sampling",
 * AC23) so the ~10 questions spread across topics instead of being
 * dominated by large topics like Animals.
 */
export function buildRound4Questions(seed: string): DescribeAndChooseImageQuestion[] {
  const pool = generateDescribeAndChooseImageQuestions(ALL_WORDS);
  return stratifiedSample(pool, ROUND_4_QUESTION_COUNT, `round4-${seed}`);
}
