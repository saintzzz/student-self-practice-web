import type { SpellTile } from '../../types';
import { seededShuffleIndices } from '../prng';

/**
 * CR-82 (DESIGN-SPEC-v5 s13.4, "Spell-it tile cap (rev 2, F7)"): one
 * deterministic rule per grade, derived from the slot-row floor - the
 * slot row must stay on ONE line with each slot >= 48px at the 375px
 * minimum viewport (6 slots -> 52px each, 7 -> 43px which fails the kid
 * non-standalone floor). Eligibility is decided once per item, before
 * render, by this pure function - never by viewport.
 */
export interface SpellEligibility {
  eligible: boolean;
  /** How many distractor letters join the bank (G1: 1 -> max 7 tiles,
   *  G2: 2 -> max 8 tiles). 0 when ineligible. */
  distractorCount: number;
}

/** Letters only, 2-6 characters - no space/hyphen/apostrophe (rev 2 cap). */
const SPELLABLE_PATTERN = /^[a-z]{2,6}$/;

export function spellEligibility(word: string, grade: 1 | 2): SpellEligibility {
  if (!SPELLABLE_PATTERN.test(word)) {
    return { eligible: false, distractorCount: 0 };
  }
  return { eligible: true, distractorCount: grade === 1 ? 1 : 2 };
}

/**
 * Visually confusable letter pairs (spec s13.4): a distractor must never
 * look like a correct letter, so when the word contains one half of a
 * pair the other half is excluded from the distractor pool.
 */
const CONFUSABLE_PAIRS: readonly (readonly [string, string])[] = [
  ['b', 'd'],
  ['p', 'q'],
  ['m', 'n'],
  ['i', 'l'],
];

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Builds the seeded Spell-it tile bank for one question (spec s13.4):
 * every letter of the word plus `distractorCount` distractors, shuffled
 * deterministically by `seed` (the question id, so retries are stable),
 * never presenting the word already spelled in order.
 */
export function buildSpellTiles(word: string, grade: 1 | 2, seed: string): readonly SpellTile[] {
  const eligibility = spellEligibility(word, grade);
  if (!eligibility.eligible) return [];

  const letterCounts = new Map<string, number>();
  const wordTiles: SpellTile[] = [...word].map((letter) => {
    const occurrence = letterCounts.get(letter) ?? 0;
    letterCounts.set(letter, occurrence + 1);
    return { id: `${letter}-${occurrence}`, letter };
  });

  const wordLetters = new Set(word);
  const excluded = new Set<string>();
  for (const [a, b] of CONFUSABLE_PAIRS) {
    if (wordLetters.has(a)) excluded.add(b);
    if (wordLetters.has(b)) excluded.add(a);
  }
  const distractorPool = [...ALPHABET].filter((letter) => !wordLetters.has(letter) && !excluded.has(letter));

  const pickedIndices = seededShuffleIndices(distractorPool.length, `${seed}-spell-distractors`);
  const distractorTiles: SpellTile[] = pickedIndices
    .slice(0, eligibility.distractorCount)
    .map((poolIndex, i) => ({ id: `${distractorPool[poolIndex]}-d${i}`, letter: distractorPool[poolIndex]! }));

  const tiles = [...wordTiles, ...distractorTiles];

  /* Shuffle guarantee (spec s13.4): the bank never presents the word
     already spelled in order - re-shuffle with the next seed step until
     it does not (a 2-letter word with 1 distractor can order-spell by
     chance ~1/6 of the time). */
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const order = seededShuffleIndices(tiles.length, attempt === 0 ? `${seed}-spell` : `${seed}-spell-${attempt}`);
    const shuffled = order.map((i) => tiles[i]!);
    if (shuffled.map((t) => t.letter).join('') !== word) {
      return shuffled;
    }
  }
  /* Astronomically unlikely 8 consecutive in-order shuffles; still
     deterministic - return the last shuffle rather than throw. */
  return seededShuffleIndices(tiles.length, `${seed}-spell-final`).map((i) => tiles[i]!);
}
