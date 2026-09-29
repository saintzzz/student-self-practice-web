import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { CAMPING_WORDS } from '../camping';
import { NATURE_WORDS } from '../nature';

export const G5_SCHOOL_TRIPS_TOPIC: Topic = { id: 'g5-school-trips', gradeId: 'grade-5', name: 'Chuyến đi của trường' };

const t = G5_SCHOOL_TRIPS_TOPIC.id;

/** Global Success G5 school-trip unit - shared camping kit plus forest. */
export const G5_SCHOOL_TRIPS_WORDS: VocabWord[] = [
  ...pick(CAMPING_WORDS, 'tent', 'torch', 'compass', 'map', 'boot', 'canoe'),
  { id: 'forest', topicId: t, word: 'forest', plural: 'forests', emoji: '🌲', countable: true, explanation: 'Khu rừng tiếng Anh là "forest".' },
  ...pick(NATURE_WORDS, 'tree', 'mountain'),
];
