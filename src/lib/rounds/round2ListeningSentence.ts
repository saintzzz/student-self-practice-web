import type { ListeningImageChoiceQuestion, ListeningSentenceFillBlankQuestion } from '../../types';
import { ALL_WORDS } from '../../data/vocabulary';
import { generateListeningSentenceFillBlankQuestions } from '../generators/listeningSentenceFillBlank';
import { generateListeningImageChoiceQuestions } from '../generators/listeningImageChoice';
import { seededShuffleIndices } from '../prng';
import { stratifiedSample } from './stratifiedSample';

/** "About 10 questions" per Round, per plan.md v5. */
export const ROUND_2_QUESTION_COUNT = 10;

/**
 * Round 2 mix ratio (plan.md v8 "Round 2 Addition: Listening Image-Choice"):
 * an even 5/5 split between the original typing kind
 * (listening-sentence-fill-blank) and the new no-typing kind
 * (listening-image-choice). The plan calls for "roughly even" (suggesting
 * ~5-6 / ~4-5) - 5/5 is the simplest even split and treats both formats as
 * equally weighted practice, since the research finding behind this addition
 * (research-v5-ioe-formats.json) rates "listen and choose the picture" as at
 * least as commonly-tested as typing-based listening, not a minor variant.
 */
export const ROUND_2_IMAGE_CHOICE_COUNT = 5;
export const ROUND_2_TYPING_COUNT = ROUND_2_QUESTION_COUNT - ROUND_2_IMAGE_CHOICE_COUNT;

export type Round2Question = ListeningSentenceFillBlankQuestion | ListeningImageChoiceQuestion;

/**
 * Round 2 - Listening (plan.md v5 "Round 2 - Listening Sentence Fill-Blank",
 * v8 "Round 2 Addition: Listening Image-Choice"). Draws from the WHOLE
 * vocabulary pool (ALL_WORDS), not a single topic, same as Round 1. A fresh
 * `seed` per Batch samples a different ~10-question slice each time so
 * repeated batches vary.
 *
 * Both question kinds are drawn independently via `stratifiedSample`
 * (plan.md v6 "Topic-Balanced Sampling", AC23) so each kind's own slice
 * spreads across topics instead of being dominated by large topics like
 * Animals - then the two slices are combined and shuffled together so the
 * kinds interleave within the Round instead of appearing as two blocks.
 */
export function buildRound2Questions(seed: string): Round2Question[] {
  const typingPool = generateListeningSentenceFillBlankQuestions(ALL_WORDS);
  const imageChoicePool = generateListeningImageChoiceQuestions(ALL_WORDS);

  const typingQuestions = stratifiedSample(typingPool, ROUND_2_TYPING_COUNT, `round2-typing-${seed}`);
  const imageChoiceQuestions = stratifiedSample(
    imageChoicePool,
    ROUND_2_IMAGE_CHOICE_COUNT,
    `round2-imgchoice-${seed}`,
  );

  const combined: Round2Question[] = [...typingQuestions, ...imageChoiceQuestions];
  const order = seededShuffleIndices(combined.length, `round2-mix-${seed}`);
  return order.map((i) => combined[i]!);
}
