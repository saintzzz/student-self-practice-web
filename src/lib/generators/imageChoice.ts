import type { ImageChoiceQuestion, VocabWord } from '../../types';
import { pickDistinct, seededShuffleIndices } from '../prng';

/**
 * How many distinct-distractor variants to generate per word. This is the
 * "shuffled distractors" combinatorial expansion plan.md calls out - each
 * variant genuinely shows a different set of 3 wrong options, it is not a
 * duplicate question. Capped at 3 to stay curated rather than exploding into
 * every possible C(n-1,3) combination.
 */
const VARIANTS_PER_WORD = 3;
const VARIANT_SEEDS = ['a', 'b', 'c'];

function buildVariant(
  word: VocabWord,
  topicWords: VocabWord[],
  variantSeed: string,
): ImageChoiceQuestion {
  const distractors = pickDistinct(
    topicWords,
    (w) => w.word,
    [word.word],
    3,
    `${word.id}-ic-${variantSeed}`,
  );

  const candidateTexts = [word.word, ...distractors.map((d) => d.word)];
  const order = seededShuffleIndices(4, `${word.id}-ic-${variantSeed}-order`);
  const options = order.map((originalIndex) => candidateTexts[originalIndex]!) as [
    string,
    string,
    string,
    string,
  ];
  const correctIndex = order.indexOf(0) as 0 | 1 | 2 | 3;

  return {
    id: `q-ic-${word.id}-${variantSeed}`,
    topicId: word.topicId,
    kind: 'image-choice',
    emoji: word.emoji,
    options,
    correctIndex,
    explanation: word.explanation,
  };
}

export function generateImageChoiceQuestions(topicWords: VocabWord[]): ImageChoiceQuestion[] {
  const questions: ImageChoiceQuestion[] = [];

  for (const word of topicWords) {
    const variantCount = Math.min(VARIANTS_PER_WORD, VARIANT_SEEDS.length);
    for (let i = 0; i < variantCount; i++) {
      questions.push(buildVariant(word, topicWords, VARIANT_SEEDS[i]!));
    }
  }

  return questions;
}
