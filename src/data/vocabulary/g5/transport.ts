import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { TRANSPORTATION_WORDS } from '../transportation';
import { CAMPING_WORDS } from '../camping';

export const G5_TRANSPORT_TOPIC: Topic = { id: 'g5-transport', gradeId: 'grade-5', name: 'Phương tiện giao thông' };

const t = G5_TRANSPORT_TOPIC.id;

/** Global Success G5 transport unit - shared vehicles plus rail and water transport. */
export const G5_TRANSPORT_WORDS: VocabWord[] = [
  ...pick(TRANSPORTATION_WORDS, 'car', 'bus', 'bike', 'train', 'plane', 'boat', 'motorbike', 'ship'),
  ...pick(CAMPING_WORDS, 'canoe'),
  { id: 'subway', topicId: t, word: 'subway', plural: 'subways', emoji: '🚇', countable: true, explanation: 'Tàu điện ngầm tiếng Anh là "subway".' },
  { id: 'tram', topicId: t, word: 'tram', plural: 'trams', emoji: '🚊', countable: true, explanation: 'Tàu điện mặt đất tiếng Anh là "tram".' },
  { id: 'scooter', topicId: t, word: 'scooter', plural: 'scooters', emoji: '🛴', countable: true, explanation: 'Xe scooter tiếng Anh là "scooter".' },
  { id: 'cable-car', topicId: t, word: 'cable car', plural: 'cable cars', emoji: '🚡', countable: true, explanation: 'Cáp treo tiếng Anh là "cable car".' },
  { id: 'ferry', topicId: t, word: 'ferry', plural: 'ferries', emoji: '⛴️', countable: true, explanation: 'Phà tiếng Anh là "ferry".' },
];
