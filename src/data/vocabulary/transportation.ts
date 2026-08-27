import type { Topic, VocabWord } from '../../types';

export const TRANSPORTATION_TOPIC: Topic = {
  id: 'g2-transportation',
  gradeId: 'grade-2',
  name: 'Phương tiện giao thông',
};

const t = TRANSPORTATION_TOPIC.id;

export const TRANSPORTATION_WORDS: VocabWord[] = [
  { id: 'car', topicId: t, word: 'car', plural: 'cars', emoji: '🚗', countable: true, explanation: 'Ô tô tiếng Anh là "car".' },
  { id: 'bus', topicId: t, word: 'bus', plural: 'buses', emoji: '🚌', countable: true, explanation: 'Xe buýt tiếng Anh là "bus".' },
  { id: 'bike', topicId: t, word: 'bike', plural: 'bikes', emoji: '🚲', countable: true, explanation: 'Xe đạp tiếng Anh là "bike".' },
  { id: 'train', topicId: t, word: 'train', plural: 'trains', emoji: '🚆', countable: true, explanation: 'Tàu hỏa tiếng Anh là "train".' },
  { id: 'plane', topicId: t, word: 'plane', plural: 'planes', emoji: '✈️', countable: true, explanation: 'Máy bay tiếng Anh là "plane".' },
  { id: 'boat', topicId: t, word: 'boat', plural: 'boats', emoji: '⛵', countable: true, explanation: 'Thuyền tiếng Anh là "boat".' },
];
