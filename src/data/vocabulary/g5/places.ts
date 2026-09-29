import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { PLACES_WORDS } from '../places';
import { SEASIDE_WORDS } from '../seaside';
import { G4_CITY_PLACES_WORDS } from '../g4/cityPlaces';

export const G5_PLACES_TOPIC: Topic = { id: 'g5-places', gradeId: 'grade-5', name: 'Danh lam thắng cảnh' };

const t = G5_PLACES_TOPIC.id;

/** Global Success G5 places-of-interest unit - landmarks for travel talk. */
export const G5_PLACES_WORDS: VocabWord[] = [
  ...pick(PLACES_WORDS, 'beach'),
  ...pick(SEASIDE_WORDS, 'island'),
  ...pick(G4_CITY_PLACES_WORDS, 'bridge'),
  { id: 'pagoda', topicId: t, word: 'pagoda', plural: 'pagodas', emoji: '🛕', countable: true, explanation: 'Ngôi chùa tiếng Anh là "pagoda".' },
  { id: 'temple', topicId: t, word: 'temple', plural: 'temples', emoji: '⛩️', countable: true, explanation: 'Ngôi đền tiếng Anh là "temple".' },
  { id: 'cave', topicId: t, word: 'cave', plural: 'caves', emoji: '🕳️', countable: true, explanation: 'Hang động tiếng Anh là "cave".' },
  { id: 'statue', topicId: t, word: 'statue', plural: 'statues', emoji: '🗽', countable: true, explanation: 'Bức tượng tiếng Anh là "statue".' },
  { id: 'skyscraper', topicId: t, word: 'skyscraper', plural: 'skyscrapers', emoji: '🏙️', countable: true, explanation: 'Nhà chọc trời tiếng Anh là "skyscraper".' },
  { id: 'harbor', topicId: t, word: 'harbor', plural: 'harbors', emoji: '⚓', countable: true, explanation: 'Bến cảng tiếng Anh là "harbor".' },
];
