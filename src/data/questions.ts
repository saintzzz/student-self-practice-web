import type { Question } from '../types';
import { GRADES, TOPICS, getTopicsByGrade } from './vocabulary';
import { buildTopicSession } from '../lib/session/buildTopicSession';

export { GRADES, TOPICS, getTopicsByGrade };
export { getPoolCounts } from './pool';

export function getQuestionsByTopic(topicId: string): Question[] {
  return buildTopicSession(topicId);
}
