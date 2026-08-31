import type { PronunciationRecordingQuestion, VocabWord } from '../../types';

/**
 * Round 3 - Pronunciation Recording (plan.md v5 "Round 3 - Pronunciation
 * Recording"). Unlike Round 1/2's generators, there is no combinatorial
 * variant-per-word lever here (no letter positions, no sentence templates)
 * - the word itself is both the prompt shown on screen and the thing the
 * student reads aloud, so one question instance per word is the whole pool.
 * Topic-balanced selection of ~10 out of the full pool happens one layer up
 * in round3Pronunciation.ts via stratifiedSample.
 */
export function generatePronunciationRecordingQuestions(
  words: readonly VocabWord[],
): PronunciationRecordingQuestion[] {
  return words.map((word) => ({
    id: `q-pr-${word.id}`,
    topicId: word.topicId,
    kind: 'pronunciation-recording',
    word: word.word,
    explanation: word.explanation,
  }));
}
