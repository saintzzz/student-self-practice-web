import type { ListeningImageChoiceQuestion, VocabWord } from '../../types';
import { isLiteralImageWord } from '../content/imageSemantics';
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

  const candidateWords = [word, ...distractors];
  const order = seededShuffleIndices(4, `${word.id}-lic-${variantSeed}-order`);
  const options = order.map((originalIndex) => candidateWords[originalIndex]!.emoji) as [
    string,
    string,
    string,
    string,
  ];
  const optionWordIds = order.map((originalIndex) => candidateWords[originalIndex]!.id) as [
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
    optionWordIds,
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

  // CR-24: figurative-emoji words are dropped as BOTH prompts and
  // distractors - a 🏮 option meaning "mid-autumn" would collide with a
  // "lantern" prompt and make the question ambiguous.
  const literalWords = topicWords.filter(isLiteralImageWord);
  for (const word of literalWords) {
    const variantCount = Math.min(VARIANTS_PER_WORD, VARIANT_SEEDS.length);
    for (let i = 0; i < variantCount; i++) {
      questions.push(buildVariant(word, literalWords, VARIANT_SEEDS[i]!));
    }
  }

  return questions;
}
