import type { Topic, VocabWord } from '../../types';

export const PLACES_TOPIC: Topic = { id: 'g2-places', gradeId: 'grade-2', name: 'Địa điểm' };

const t = PLACES_TOPIC.id;

/**
 * New v5 topic (plan.md "v5 Research-Grounded Content"). Only 3 words by
 * design - `playground` was rejected during the critique pass for a
 * mismatched emoji (the common playground emoji depicts a slide, not a
 * generic playground), and this topic is intentionally shipped thin rather
 * than padded with a non-approved word. See
 * apps/student-self-practice-web/src/data/vocabulary/index.test.ts for the
 * documented exception this creates in the per-topic minimum-word guard, and
 * plans/reports/engineer-260828-student-self-practice-v5-vocab.md for the
 * downstream image-choice generator risk this small topic introduces.
 */
export const PLACES_WORDS: VocabWord[] = [
  { id: 'house', topicId: t, word: 'house', plural: 'houses', emoji: '🏠', countable: true, explanation: 'Ngôi nhà tiếng Anh là "house".' },
  { id: 'beach', topicId: t, word: 'beach', plural: 'beaches', emoji: '🏖️', countable: true, explanation: 'Bãi biển tiếng Anh là "beach".' },
  { id: 'street', topicId: t, word: 'street', plural: 'streets', emoji: '🛣️', countable: true, explanation: 'Con đường tiếng Anh là "street".' },
];
