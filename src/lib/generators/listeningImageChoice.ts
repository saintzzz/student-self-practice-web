import type { ListeningImageChoiceQuestion, VocabWord } from '../../types';
import { pickDistinct, seededShuffleIndices } from '../prng';

/**
 * How many distinct-distractor variants to generate per word - same
 * combinatorial lever as imageChoice.ts (plan.md v3 "shuffled distractors").
 * Capped at 3 to stay curated rather than exploding into every possible
 * distractor combination.
 */
const VARIANTS_PER_WORD = 3;
const VARIANT_SEEDS = ['a', 'b', 'c'];

function buildVariant(
  word: VocabWord,
  topicWords: readonly VocabWord[],
  variantSeed: string,
): ListeningImageChoiceQuestion {
  // Excludes by emoji (not just word text) so the 4 rendered options are
  // guaranteed visually distinct even if two different words happen to
  // share an emoji somewhere else in the bank - the options ARE the emoji
  // here (unlike imageChoice.ts, where options are text), so emoji
  // collisions would otherwise silently produce a broken "pick 1 of 4".
  const distractors = pickDistinct(
    topicWords,
    (w) => w.emoji,
    [word.emoji],
    3,
    `${word.id}-lic-${variantSeed}`,
  );

  const candidateEmojis = [word.emoji, ...distractors.map((d) => d.emoji)];
  const order = seededShuffleIndices(4, `${word.id}-lic-${variantSeed}-order`);
  const options = order.map((originalIndex) => candidateEmojis[originalIndex]!) as [
    string,
    string,
    string,
    string,
  ];
  const correctIndex = order.indexOf(0) as 0 | 1 | 2 | 3;

  return {
    id: `q-lic-${word.id}-${variantSeed}`,
    topicId: word.topicId,
    kind: 'listening-image-choice',
    word: word.word,
    options,
    correctIndex,
    explanation: word.explanation,
  };
}

/**
 * Round 2 addition (plan.md v8 "Round 2 Addition: Listening Image-Choice").
 * TTS speaks the target word; the student picks the matching image (emoji)
 * from 4 options - no typing. Generated per-word, same shape as
 * generateImageChoiceQuestions, just with emoji options instead of text
 * options (the direction is reversed: audio prompt, image answer).
 */
export function generateListeningImageChoiceQuestions(
  topicWords: readonly VocabWord[],
): ListeningImageChoiceQuestion[] {
  const questions: ListeningImageChoiceQuestion[] = [];

  for (const word of topicWords) {
    const variantCount = Math.min(VARIANTS_PER_WORD, VARIANT_SEEDS.length);
    for (let i = 0; i < variantCount; i++) {
      questions.push(buildVariant(word, topicWords, VARIANT_SEEDS[i]!));
    }
  }

  return questions;
}
