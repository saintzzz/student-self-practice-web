import type { Topic, VocabWord } from '../../types';

export const CLOTHES_TOPIC: Topic = { id: 'g2-clothes', gradeId: 'grade-2', name: 'Quần áo' };

const t = CLOTHES_TOPIC.id;

export const CLOTHES_WORDS: VocabWord[] = [
  { id: 'shirt', topicId: t, word: 'shirt', plural: 'shirts', emoji: '👕', countable: true, explanation: 'Áo sơ mi tiếng Anh là "shirt".' },
  // "pants" is grammatically always-plural in English, so it is excluded
  // from the countable pool (same reasoning as "scissors").
  { id: 'pants', topicId: t, word: 'pants', emoji: '👖', countable: false, explanation: 'Quần dài tiếng Anh là "pants".' },
  { id: 'shoe', topicId: t, word: 'shoe', plural: 'shoes', emoji: '👟', countable: true, explanation: 'Giày tiếng Anh là "shoe".' },
  { id: 'hat', topicId: t, word: 'hat', plural: 'hats', emoji: '🎩', countable: true, explanation: 'Mũ tiếng Anh là "hat".' },
  { id: 'sock', topicId: t, word: 'sock', plural: 'socks', emoji: '🧦', countable: true, explanation: 'Tất tiếng Anh là "sock".' },
  { id: 'dress', topicId: t, word: 'dress', plural: 'dresses', emoji: '👗', countable: true, explanation: 'Váy tiếng Anh là "dress".' },
];
