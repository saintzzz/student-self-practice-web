import type { ListeningSentenceFillBlankQuestion } from '../../types';
import { ALL_WORDS } from '../../data/vocabulary';
import { generateListeningSentenceFillBlankQuestions } from '../generators/listeningSentenceFillBlank';
import { seededPickN } from '../prng';

/** "About 10 questions" per Round, per plan.md v5. */
export const ROUND_2_QUESTION_COUNT = 10;

/**
 * Round 2 - Listening Sentence Fill-Blank (plan.md v5 "Round 2"). Draws
 * from the WHOLE vocabulary pool (ALL_WORDS), not a single topic, same as
 * Round 1. A fresh `seed` per Batch samples a different ~10-question slice
 * each time so repeated batches vary.
 */
export function buildRound2Questions(seed: string): ListeningSentenceFillBlankQuestion[] {
  const pool = generateListeningSentenceFillBlankQuestions(ALL_WORDS);
  return seededPickN(pool, ROUND_2_QUESTION_COUNT, `round2-${seed}`);
}
