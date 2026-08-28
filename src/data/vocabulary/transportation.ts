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
  { id: 'motorbike', topicId: t, word: 'motorbike', plural: 'motorbikes', emoji: '🏍️', countable: true, explanation: 'Xe máy tiếng Anh là "motorbike".' },
  { id: 'truck', topicId: t, word: 'truck', plural: 'trucks', emoji: '🚚', countable: true, explanation: 'Xe tải tiếng Anh là "truck".' },
  { id: 'helicopter', topicId: t, word: 'helicopter', plural: 'helicopters', emoji: '🚁', countable: true, explanation: 'Máy bay trực thăng tiếng Anh là "helicopter".' },
  { id: 'rocket', topicId: t, word: 'rocket', plural: 'rockets', emoji: '🚀', countable: true, explanation: 'Tên lửa tiếng Anh là "rocket".' },
  { id: 'tractor', topicId: t, word: 'tractor', plural: 'tractors', emoji: '🚜', countable: true, explanation: 'Máy kéo tiếng Anh là "tractor".' },
  { id: 'ambulance', topicId: t, word: 'ambulance', plural: 'ambulances', emoji: '🚑', countable: true, explanation: 'Xe cứu thương tiếng Anh là "ambulance".' },
  { id: 'taxi', topicId: t, word: 'taxi', plural: 'taxis', emoji: '🚕', countable: true, explanation: 'Xe taxi tiếng Anh là "taxi".' },
  { id: 'ship', topicId: t, word: 'ship', plural: 'ships', emoji: '🚢', countable: true, explanation: 'Tàu thủy tiếng Anh là "ship".' },
];
