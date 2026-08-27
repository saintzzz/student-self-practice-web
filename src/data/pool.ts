import type {
  CountingImageQuestion,
  ExtraLetterQuestion,
  ImageChoiceQuestion,
  ListeningFillBlankQuestion,
} from '../types';
import { TOPICS, getWordsByTopic } from './vocabulary';
import { generateImageChoiceQuestions } from '../lib/generators/imageChoice';
import { generateListeningFillBlankQuestions } from '../lib/generators/listeningFillBlank';
import { generateCountingImageQuestions } from '../lib/generators/countingImage';
import { generateExtraLetterQuestions } from '../lib/generators/extraLetter';

export interface TopicPool {
  imageChoice: ImageChoiceQuestion[];
  listeningFillBlank: ListeningFillBlankQuestion[];
  countingImage: CountingImageQuestion[];
  extraLetter: ExtraLetterQuestion[];
}

const poolCache = new Map<string, TopicPool>();

/** Builds (and memoizes) the full generated question pool for one topic. */
export function getTopicPool(topicId: string): TopicPool {
  const cached = poolCache.get(topicId);
  if (cached) {
    return cached;
  }

  const words = getWordsByTopic(topicId);
  const pool: TopicPool = {
    imageChoice: generateImageChoiceQuestions(words),
    listeningFillBlank: generateListeningFillBlankQuestions(words),
    countingImage: generateCountingImageQuestions(words),
    extraLetter: generateExtraLetterQuestions(words),
  };

  poolCache.set(topicId, pool);
  return pool;
}

export interface PoolCounts {
  imageChoice: number;
  listeningFillBlank: number;
  countingImage: number;
  extraLetter: number;
  total: number;
}

/** Real generated instance count across every topic and kind (see AC16). */
export function getPoolCounts(): PoolCounts {
  const counts = { imageChoice: 0, listeningFillBlank: 0, countingImage: 0, extraLetter: 0 };

  for (const topic of TOPICS) {
    const pool = getTopicPool(topic.id);
    counts.imageChoice += pool.imageChoice.length;
    counts.listeningFillBlank += pool.listeningFillBlank.length;
    counts.countingImage += pool.countingImage.length;
    counts.extraLetter += pool.extraLetter.length;
  }

  const total = counts.imageChoice + counts.listeningFillBlank + counts.countingImage + counts.extraLetter;
  return { ...counts, total };
}
