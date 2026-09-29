import type {
  DescribeAndChooseImageQuestion,
  PhonicsSoundChoiceQuestion,
  PhonicsWordChoiceQuestion,
  PicturePairMatchingQuestion,
} from '../../types';
import { ALL_WORDS } from '../../data/vocabulary';
import { generateDescribeAndChooseImageQuestions } from '../generators/describeAndChooseImage';
import { generatePicturePairMatchingBoards } from '../generators/picturePairMatching';
import { generatePhonicsSoundChoiceQuestions, generatePhonicsWordChoiceQuestions } from '../generators/phonics';
import { seededShuffleIndices } from '../prng';
import { stratifiedSample } from './stratifiedSample';

/** "About 10 questions" per Round, per plan.md v5. */
export const ROUND_4_QUESTION_COUNT = 10;

/**
 * Round 4 mix (plan.md v8 pair-matching + CR-03 phonics, human ruling
 * D-Ph3): ~3 pair-matching boards + ~4 describe-and-choose-image + ~3
 * phonics questions (2 sound-choice + 1 word-choice) out of ~10. Boards
 * stay a minority share (heavier interaction), and both phonics directions
 * appear in every Round for balanced exposure.
 */
export const ROUND_4_PAIR_MATCHING_COUNT = 3;
export const ROUND_4_DESCRIBE_COUNT = 4;
export const ROUND_4_PHONICS_SOUND_COUNT = 2;
export const ROUND_4_PHONICS_WORD_COUNT = 1;

export type Round4Question =
  | DescribeAndChooseImageQuestion
  | PicturePairMatchingQuestion
  | PhonicsSoundChoiceQuestion
  | PhonicsWordChoiceQuestion;

/**
 * Round 4 - Describe and Choose Image + Picture-Pair-Matching + Phonics
 * (plan.md v5/v8 + CR-03). Draws from the WHOLE vocabulary pool
 * (ALL_WORDS), not a single topic, same as every other Round. A fresh
 * `seed` per Batch samples a different ~10-question slice each time so
 * repeated batches vary.
 *
 * Each kind is drawn independently via `stratifiedSample` (plan.md v6
 * "Topic-Balanced Sampling", AC23) so every slice spreads across topics -
 * then all slices are combined and shuffled together so the kinds
 * interleave within the Round (same pattern as round2ListeningSentence).
 */
export function buildRound4Questions(seed: string): Round4Question[] {
  const describePool = generateDescribeAndChooseImageQuestions(ALL_WORDS);
  const pairMatchingPool = generatePicturePairMatchingBoards(ALL_WORDS);
  const phonicsSoundPool = generatePhonicsSoundChoiceQuestions(ALL_WORDS);
  const phonicsWordPool = generatePhonicsWordChoiceQuestions(ALL_WORDS);

  const describeQuestions = stratifiedSample(describePool, ROUND_4_DESCRIBE_COUNT, `round4-describe-${seed}`);
  const pairMatchingQuestions = stratifiedSample(
    pairMatchingPool,
    ROUND_4_PAIR_MATCHING_COUNT,
    `round4-pairmatch-${seed}`,
  );
  const phonicsQuestions: Round4Question[] = [
    ...stratifiedSample(phonicsSoundPool, ROUND_4_PHONICS_SOUND_COUNT, `round4-phonics-sound-${seed}`),
    ...stratifiedSample(phonicsWordPool, ROUND_4_PHONICS_WORD_COUNT, `round4-phonics-word-${seed}`),
  ];

  const combined: Round4Question[] = [...describeQuestions, ...pairMatchingQuestions, ...phonicsQuestions];
  const order = seededShuffleIndices(combined.length, `round4-mix-${seed}`);
  return order.map((i) => combined[i]!);
}
