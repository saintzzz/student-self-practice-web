import type { ExtraLetterQuestion, VocabWord } from '../../types';
import { hashString } from '../prng';

const MIN_LENGTH = 3;
const MAX_LENGTH = 7;
const MIN_VARIANTS = 2;
const MAX_VARIANTS = 4;
const EXTRA_LETTER_POOL = ['s', 'k', 't', 'p', 'm', 'r', 'n', 'l', 'd', 'g'];

export interface ExtraLetterVariant {
  displayLetters: string[];
  extraIndex: number;
  extraLetter: string;
}

function variantCountFor(wordLength: number): number {
  return Math.max(MIN_VARIANTS, Math.min(MAX_VARIANTS, wordLength - 2));
}

/** Spreads `count` insertion gaps (0..wordLength) evenly across the word. */
function pickInsertionPositions(wordLength: number, count: number): number[] {
  const positions = new Set<number>();
  const step = count > 1 ? wordLength / (count - 1) : wordLength / 2;

  for (let i = 0; i < count; i++) {
    positions.add(Math.min(Math.round(i * step), wordLength));
  }

  let candidate = 1;
  while (positions.size < count && candidate < wordLength) {
    positions.add(candidate);
    candidate++;
  }

  return Array.from(positions).sort((a, b) => a - b).slice(0, count);
}

function pickExtraLetter(neighborBefore: string | null, neighborAfter: string | null, seed: string): string {
  const startIndex = hashString(seed) % EXTRA_LETTER_POOL.length;

  for (let i = 0; i < EXTRA_LETTER_POOL.length; i++) {
    const candidate = EXTRA_LETTER_POOL[(startIndex + i) % EXTRA_LETTER_POOL.length]!;
    if (candidate !== neighborBefore && candidate !== neighborAfter) {
      return candidate;
    }
  }

  return EXTRA_LETTER_POOL[startIndex]!;
}

/**
 * Generates >= 2 letter-insertion variants for a single word (word must be
 * MIN_LENGTH-MAX_LENGTH letters). Every variant inserts exactly one extra
 * letter, so removing displayLetters[extraIndex] and joining the rest always
 * recovers the original word - this is the invariant unit tests assert.
 */
export function generateExtraLetterVariants(word: string): ExtraLetterVariant[] {
  if (word.length < MIN_LENGTH || word.length > MAX_LENGTH) {
    return [];
  }

  const chars = word.split('');
  const count = variantCountFor(word.length);
  const positions = pickInsertionPositions(word.length, count);

  return positions.map((pos, i) => {
    const neighborBefore = pos > 0 ? chars[pos - 1]! : null;
    const neighborAfter = pos < chars.length ? chars[pos]! : null;
    const extraLetter = pickExtraLetter(neighborBefore, neighborAfter, `${word}-${pos}-${i}`);
    const displayLetters = [...chars.slice(0, pos), extraLetter, ...chars.slice(pos)];
    return { displayLetters, extraIndex: pos, extraLetter };
  });
}

export function generateExtraLetterQuestions(topicWords: VocabWord[]): ExtraLetterQuestion[] {
  const questions: ExtraLetterQuestion[] = [];

  for (const word of topicWords) {
    const variants = generateExtraLetterVariants(word.word);
    variants.forEach((variant, i) => {
      questions.push({
        id: `q-el-${word.id}-${i}`,
        topicId: word.topicId,
        kind: 'extra-letter',
        correctWord: word.word,
        displayLetters: variant.displayLetters,
        extraIndex: variant.extraIndex,
        explanation: `${word.explanation} Chữ cái thừa là "${variant.extraLetter}".`,
      });
    });
  }

  return questions;
}
