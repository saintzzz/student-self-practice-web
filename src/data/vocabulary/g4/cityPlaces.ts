import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { PLACES_WORDS } from '../places';

export const G4_CITY_PLACES_TOPIC: Topic = { id: 'g4-city-places', gradeId: 'grade-4', name: 'Nơi chốn trong thành phố' };

const t = G4_CITY_PLACES_TOPIC.id;

/** Global Success G4 "in the city" unit - town landmarks and facilities. */
export const G4_CITY_PLACES_WORDS: VocabWord[] = [
  ...pick(PLACES_WORDS, 'street'),
  { id: 'school', topicId: t, word: 'school', plural: 'schools', emoji: '🏫', countable: true, explanation: 'Trường học tiếng Anh là "school".' },
  { id: 'hospital', topicId: t, word: 'hospital', plural: 'hospitals', emoji: '🏥', countable: true, explanation: 'Bệnh viện tiếng Anh là "hospital".' },
  { id: 'bank', topicId: t, word: 'bank', plural: 'banks', emoji: '🏦', countable: true, explanation: 'Ngân hàng tiếng Anh là "bank".' },
  { id: 'post-office', topicId: t, word: 'post office', plural: 'post offices', emoji: '📮', countable: true, explanation: 'Bưu điện tiếng Anh là "post office".' },
  { id: 'cinema', topicId: t, word: 'cinema', plural: 'cinemas', emoji: '🎬', countable: true, explanation: 'Rạp chiếu phim tiếng Anh là "cinema".' },
  { id: 'museum', topicId: t, word: 'museum', plural: 'museums', emoji: '🏛️', countable: true, explanation: 'Bảo tàng tiếng Anh là "museum".' },
  { id: 'supermarket', topicId: t, word: 'supermarket', plural: 'supermarkets', emoji: '🛒', countable: true, explanation: 'Siêu thị tiếng Anh là "supermarket".' },
  { id: 'park', topicId: t, word: 'park', plural: 'parks', emoji: '🏞️', countable: true, explanation: 'Công viên tiếng Anh là "park".' },
  { id: 'airport', topicId: t, word: 'airport', plural: 'airports', emoji: '🛫', countable: true, explanation: 'Sân bay tiếng Anh là "airport".' },
  { id: 'bus-stop', topicId: t, word: 'bus stop', plural: 'bus stops', emoji: '🚏', countable: true, explanation: 'Trạm xe buýt tiếng Anh là "bus stop".' },
  { id: 'bridge', topicId: t, word: 'bridge', plural: 'bridges', emoji: '🌉', countable: true, explanation: 'Cây cầu tiếng Anh là "bridge".' },
];
