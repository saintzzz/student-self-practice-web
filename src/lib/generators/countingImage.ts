import type { CountDirection, CountingImageOption, CountingImageQuestion, VocabWord } from '../../types';
import { isLiteralImageWord } from '../content/imageSemantics';
import { seededShuffleIndices } from '../prng';
import { buildDistractorOptions } from './countingImageDistractors';

const COUNTS = [1, 2, 3, 4, 5];
const DIRECTIONS: CountDirection[] = ['count-to-image', 'image-to-count'];

function formatCountLabel(option: CountingImageOption): string {
  return `${option.count} ${option.count === 1 ? option.word : option.plural}`;
}

function buildInstance(
  word: VocabWord,
  count: number,
  direction: CountDirection,
  topicWords: VocabWord[],
): CountingImageQuestion {
  const seedBase = `${word.id}-${count}-${direction}`;
  const correctOption: CountingImageOption = {
    word: word.word,
    plural: word.plural ?? `${word.word}s`,
    emoji: word.emoji,
    count,
  };
  const distractors = buildDistractorOptions(word, count, topicWords, seedBase).options;

  const order = seededShuffleIndices(4, `${seedBase}-order`);
  const pool = [correctOption, ...distractors];
  const options = order.map((i) => pool[i]!) as [
    CountingImageOption,
    CountingImageOption,
    CountingImageOption,
    CountingImageOption,
  ];
  const correctIndex = order.indexOf(0) as 0 | 1 | 2 | 3;

  const explanation =
    direction === 'count-to-image'
      ? `Đếm đúng số lượng và chọn hình có ${formatCountLabel(correctOption)}.`
      : `Đếm số lượng trong hình rồi chọn "${formatCountLabel(correctOption)}".`;

  return {
    id: `q-ci-${word.id}-${count}-${direction}`,
    topicId: word.topicId,
    kind: 'counting-image',
    direction,
    prompt: correctOption,
    promptWordId: word.id,
    options,
    correctIndex,
    explanation,
  };
}

/**
 * Generates counting-image instances for every countable word in the topic,
 * across a 1-5 count spread and both directions (see plan.md v3 "New
 * Question Kind: counting-image"). Non-countable words are skipped
 * entirely - counting a color or a feeling does not make sense.
 */
export function generateCountingImageQuestions(topicWords: VocabWord[]): CountingImageQuestion[] {
  // CR-24: literal-emoji words only (see imageSemantics.ts) - counting a
  // figurative symbol makes the answer unguessable from the picture.
  const countableWords = topicWords.filter((w) => w.countable && isLiteralImageWord(w));
  const questions: CountingImageQuestion[] = [];

  for (const word of countableWords) {
    for (const count of COUNTS) {
      for (const direction of DIRECTIONS) {
        questions.push(buildInstance(word, count, direction, countableWords));
      }
    }
  }

  return questions;
}

export { formatCountLabel };
