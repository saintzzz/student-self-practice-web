import { seededPickN } from '../lib/prng';
import { getWordsByGrade } from '../data/vocabulary';
import { isLiteralImageWord } from '../lib/content/imageSemantics';
import { generateImageChoiceQuestions } from '../lib/generators/imageChoice';
import { generateListeningImageChoiceQuestions } from '../lib/generators/listeningImageChoice';
import type {
  ImageChoiceQuestion,
  ListeningImageChoiceQuestion,
  VocabWord,
} from '../types';

/**
 * CR-83 QuestionSource adapters - games draw from the SAME vocabulary
 * pool + generators the Batch and Exam use, just seeded per play so a
 * replay is a fresh draw. No separate game question format exists; every
 * round object is a real `Question` union member.
 */

/** Literal-emoji words only - every game shows the picture, so figurative
 *  entries (📹 for "vlog") would be unanswerable, same rule as generators. */
function gameWordPool(gradeId: string): VocabWord[] {
  return getWordsByGrade(gradeId).filter(isLiteralImageWord);
}

/** Seeded pick of `n` usable words for a run. */
export function pickGameWords(gradeId: string, seed: string, n: number): VocabWord[] {
  return seededPickN(gameWordPool(gradeId), n, `${seed}:words`);
}

/**
 * `n` picture->word MCQ rounds (Racing/Tic-tac-toe). The generator gets
 * the full grade pool for fair distractors; we then pick one variant per
 * seeded word so each round has a distinct prompt word.
 */
export function imageChoiceRounds(
  gradeId: string,
  seed: string,
  n: number,
): ImageChoiceQuestion[] {
  const pool = gameWordPool(gradeId);
  const all = generateImageChoiceQuestions(pool as VocabWord[]);
  const words = seededPickN(pool, Math.min(n, pool.length), `${seed}:ic-words`);
  return words
    .map((w) => all.find((q) => q.wordId === w.id))
    .filter((q): q is ImageChoiceQuestion => !!q);
}

/** `n` audio->picture rounds (Balloon Pop). Same per-word slicing. */
export function listeningImageRounds(
  gradeId: string,
  seed: string,
  n: number,
): ListeningImageChoiceQuestion[] {
  const pool = gameWordPool(gradeId);
  const all = generateListeningImageChoiceQuestions(pool);
  const words = seededPickN(pool, Math.min(n, pool.length), `${seed}:lic-words`);
  return words
    .map((w) => all.find((q) => q.word === w.word))
    .filter((q): q is ListeningImageChoiceQuestion => !!q);
}

/**
 * `n` spellable words for Letter Catch - single alphabetic word, capped
 * length so bubbles fit the strip (G1-2 shorter, G3-5 longer).
 */
export function spellableWords(gradeId: string, seed: string, n: number): VocabWord[] {
  const isG12 = gradeId === 'grade-1' || gradeId === 'grade-2';
  const maxLen = isG12 ? 6 : 8;
  const pool = gameWordPool(gradeId).filter(
    (w) => /^[a-zA-Z]+$/.test(w.word) && w.word.length >= 3 && w.word.length <= maxLen,
  );
  return seededPickN(pool, Math.min(n, pool.length), `${seed}:spell`);
}
