import type { Topic, VocabWord } from '../../types';

export const CAMPING_TOPIC: Topic = { id: 'g2-camping', gradeId: 'grade-2', name: 'Cắm trại' };

const t = CAMPING_TOPIC.id;

// SGK Tiếng Anh 2 Unit 16 (Campsite) gap additions (docs/sdlc/prd.md section 7.1).
export const CAMPING_WORDS: VocabWord[] = [
  { id: 'tent', topicId: t, word: 'tent', plural: 'tents', emoji: '⛺', countable: true, explanation: 'Cái lều tiếng Anh là "tent".' },
  { id: 'torch', topicId: t, word: 'torch', plural: 'torches', emoji: '🔦', countable: true, explanation: 'Đèn pin tiếng Anh là "torch".' },
  { id: 'compass', topicId: t, word: 'compass', plural: 'compasses', emoji: '🧭', countable: true, explanation: 'La bàn tiếng Anh là "compass".' },
  { id: 'map', topicId: t, word: 'map', plural: 'maps', emoji: '🗺️', countable: true, explanation: 'Bản đồ tiếng Anh là "map".' },
  { id: 'wood', topicId: t, word: 'wood', emoji: '🪵', countable: false, explanation: 'Gỗ, củi tiếng Anh là "wood".' },
  { id: 'lantern', topicId: t, word: 'lantern', plural: 'lanterns', emoji: '🏮', countable: true, explanation: 'Đèn lồng tiếng Anh là "lantern".' },
  // `moon` follows `sun` as a the-noun (word-id override, PRD 5.1 Table B).
  { id: 'moon', topicId: t, word: 'moon', emoji: '🌙', countable: false, explanation: 'Mặt trăng tiếng Anh là "moon".' },
  { id: 'boot', topicId: t, word: 'boot', plural: 'boots', emoji: '🥾', countable: true, explanation: 'Giày bốt tiếng Anh là "boot".' },
  { id: 'canoe', topicId: t, word: 'canoe', plural: 'canoes', emoji: '🛶', countable: true, explanation: 'Chiếc xuồng tiếng Anh là "canoe".' },
  { id: 'fishing-rod', topicId: t, word: 'fishing rod', plural: 'fishing rods', emoji: '🎣', countable: true, explanation: 'Cần câu cá tiếng Anh là "fishing rod".' },
];
