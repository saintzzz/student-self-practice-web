import type { CountingImageQuestion, Question } from '../../types';
import { seededShuffleIndices } from '../prng';
import { getTopicPool } from '../../data/pool';

const NON_COUNTABLE_COUNTS = { imageChoice: 3, listeningFillBlank: 3, extraLetter: 2 };
const COUNTABLE_COUNTS = { imageChoice: 2, listeningFillBlank: 2, extraLetter: 2 };

function pickN<T>(items: readonly T[], n: number, seed: string): T[] {
  if (items.length <= n) {
    return [...items];
  }
  const order = seededShuffleIndices(items.length, seed);
  return order.slice(0, n).map((i) => items[i]!);
}

/** Picks one counting-image instance per direction so both directions get exercised. */
function pickCountingImageBothDirections(
  pool: readonly CountingImageQuestion[],
  topicId: string,
): CountingImageQuestion[] {
  const countToImage = pool.filter((q) => q.direction === 'count-to-image');
  const imageToCount = pool.filter((q) => q.direction === 'image-to-count');
  return [
    ...pickN(countToImage, 1, `${topicId}-ci-cti`),
    ...pickN(imageToCount, 1, `${topicId}-ci-itc`),
  ];
}

/**
 * Selects a mixed practice session for a topic from its generated pool.
 * Every kind the topic is eligible for is guaranteed to appear at least
 * once (AC15): countable topics get all 4 kinds, non-countable topics get
 * image-choice, listening-fill-blank, and extra-letter.
 */
export function buildTopicSession(topicId: string): Question[] {
  const pool = getTopicPool(topicId);
  const isCountable = pool.countingImage.length > 0;

  const selected: Question[] = [
    ...pickN(pool.imageChoice, isCountable ? COUNTABLE_COUNTS.imageChoice : NON_COUNTABLE_COUNTS.imageChoice, `${topicId}-ic`),
    ...pickN(
      pool.listeningFillBlank,
      isCountable ? COUNTABLE_COUNTS.listeningFillBlank : NON_COUNTABLE_COUNTS.listeningFillBlank,
      `${topicId}-lfb`,
    ),
    ...pickN(pool.extraLetter, isCountable ? COUNTABLE_COUNTS.extraLetter : NON_COUNTABLE_COUNTS.extraLetter, `${topicId}-el`),
  ];

  if (isCountable) {
    selected.push(...pickCountingImageBothDirections(pool.countingImage, topicId));
  }

  const order = seededShuffleIndices(selected.length, `${topicId}-mix`);
  return order.map((i) => selected[i]!);
}
