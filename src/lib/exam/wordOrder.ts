import type { WordOrderQuestion } from '../../types/exam';
import type { VocabWord } from '../../types';
import { seededShuffleIndices } from '../prng';
import { sentencesForWord } from '../generators/listeningSentenceFillBlank';

const MIN_TOKENS = 4;
const MAX_TOKENS = 8;
/** CR-26 - authored sentences may run longer (real IOE reorders hit
 * 9-10 words); template sentences stay capped at MAX_TOKENS. */
const AUTHORED_MAX_TOKENS = 10;

/** Splits into tap tiles, keeping punctuation glued to its word. */
export function tokenizeSentence(sentence: string): string[] {
  return sentence.trim().split(/\s+/);
}

/**
 * Shuffles token order deterministically; retries seeded variants until
 * the scrambled order differs from the original (a "shuffled" sentence
 * that lands in the correct order would be a free point).
 */
function scramble(tokens: readonly string[], seed: string): string[] {
  for (let attempt = 0; attempt < 8; attempt++) {
    const order = seededShuffleIndices(tokens.length, `${seed}-wo-${attempt}`);
    const tiles = order.map((i) => tokens[i]!);
    if (tiles.join(' ') !== tokens.join(' ')) {
      return tiles;
    }
  }
  // Sentences with many identical tokens can refuse to shuffle (e.g.
  // "I I I"); fall back to a rotated order which can never equal the
  // original for n > 1 unless all tokens are identical.
  return [...tokens.slice(1), tokens[0]!];
}

/**
 * One word-order question per word/template pair, built on the same
 * curated sentence bank as listening-sentence-fill-blank so generated
 * sentences are guaranteed grammatical.
 */
export function generateWordOrderQuestions(words: readonly VocabWord[]): WordOrderQuestion[] {
  const questions: WordOrderQuestion[] = [];

  for (const word of words) {
    const sentences = sentencesForWord(word);
    sentences.forEach((sentence, index) => {
      const tokens = tokenizeSentence(sentence);
      if (tokens.length < MIN_TOKENS || tokens.length > MAX_TOKENS) {
        return;
      }
      const tiles = scramble(tokens, `${word.id}-${index}`);
      questions.push({
        id: `q-wo-${word.id}-${index}`,
        topicId: word.topicId,
        kind: 'word-order',
        sentence,
        tiles,
        explanation: `Sắp xếp đúng: "${sentence}" ${word.explanation}`,
      });
    });
  }

  return questions;
}

export function isWordOrderCorrect(sentence: string, pickedTokens: readonly string[]): boolean {
  return pickedTokens.join(' ') === sentence;
}

/**
 * CR-26 - authored reorder sentences for grade 3+ (reorderBank). Real
 * IOE reorders are longer and use grammar the word templates never
 * reach, so these take the authored slot in the word-order quota.
 */
export function generateAuthoredWordOrderQuestions(
  gradeId: string,
  sentences: readonly string[],
): WordOrderQuestion[] {
  const questions: WordOrderQuestion[] = [];
  sentences.forEach((sentence, index) => {
    const tokens = tokenizeSentence(sentence);
    if (tokens.length < MIN_TOKENS || tokens.length > AUTHORED_MAX_TOKENS) {
      return;
    }
    const tiles = scramble(tokens, `${gradeId}-authored-${index}`);
    questions.push({
      id: `q-wo-a-${gradeId}-${index}`,
      topicId: 'reorder',
      kind: 'word-order',
      sentence,
      tiles,
      explanation: `Sắp xếp đúng: "${sentence}"`,
    });
  });
  return questions;
}
