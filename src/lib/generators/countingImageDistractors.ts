import type { CountingImageOption, VocabWord } from '../../types';
import { hashString, pickDistinct } from '../prng';

const MIN_COUNT = 1;
const MAX_COUNT = 5;

function toOption(word: VocabWord, count: number): CountingImageOption {
  return { word: word.word, plural: word.plural ?? `${word.word}s`, emoji: word.emoji, count };
}

/**
 * Deterministically picks a count in [MIN_COUNT, MAX_COUNT] that is
 * guaranteed to differ from `correctCount` (offset is always non-zero mod
 * the range size, so the candidate can never land back on correctCount).
 */
export function pickWrongCount(correctCount: number, seed: string): number {
  const range = MAX_COUNT - MIN_COUNT + 1;
  const offset = (hashString(seed) % (range - 1)) + 1;
  return ((correctCount - MIN_COUNT + offset) % range) + MIN_COUNT;
}

/**
 * Builds the 3 distractors for one counting-image instance:
 * - same object, wrong count (AC12/AC13 "same-object-wrong-count distractor")
 * - a different object, the correct count (AC12/AC13 "wrong-object distractor")
 * - a different object again, a wrong count
 * All 4 resulting (word,count) pairs are guaranteed unique by construction.
 */
export function buildDistractorOptions(
  correctWord: VocabWord,
  correctCount: number,
  topicWords: VocabWord[],
  seedBase: string,
): {
  options: [CountingImageOption, CountingImageOption, CountingImageOption];
  wordIds: [string, string, string];
} {
  const sameObjectWrongCount = toOption(correctWord, pickWrongCount(correctCount, `${seedBase}-wc`));

  // Content audit 2026-10: a same-emoji distractor (ball/football share
  // ⚽) renders identical to the prompt - two right answers. Prefer a
  // different-emoji word; only fall back to a same-emoji one when the
  // pool has nothing else.
  const otherWords = pickDistinct(
    topicWords,
    (w) => w.word,
    [correctWord.word],
    Math.min(topicWords.length - 1, 8),
    `${seedBase}-wo`,
  ).sort((a, b) => Number(a.emoji === correctWord.emoji) - Number(b.emoji === correctWord.emoji)).slice(0, 2);
  const wordForRightCount = otherWords[0] ?? correctWord;
  const wordForWrongCount = otherWords[1] ?? wordForRightCount;

  const differentObjectRightCount = toOption(wordForRightCount, correctCount);
  const differentObjectWrongCount = toOption(
    wordForWrongCount,
    pickWrongCount(correctCount, `${seedBase}-wo-wc`),
  );

  return {
    options: [sameObjectWrongCount, differentObjectRightCount, differentObjectWrongCount],
    wordIds: [correctWord.id, wordForRightCount.id, wordForWrongCount.id],
  };
}
