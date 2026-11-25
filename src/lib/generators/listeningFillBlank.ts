import type { ListeningFillBlankQuestion, VocabWord } from '../../types';

/**
 * One instance per word - unlike image-choice/counting-image there is no
 * options set to combinatorially vary (it is "hear the word, type the
 * word"), so generating more than one per word would just be a duplicate.
 * Padding this would be exactly the fabrication mvp-decisions.md warns
 * against, so this generator intentionally does not multiply.
 */
/**
 * CR-144 (teacher audit C1): typed answers must be ASCII-typable. Words
 * like "piñata"/"Åland" keep ñ/Å through normalizeAnswer, so a child
 * typing "pinata" could never be marked correct. Choice-based kinds
 * (image-choice, missing-letter) still teach these words - only the
 * type-the-answer generators exclude them.
 */
export const TYPEABLE_WORD = /^[a-zA-Z][a-zA-Z' -]*$/;

export function generateListeningFillBlankQuestions(
  topicWords: readonly VocabWord[],
): ListeningFillBlankQuestion[] {
  return topicWords.filter((word) => TYPEABLE_WORD.test(word.word)).map((word) => ({
    id: `q-lfb-${word.id}`,
    topicId: word.topicId,
    kind: 'listening-fill-blank' as const,
    word: word.word,
    explanation: word.explanation,
  }));
}
