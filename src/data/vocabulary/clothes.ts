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
  { id: 'jacket', topicId: t, word: 'jacket', plural: 'jackets', emoji: '🧥', countable: true, explanation: 'Áo khoác tiếng Anh là "jacket".' },
  { id: 'scarf', topicId: t, word: 'scarf', plural: 'scarves', emoji: '🧣', countable: true, explanation: 'Khăn quàng cổ tiếng Anh là "scarf".' },
  { id: 'glove', topicId: t, word: 'glove', plural: 'gloves', emoji: '🧤', countable: true, explanation: 'Găng tay tiếng Anh là "glove".' },
  { id: 'tie', topicId: t, word: 'tie', plural: 'ties', emoji: '👔', countable: true, explanation: 'Cà vạt tiếng Anh là "tie".' },
  // "glasses" and "sunglasses" are grammatically always-plural, same reasoning as "scissors"/"pants".
  { id: 'glasses', topicId: t, word: 'glasses', emoji: '👓', countable: false, explanation: 'Kính mắt tiếng Anh là "glasses".' },
  { id: 'sunglasses', topicId: t, word: 'sunglasses', emoji: '🕶️', countable: false, explanation: 'Kính râm tiếng Anh là "sunglasses".' },
  { id: 'crown', topicId: t, word: 'crown', plural: 'crowns', emoji: '👑', countable: true, explanation: 'Vương miện tiếng Anh là "crown".' },
  { id: 'ring', topicId: t, word: 'ring', plural: 'rings', emoji: '💍', countable: true, explanation: 'Chiếc nhẫn tiếng Anh là "ring".' },
  // v5 vocabulary addition (plan.md "v5 Research-Grounded Content"). "dress",
  // "socks" (same word/emoji as existing "sock"), "glasses" and "jacket" were
  // also on the approved list but already exist above and were skipped.
  { id: 'handbag', topicId: t, word: 'handbag', plural: 'handbags', emoji: '👜', countable: true, explanation: 'Túi xách tiếng Anh là "handbag".' },
];
