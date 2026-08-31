import type { CountingImageOption, DescribeAndChooseImageQuestion, VocabWord } from '../../types';
import { pickDistinct, seededShuffleIndices } from '../prng';
import { buildDistractorOptions } from './countingImageDistractors';
import { formatCountLabel } from './countingImage';

/** Counts used for `count` items - same 1-5 spread as counting-image (plan.md v3/v5). */
const COUNT_SPREAD = [1, 2, 3, 4, 5];

/** Counts used for a negation item's 3 "has the negated word" distractors (plan.md v5 "Round 4 Negation Design"). */
const NEGATION_COUNTS = [1, 2, 3, 4];

const VOWEL_LETTERS = new Set(['a', 'e', 'i', 'o', 'u']);

function article(word: string): 'a' | 'an' {
  const firstLetter = word.trim().charAt(0).toLowerCase();
  return VOWEL_LETTERS.has(firstLetter) ? 'an' : 'a';
}

function toOption(word: VocabWord, count: number): CountingImageOption {
  return { word: word.word, plural: word.plural ?? `${word.word}s`, emoji: word.emoji, count };
}

/** "There is a cat." / "There are 3 cats." - simple present, safe grammar per plan.md v5. */
function countSentence(option: CountingImageOption): string {
  if (option.count === 1) {
    return `There is ${article(option.word)} ${option.word}.`;
  }
  return `There are ${option.count} ${option.plural}.`;
}

/** "There isn't a cat here." - always singular framing, matches plan.md's own example. */
function negationSentence(word: VocabWord): string {
  return `There isn't ${article(word.word)} ${word.word} here.`;
}

function buildCountInstance(
  word: VocabWord,
  count: number,
  countableWords: readonly VocabWord[],
): DescribeAndChooseImageQuestion {
  const seedBase = `dcci-count-${word.id}-${count}`;
  const correctOption = toOption(word, count);
  const distractors = buildDistractorOptions(word, count, [...countableWords], seedBase);

  const order = seededShuffleIndices(4, `${seedBase}-order`);
  const pool = [correctOption, ...distractors];
  const options = order.map((i) => pool[i]!) as [
    CountingImageOption,
    CountingImageOption,
    CountingImageOption,
    CountingImageOption,
  ];
  const correctIndex = order.indexOf(0) as 0 | 1 | 2 | 3;

  return {
    id: `q-dcci-count-${word.id}-${count}`,
    topicId: word.topicId,
    kind: 'describe-and-choose-image',
    descriptionType: 'count',
    sentence: countSentence(correctOption),
    options,
    correctIndex,
    explanation: `Chọn hình có ${formatCountLabel(correctOption)}. ${word.explanation}`,
  };
}

/**
 * Builds one negation instance for `word` (plan.md v5 "Round 4 Negation
 * Design"): exactly ONE option depicts a different object entirely (zero of
 * `word`) - the single correct answer - and the other 3 options all depict
 * `word` itself at 3 distinct counts in [1,4] as distractors. Returns null
 * when no other countable word is available to build the correct option
 * from (degenerate single-word pools only - never happens against the real
 * vocabulary bank, but the generator must not crash against a thin test
 * fixture either).
 */
function buildNegationInstance(
  word: VocabWord,
  countableWords: readonly VocabWord[],
): DescribeAndChooseImageQuestion | null {
  const seedBase = `dcci-neg-${word.id}`;
  const [differentWord] = pickDistinct(countableWords, (w) => w.word, [word.word], 1, `${seedBase}-otherword`);
  if (!differentWord) {
    return null;
  }

  const shuffledCounts = seededShuffleIndices(NEGATION_COUNTS.length, `${seedBase}-counts`).map(
    (i) => NEGATION_COUNTS[i]!,
  );
  const distractorOptions = shuffledCounts.slice(0, 3).map((count) => toOption(word, count));
  const correctOption = toOption(differentWord, shuffledCounts[3]!);

  const order = seededShuffleIndices(4, `${seedBase}-order`);
  const pool = [correctOption, ...distractorOptions];
  const options = order.map((i) => pool[i]!) as [
    CountingImageOption,
    CountingImageOption,
    CountingImageOption,
    CountingImageOption,
  ];
  const correctIndex = order.indexOf(0) as 0 | 1 | 2 | 3;

  return {
    id: `q-dcci-neg-${word.id}`,
    topicId: word.topicId,
    kind: 'describe-and-choose-image',
    descriptionType: 'negation',
    sentence: negationSentence(word),
    options,
    correctIndex,
    explanation: `Câu này phủ định "${word.word}" nên hình đúng là hình không có ${word.word}. ${word.explanation}`,
  };
}

/**
 * Generates describe-and-choose-image instances (plan.md v5 "Round 4 -
 * Describe and Choose Image") for every countable word: a count instance
 * across a 1-5 count spread, plus one negation instance. Non-countable words
 * are skipped entirely, same gating as counting-image (a color or a feeling
 * cannot be "there" or "not there" in a countable sense).
 */
export function generateDescribeAndChooseImageQuestions(
  words: readonly VocabWord[],
): DescribeAndChooseImageQuestion[] {
  const countableWords = words.filter((w) => w.countable);
  const questions: DescribeAndChooseImageQuestion[] = [];

  for (const word of countableWords) {
    for (const count of COUNT_SPREAD) {
      questions.push(buildCountInstance(word, count, countableWords));
    }
    const negationInstance = buildNegationInstance(word, countableWords);
    if (negationInstance) {
      questions.push(negationInstance);
    }
  }

  return questions;
}
