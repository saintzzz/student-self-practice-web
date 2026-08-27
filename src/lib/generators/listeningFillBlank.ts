import type { ListeningFillBlankQuestion, VocabWord } from '../../types';

/**
 * One instance per word - unlike image-choice/counting-image there is no
 * options set to combinatorially vary (it is "hear the word, type the
 * word"), so generating more than one per word would just be a duplicate.
 * Padding this would be exactly the fabrication mvp-decisions.md warns
 * against, so this generator intentionally does not multiply.
 */
export function generateListeningFillBlankQuestions(
  topicWords: VocabWord[],
): ListeningFillBlankQuestion[] {
  return topicWords.map((word) => ({
    id: `q-lfb-${word.id}`,
    topicId: word.topicId,
    kind: 'listening-fill-blank' as const,
    word: word.word,
    explanation: word.explanation,
  }));
}
