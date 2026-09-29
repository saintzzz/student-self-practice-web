import type { ExtraLetterQuestion, ImageChoiceQuestion } from '../../types';
import { ALL_WORDS } from '../../data/vocabulary';
import { generateExtraLetterQuestions } from '../generators/extraLetter';
import { generateImageChoiceQuestions } from '../generators/imageChoice';
import { seededShuffleIndices } from '../prng';
import { stratifiedSample } from './stratifiedSample';

/** "About 10 questions" per Round, per plan.md v5. */
export const ROUND_1_QUESTION_COUNT = 10;

/**
 * Round 1 mix (docs/sdlc/prd.md US-9, ruling D-10 A): 7 spelling questions
 * (extra-letter) plus 3 picture questions (image-choice) so the live batch
 * exposes the single-image visual path every Round.
 */
export const ROUND_1_EXTRA_LETTER_COUNT = 7;
export const ROUND_1_IMAGE_CHOICE_COUNT = 3;

export type Round1Question = ExtraLetterQuestion | ImageChoiceQuestion;

/**
 * Round 1 - mixed spelling + picture choice. Draws from the WHOLE
 * vocabulary pool (ALL_WORDS), not a single topic - a Batch is
 * topic-agnostic. Each kind's slice is stratified by topic (plan.md v6
 * "Topic-Balanced Sampling", AC23), then the two slices are shuffled
 * together via the same seeded RNG Round 2 uses, so the kinds interleave
 * within the Round (D-10 A) instead of appearing as two blocks.
 */
export function buildRound1Questions(seed: string): Round1Question[] {
  const extraLetterPool = generateExtraLetterQuestions([...ALL_WORDS]);
  const imageChoicePool = generateImageChoiceQuestions([...ALL_WORDS]);

  const extraLetter = stratifiedSample(
    extraLetterPool,
    ROUND_1_EXTRA_LETTER_COUNT,
    `round1-${seed}`,
  );
  const imageChoice = stratifiedSample(
    imageChoicePool,
    ROUND_1_IMAGE_CHOICE_COUNT,
    `round1-imgchoice-${seed}`,
  );

  const combined: Round1Question[] = [...extraLetter, ...imageChoice];
  return seededShuffleIndices(combined.length, `round1-mix-${seed}`).map((i) => combined[i]!);
}
