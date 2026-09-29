import type {
  DescribeAndChooseImageQuestion,
  PhonicsBlendChoiceQuestion,
  PhonicsFinalChoiceQuestion,
  PhonicsRhymeChoiceQuestion,
  PhonicsSoundChoiceQuestion,
  PhonicsWordChoiceQuestion,
  PicturePairMatchingQuestion,
} from '../../types';
import { ALL_WORDS } from '../../data/vocabulary';
import { generateDescribeAndChooseImageQuestions } from '../generators/describeAndChooseImage';
import { generatePicturePairMatchingBoards } from '../generators/picturePairMatching';
import { generatePhonicsSoundChoiceQuestions, generatePhonicsWordChoiceQuestions } from '../generators/phonics';
import {
  generatePhonicsBlendChoiceQuestions,
  generatePhonicsFinalChoiceQuestions,
  generatePhonicsRhymeChoiceQuestions,
} from '../generators/phonicsDeep';
import { hashString, seededShuffleIndices } from '../prng';
import { stratifiedSample } from './stratifiedSample';

/** "About 10 questions" per Round, per plan.md v5. */
export const ROUND_4_QUESTION_COUNT = 10;

/**
 * Round 4 mix (plan.md v8 pair-matching + CR-03/CR-06 phonics, PRD section
 * 15 ruling 15.4): 3 pair-matching boards + 3 describe-and-choose-image +
 * 4 phonics out of ~10. The phonics block now spans all four sub-skills:
 * 1 initial sound + 1 word-choice + 1 final sound + 1 slot that ALTERNATES
 * between blend and rhyme per Batch (seed parity), so a child always meets
 * every phonics kind across two consecutive Rounds.
 */
export const ROUND_4_PAIR_MATCHING_COUNT = 3;
export const ROUND_4_DESCRIBE_COUNT = 3;
export const ROUND_4_PHONICS_SOUND_COUNT = 1;
export const ROUND_4_PHONICS_WORD_COUNT = 1;
export const ROUND_4_PHONICS_FINAL_COUNT = 1;

export type Round4Question =
  | DescribeAndChooseImageQuestion
  | PicturePairMatchingQuestion
  | PhonicsSoundChoiceQuestion
  | PhonicsWordChoiceQuestion
  | PhonicsFinalChoiceQuestion
  | PhonicsBlendChoiceQuestion
  | PhonicsRhymeChoiceQuestion;

/**
 * Round 4 - Describe and Choose Image + Picture-Pair-Matching + Phonics
 * (plan.md v5/v8 + CR-03/CR-06). Draws from the WHOLE vocabulary pool
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
  const phonicsFinalPool = generatePhonicsFinalChoiceQuestions(ALL_WORDS);
  const phonicsBlendPool = generatePhonicsBlendChoiceQuestions(ALL_WORDS);
  const phonicsRhymePool = generatePhonicsRhymeChoiceQuestions(ALL_WORDS);

  const describeQuestions = stratifiedSample(describePool, ROUND_4_DESCRIBE_COUNT, `round4-describe-${seed}`);
  const pairMatchingQuestions = stratifiedSample(
    pairMatchingPool,
    ROUND_4_PAIR_MATCHING_COUNT,
    `round4-pairmatch-${seed}`,
  );

  // CR-06 slot 4: alternate blend vs rhyme by seed parity. If the chosen
  // pool is ever empty, fall back to the other (pools are derived from the
  // same bank, so both-empty is the only "skip the slot" case).
  const blendPool = stratifiedSample(phonicsBlendPool, 1, `round4-phonics-blend-${seed}`);
  const rhymePool = stratifiedSample(phonicsRhymePool, 1, `round4-phonics-rhyme-${seed}`);
  const altIsBlend = hashString(`round4-phonics-alt-${seed}`) % 2 === 0;
  const alternated = (altIsBlend ? blendPool : rhymePool).length > 0
    ? altIsBlend
      ? blendPool
      : rhymePool
    : altIsBlend
      ? rhymePool
      : blendPool;

  const phonicsQuestions: Round4Question[] = [
    ...stratifiedSample(phonicsSoundPool, ROUND_4_PHONICS_SOUND_COUNT, `round4-phonics-sound-${seed}`),
    ...stratifiedSample(phonicsWordPool, ROUND_4_PHONICS_WORD_COUNT, `round4-phonics-word-${seed}`),
    ...stratifiedSample(phonicsFinalPool, ROUND_4_PHONICS_FINAL_COUNT, `round4-phonics-final-${seed}`),
    ...alternated,
  ];

  const combined: Round4Question[] = [...describeQuestions, ...pairMatchingQuestions, ...phonicsQuestions];
  const order = seededShuffleIndices(combined.length, `round4-mix-${seed}`);
  return order.map((i) => combined[i]!);
}
