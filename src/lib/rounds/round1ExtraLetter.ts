import type { ExtraLetterQuestion } from '../../types';
import { ALL_WORDS } from '../../data/vocabulary';
import { generateExtraLetterQuestions } from '../generators/extraLetter';
import { seededPickN } from '../prng';

/** "About 10 questions" per Round, per plan.md v5. */
export const ROUND_1_QUESTION_COUNT = 10;

/**
 * Round 1 - Extra Letter (plan.md v5 "Round 1 - Extra Letter", reused as-is
 * from the v3/v4 extra-letter generator). Draws from the WHOLE vocabulary
 * pool (ALL_WORDS), not a single topic - a Batch is topic-agnostic. The
 * generator itself already produces a large multi-variant-per-word pool; a
 * fresh `seed` per Batch samples a different ~10-question slice each time.
 */
export function buildRound1Questions(seed: string): ExtraLetterQuestion[] {
  const pool = generateExtraLetterQuestions([...ALL_WORDS]);
  return seededPickN(pool, ROUND_1_QUESTION_COUNT, `round1-${seed}`);
}
