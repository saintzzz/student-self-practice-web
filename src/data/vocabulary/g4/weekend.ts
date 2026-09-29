import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { G3_HOBBIES_WORDS } from '../g3/hobbies';

export const G4_WEEKEND_TOPIC: Topic = { id: 'g4-weekend', gradeId: 'grade-4', name: 'Cuối tuần' };

const t = G4_WEEKEND_TOPIC.id;

/** Global Success G4 family-weekend unit - outing and leisure words.
    'barbecue' stays out: 🍢 reads as oden skewers, not a cookout. */
export const G4_WEEKEND_WORDS: VocabWord[] = [
  { id: 'picnic', topicId: t, word: 'picnic', plural: 'picnics', emoji: '🧺', countable: true, explanation: 'Buổi dã ngoại tiếng Anh là "picnic".' },
  { id: 'shopping', topicId: t, word: 'shopping', emoji: '🛍️', countable: false, explanation: 'Đi mua sắm tiếng Anh là "shopping".' },
  { id: 'sightseeing', topicId: t, word: 'sightseeing', emoji: '🗼', countable: false, explanation: 'Đi tham quan tiếng Anh là "sightseeing".' },
  { id: 'movie', topicId: t, word: 'movie', plural: 'movies', emoji: '🎞️', countable: true, explanation: 'Bộ phim tiếng Anh là "movie".' },
  ...pick(G3_HOBBIES_WORDS, 'camping', 'gardening', 'cycle'),
];
