import type { PronunciationRecordingQuestion } from '../../types';
import { ALL_WORDS } from '../../data/vocabulary';
import { generatePronunciationRecordingQuestions } from '../generators/pronunciationRecording';
import { stratifiedSample } from './stratifiedSample';

/** "About 10 questions" per Round, per plan.md v5. */
export const ROUND_3_QUESTION_COUNT = 10;

/**
 * Round 3 - Pronunciation Recording (plan.md v5 "Round 3", v6 "Build
 * Scope"). Draws from the WHOLE vocabulary pool (ALL_WORDS), not a single
 * topic, same as Round 1/2. A fresh `seed` per Batch samples a different
 * ~10-question slice each time so repeated batches vary.
 *
 * Sampling is stratified by topic (plan.md v6 "Topic-Balanced Sampling",
 * AC23) so the ~10 questions spread across topics instead of being
 * dominated by large topics like Animals.
 */
export function buildRound3Questions(seed: string): PronunciationRecordingQuestion[] {
  const pool = generatePronunciationRecordingQuestions(ALL_WORDS);
  return stratifiedSample(pool, ROUND_3_QUESTION_COUNT, `round3-${seed}`);
}
