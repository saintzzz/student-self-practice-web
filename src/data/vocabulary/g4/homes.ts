import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { PLACES_WORDS } from '../places';
import { CAMPING_WORDS } from '../camping';

export const G4_HOMES_TOPIC: Topic = { id: 'g4-homes', gradeId: 'grade-4', name: 'Kiểu nhà' };

const t = G4_HOMES_TOPIC.id;

/** Global Success G4 homes unit - dwelling types.
    'cottage'/'hut' stay out per PRD 7.3 (🛖 too close to 'tent' ⛺). */
export const G4_HOMES_WORDS: VocabWord[] = [
  ...pick(PLACES_WORDS, 'house'),
  ...pick(CAMPING_WORDS, 'tent'),
  { id: 'flat', topicId: t, word: 'flat', plural: 'flats', emoji: '🏢', countable: true, explanation: 'Căn hộ tiếng Anh là "flat".' },
  { id: 'castle', topicId: t, word: 'castle', plural: 'castles', emoji: '🏰', countable: true, explanation: 'Lâu đài tiếng Anh là "castle".' },
  { id: 'palace', topicId: t, word: 'palace', plural: 'palaces', emoji: '🏯', countable: true, explanation: 'Cung điện tiếng Anh là "palace".' },
];
