import type { ListeningSentenceFillBlankQuestion } from '../../types';
import { ALL_WORDS } from '../../data/vocabulary';
import { generateListeningSentenceFillBlankQuestions } from '../generators/listeningSentenceFillBlank';
import { stratifiedSample } from './stratifiedSample';

/** "About 10 questions" per Round, per plan.md v5. */
export const ROUND_2_QUESTION_COUNT = 10;

/**
 * Round 2 - Listening Sentence Fill-Blank (plan.md v5 "Round 2"). Draws
 * from the WHOLE vocabulary pool (ALL_WORDS), not a single topic, same as
 * Round 1. A fresh `seed` per Batch samples a different ~10-question slice
 * each time so repeated batches vary.
 *
 * Sampling is stratified by topic (plan.md v6 "Topic-Balanced Sampling",
 * AC23) so the ~10 questions spread across topics instead of being
 * dominated by large topics like Animals.
 */
export function buildRound2Questions(seed: string): ListeningSentenceFillBlankQuestion[] {
  const pool = generateListeningSentenceFillBlankQuestions(ALL_WORDS);
  return stratifiedSample(pool, ROUND_2_QUESTION_COUNT, `round2-${seed}`);
}
