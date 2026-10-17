import type { ExtraLetterQuestion, ImageChoiceQuestion, LetterTracingQuestion, VocabWord } from '../../types';
import { generateExtraLetterQuestions } from '../generators/extraLetter';
import { generateImageChoiceQuestions } from '../generators/imageChoice';
import { generateLetterTracingQuestions } from '../generators/letterTracing';
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

/**
 * CR-82 (ARCHITECTURE-v5 D-01, ruling B): the G1-2 letter round swaps two
 * slots for letter tracing - 6 extra-letter + 2 image-choice + 2
 * `letter-tracing`, with the tracing items pinned at 0-based indices 3
 * and 7 (never the first question of a session - the first-encounter demo
 * needs a calm moment, spec s12.2). G3-5 keeps the legacy 7/3 mix.
 */
export const ROUND_1_G12_EXTRA_LETTER_COUNT = 6;
export const ROUND_1_G12_IMAGE_CHOICE_COUNT = 2;
export const ROUND_1_G12_TRACING_COUNT = 2;
/** 0-based positions the tracing items are spliced into after the seeded shuffle. */
export const ROUND_1_G12_TRACING_INDICES: readonly number[] = [3, 7];

export type Round1Question = ExtraLetterQuestion | ImageChoiceQuestion | LetterTracingQuestion;

function isG12Grade(gradeId: string | undefined): gradeId is 'grade-1' | 'grade-2' {
  return gradeId === 'grade-1' || gradeId === 'grade-2';
}

/**
 * Round 1 - mixed spelling + picture choice (+ tracing on G1-2). Draws
 * from the WHOLE vocabulary pool (words), not a single topic - a Batch is
 * topic-agnostic. Each kind's slice is stratified by topic (plan.md v6
 * "Topic-Balanced Sampling", AC23), then the slices are shuffled together
 * via the same seeded RNG Round 2 uses, so the kinds interleave within
 * the Round (D-10 A) instead of appearing as two blocks.
 *
 * G1-2 (D-01): if the pool yields fewer than 2 traceable letters the
 * missing slots are backfilled with extra-letter items from the same
 * generator pool so the Round still has exactly 10 questions.
 */
export function buildRound1Questions(
  seed: string,
  words: readonly VocabWord[],
  ctx?: { gradeId: string },
): Round1Question[] {
  const extraLetterPool = generateExtraLetterQuestions([...words]);
  const imageChoicePool = generateImageChoiceQuestions([...words]);

  if (!isG12Grade(ctx?.gradeId)) {
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

  const grade = ctx!.gradeId === 'grade-1' ? 1 : 2;
  const tracing = generateLetterTracingQuestions(words, seed, grade, ROUND_1_G12_TRACING_COUNT);
  /* D-01 backfill: a thin pool that cannot exhibit 2 letters fills the
     missing tracing slots with extra-letter items, never a short Round. */
  const extraLetterNeeded = ROUND_1_G12_EXTRA_LETTER_COUNT + (ROUND_1_G12_TRACING_COUNT - tracing.length);
  const extraLetter = stratifiedSample(extraLetterPool, extraLetterNeeded, `round1-${seed}`);
  const imageChoice = stratifiedSample(
    imageChoicePool,
    ROUND_1_G12_IMAGE_CHOICE_COUNT,
    `round1-imgchoice-${seed}`,
  );

  const combined: Round1Question[] = [...extraLetter, ...imageChoice];
  const shuffled = seededShuffleIndices(combined.length, `round1-mix-${seed}`).map((i) => combined[i]!);

  /* Splice tracing at the fixed indices - the seeded shuffle decides the
     non-tracing order, tracing lands exactly at 3 and 7. */
  const out = [...shuffled];
  tracing.forEach((q, i) => {
    out.splice(Math.min(ROUND_1_G12_TRACING_INDICES[i] ?? i, out.length), 0, q);
  });
  return out;
}
