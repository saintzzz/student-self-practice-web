import type {
  ListeningFillBlankQuestion,
  ListeningImageChoiceQuestion,
  ListeningSentenceFillBlankQuestion,
  VocabWord,
} from '../../types';
import { generateListeningSentenceFillBlankQuestions } from '../generators/listeningSentenceFillBlank';
import { generateListeningImageChoiceQuestions } from '../generators/listeningImageChoice';
import { generateListeningFillBlankQuestions } from '../generators/listeningFillBlank';
import { seededShuffleIndices } from '../prng';
import { stratifiedSample } from './stratifiedSample';
import { buildSpellTiles, spellEligibility } from './spellEligibility';
import { pickGapBank } from './gapBankValidator';

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

/**
 * CR-82 (ARCHITECTURE-v5 D-01 ruling B): the G1-2 Round 2 composition -
 * 3 listening-image-choice + 4 listening-sentence-fill-blank + 3
 * Spell-it listening-fill-blank (eligible words only). Spell-it is a
 * listening task so it lives in the listening round; the round still has
 * exactly 10 questions so points/max-points/timer contracts are
 * unchanged and typing load drops from 5 to 4 items for pre-writers.
 */
export const ROUND_2_G12_IMAGE_CHOICE_COUNT = 3;
export const ROUND_2_G12_SENTENCE_COUNT = 4;
export const ROUND_2_G12_SPELL_COUNT = 3;

export type Round2Question =
  | ListeningSentenceFillBlankQuestion
  | ListeningImageChoiceQuestion
  | ListeningFillBlankQuestion;

/**
 * Round 2 - Listening (plan.md v5 "Round 2 - Listening Sentence Fill-Blank",
 * v8 "Round 2 Addition: Listening Image-Choice"). Draws from the WHOLE
 * vocabulary pool (words), not a single topic, same as Round 1. A fresh
 * `seed` per Batch samples a different ~10-question slice each time so
 * repeated batches vary.
 *
 * Both question kinds are drawn independently via `stratifiedSample`
 * (plan.md v6 "Topic-Balanced Sampling", AC23) so each kind's own slice
 * spreads across topics instead of being dominated by large topics like
 * Animals - then the two slices are combined and shuffled together so the
 * kinds interleave within the Round instead of appearing as two blocks.
 *
 * CR-82 (D-04/D-01): `ctx.gradeId` 'grade-1'|'grade-2' switches to the
 * G1-2 composition and bakes the play payloads - `spell` tiles via
 * buildSpellTiles on the 3 Spell-it items and `bank` via pickGapBank on
 * any sentence item whose distractor pair passes the s13.5 validator.
 * Without ctx (or G3-5) the mix and payloads stay byte-identical to v8.
 */
export function buildRound2Questions(
  seed: string,
  words: readonly VocabWord[],
  ctx?: { gradeId: string },
): Round2Question[] {
  const grade = ctx?.gradeId === 'grade-1' ? 1 : ctx?.gradeId === 'grade-2' ? 2 : null;

  const typingPool = generateListeningSentenceFillBlankQuestions(words);
  const imageChoicePool = generateListeningImageChoiceQuestions(words);

  if (grade === null) {
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

  /* ---- G1-2 (D-01 B) ---- */

  /* Spell-it slice: eligible words only (spec s13.4 cap). When the grade
     pool yields fewer than 3 eligible words the builder backfills with
     the round's original kind (listening-sentence-fill-blank) so the
     round still carries 10 items - it is never short. */
  const spellPool = generateListeningFillBlankQuestions(words).filter(
    (q) => spellEligibility(q.word, grade).eligible,
  );
  const spellPick = stratifiedSample(spellPool, ROUND_2_G12_SPELL_COUNT, `round2-spell-${seed}`);
  const spellQuestions: ListeningFillBlankQuestion[] = spellPick.map((q) => ({
    ...q,
    spell: { tiles: buildSpellTiles(q.word, grade, q.id) },
  }));
  const sentenceCount = ROUND_2_G12_SENTENCE_COUNT + (ROUND_2_G12_SPELL_COUNT - spellPick.length);

  /* Sentence slice: attach a validated word bank where the s13.5 walk
     finds a fair pair; failing items stay typed-only (bank absent). */
  const sentenceQuestions: ListeningSentenceFillBlankQuestion[] = stratifiedSample(
    typingPool,
    sentenceCount,
    `round2-typing-${seed}`,
  ).map((q) => {
    const bank = pickGapBank(q, words, q.id);
    return bank ? { ...q, bank } : q;
  });

  const imageChoiceQuestions = stratifiedSample(
    imageChoicePool,
    ROUND_2_G12_IMAGE_CHOICE_COUNT,
    `round2-imgchoice-${seed}`,
  );

  const combined: Round2Question[] = [...sentenceQuestions, ...spellQuestions, ...imageChoiceQuestions];
  const order = seededShuffleIndices(combined.length, `round2-mix-${seed}`);
  return order.map((i) => combined[i]!);
}
