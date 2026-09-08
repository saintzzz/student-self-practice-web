import type { ExtraLetterQuestion, VocabWord } from '../../types';
import { hashString } from '../prng';
import { COMMON_ENGLISH_WORDS } from '../../data/commonEnglishWords';

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

/**
 * True if inserting `extraLetter` at `pos` would make the puzzle ambiguous:
 * removing some OTHER tile (not the intended extra one) would also spell a
 * real, commonly-known English word, different from `correctWord` - e.g.
 * inserting "t" before "pear" makes "tpear", where removing the "p" instead
 * of the "t" spells "tear", an equally-valid answer a student has no way to
 * rule out from the letters alone. Checked against COMMON_ENGLISH_WORDS
 * (not the full dictionary) so only collisions a 7-year-old could plausibly
 * stumble into block a candidate, not obscure/rare words.
 */
function createsAmbiguity(chars: string[], pos: number, extraLetter: string, correctWord: string): boolean {
  const withExtra = [...chars.slice(0, pos), extraLetter, ...chars.slice(pos)];

  for (let i = 0; i < withExtra.length; i++) {
    if (i === pos) continue; // the intended removal - always recovers correctWord, never ambiguous
    const candidate = withExtra.slice(0, i).concat(withExtra.slice(i + 1)).join('');
    if (candidate !== correctWord && COMMON_ENGLISH_WORDS.has(candidate)) {
      return true;
    }
  }

  return false;
}

/**
 * Returns null if every letter in EXTRA_LETTER_POOL would create an
 * ambiguous puzzle at this position (rare) - callers must skip the variant
 * entirely rather than fall back to a known-ambiguous choice.
 */
function pickExtraLetter(chars: string[], pos: number, correctWord: string, seed: string): string | null {
  const neighborBefore = pos > 0 ? chars[pos - 1]! : null;
  const neighborAfter = pos < chars.length ? chars[pos]! : null;
  const startIndex = hashString(seed) % EXTRA_LETTER_POOL.length;

  for (let i = 0; i < EXTRA_LETTER_POOL.length; i++) {
    const candidate = EXTRA_LETTER_POOL[(startIndex + i) % EXTRA_LETTER_POOL.length]!;
    if (
      candidate !== neighborBefore &&
      candidate !== neighborAfter &&
      !createsAmbiguity(chars, pos, candidate, correctWord)
    ) {
      return candidate;
    }
  }

  return null;
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

  const variants: ExtraLetterVariant[] = [];
  for (const [i, pos] of positions.entries()) {
    const extraLetter = pickExtraLetter(chars, pos, word, `${word}-${pos}-${i}`);
    if (extraLetter === null) {
      // Every candidate letter at this position would create a real,
      // commonly-known alternate word (e.g. "pear" -> "tpear"/"tear") -
      // drop this variant rather than ship an ambiguous question.
      continue;
    }
    const displayLetters = [...chars.slice(0, pos), extraLetter, ...chars.slice(pos)];
    variants.push({ displayLetters, extraIndex: pos, extraLetter });
  }

  return variants;
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
