import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { G4_WEEKEND_WORDS } from '../g4/weekend';

export const G5_FAMILY_TIME_TOPIC: Topic = { id: 'g5-family-time', gradeId: 'grade-5', name: 'Thời gian bên gia đình' };

const t = G5_FAMILY_TIME_TOPIC.id;

/** Global Success G5 family-time unit - shared weekend activities plus reunion words. */
export const G5_FAMILY_TIME_WORDS: VocabWord[] = [
  ...pick(G4_WEEKEND_WORDS, 'picnic', 'sightseeing', 'movie', 'camping'),
  { id: 'reunion', topicId: t, word: 'reunion', plural: 'reunions', emoji: '👨‍👩‍👧‍👦', countable: true, explanation: 'Buổi sum họp gia đình tiếng Anh là "reunion".' },
  { id: 'weekend', topicId: t, word: 'weekend', plural: 'weekends', emoji: '📆', countable: true, explanation: 'Cuối tuần tiếng Anh là "weekend".' },
];
