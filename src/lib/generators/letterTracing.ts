import type { LetterTracingQuestion, VocabWord } from '../../types';
import { GLYPH_STROKES } from '../../data/tracing/strokes';
import { seededPickN, seededShuffleIndices } from '../prng';

/**
 * CR-82 (DESIGN-SPEC-v5 s12.2, ARCHITECTURE-v5 D-02): letter-tracing items
 * for the G1-2 letter round. Scope is the 26 lowercase letters only - a
 * letter is eligible only when the grade pool holds at least one word that
 * starts with it AND has a usable visual (emoji or an approved image).
 * The example word is the first such word in seeded order (D-02), so the
 * same batch seed always picks the same exhibit.
 */

/** Letters the grade pool can actually exhibit, in seeded order. */
export function traceableLettersFor(words: readonly VocabWord[], seed: string): string[] {
  const order = seededShuffleIndices(words.length, `tracing-pool-${seed}`);
  const letters: string[] = [];
  for (const letter of Object.keys(GLYPH_STROKES)) {
    const hit = order.some((i) => {
      const w = words[i]!;
      const first = w.word.trim().charAt(0).toLowerCase();
      return first === letter && (!!w.emoji || !!w.imageUrl);
    });
    if (hit) letters.push(letter);
  }
  return letters;
}

function exampleWordFor(letter: string, words: readonly VocabWord[], seed: string): VocabWord | null {
  const order = seededShuffleIndices(words.length, `tracing-word-${letter}-${seed}`);
  for (const i of order) {
    const w = words[i]!;
    if (w.word.trim().charAt(0).toLowerCase() === letter && (!!w.emoji || !!w.imageUrl)) {
      return w;
    }
  }
  return null;
}

/**
 * Build up to `count` tracing questions for this batch seed. Each letter
 * appears at most once. `explanation` names the exhibit word; the spec's
 * example shape ('Chữ "a" như trong "apple" - quả táo.') assumed a bare
 * gloss field that VocabWord does not carry - the bank stores full
 * sentences, so the word itself is named and the bank sentence is not
 * repeated (logged in MEMORY).
 */
export function generateLetterTracingQuestions(
  words: readonly VocabWord[],
  seed: string,
  grade: 1 | 2,
  count = 2,
): LetterTracingQuestion[] {
  const letters = seededPickN(traceableLettersFor(words, seed), count, `tracing-pick-${seed}`);
  const questions: LetterTracingQuestion[] = [];
  for (const letter of letters) {
    const example = exampleWordFor(letter, words, seed);
    if (!example) continue;
    questions.push({
      id: `tracing-${letter}-${seed}`,
      topicId: example.topicId,
      kind: 'letter-tracing',
      letter,
      exampleWordId: example.id,
      grade,
      explanation: `Chữ "${letter}" như trong từ "${example.word}".`,
    });
  }
  return questions;
}
