import type { Topic, VocabWord } from '../../types';

export const FURNITURE_TOPIC: Topic = { id: 'g2-furniture', gradeId: 'grade-2', name: 'Đồ nội thất' };

const t = FURNITURE_TOPIC.id;

export const FURNITURE_WORDS: VocabWord[] = [
  { id: 'bed', topicId: t, word: 'bed', plural: 'beds', emoji: '🛏️', countable: true, explanation: 'Cái giường tiếng Anh là "bed".' },
  { id: 'chair', topicId: t, word: 'chair', plural: 'chairs', emoji: '🪑', countable: true, explanation: 'Cái ghế tiếng Anh là "chair".' },
  { id: 'door', topicId: t, word: 'door', plural: 'doors', emoji: '🚪', countable: true, explanation: 'Cái cửa tiếng Anh là "door".' },
  { id: 'window', topicId: t, word: 'window', plural: 'windows', emoji: '🪟', countable: true, explanation: 'Cửa sổ tiếng Anh là "window".' },
  { id: 'television', topicId: t, word: 'television', plural: 'televisions', emoji: '📺', countable: true, explanation: 'Ti vi tiếng Anh là "television".' },
  { id: 'sofa', topicId: t, word: 'sofa', plural: 'sofas', emoji: '🛋️', countable: true, explanation: 'Ghế sofa tiếng Anh là "sofa".' },
  { id: 'bathtub', topicId: t, word: 'bathtub', plural: 'bathtubs', emoji: '🛁', countable: true, explanation: 'Bồn tắm tiếng Anh là "bathtub".' },
  { id: 'toilet', topicId: t, word: 'toilet', plural: 'toilets', emoji: '🚽', countable: true, explanation: 'Nhà vệ sinh tiếng Anh là "toilet".' },
  { id: 'mirror', topicId: t, word: 'mirror', plural: 'mirrors', emoji: '🪞', countable: true, explanation: 'Cái gương tiếng Anh là "mirror".' },
  { id: 'clock', topicId: t, word: 'clock', plural: 'clocks', emoji: '🕰️', countable: true, explanation: 'Đồng hồ tiếng Anh là "clock".' },
  { id: 'lamp', topicId: t, word: 'lamp', plural: 'lamps', emoji: '🪔', countable: true, explanation: 'Cái đèn tiếng Anh là "lamp".' },
  { id: 'candle', topicId: t, word: 'candle', plural: 'candles', emoji: '🕯️', countable: true, explanation: 'Cây nến tiếng Anh là "candle".' },
  { id: 'key', topicId: t, word: 'key', plural: 'keys', emoji: '🔑', countable: true, explanation: 'Chìa khóa tiếng Anh là "key".' },
];
