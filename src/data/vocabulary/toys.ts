import type { Topic, VocabWord } from '../../types';

export const TOYS_TOPIC: Topic = { id: 'g2-toys', gradeId: 'grade-2', name: 'Đồ chơi' };

const t = TOYS_TOPIC.id;

export const TOYS_WORDS: VocabWord[] = [
  { id: 'ball', topicId: t, word: 'ball', plural: 'balls', emoji: '⚽', countable: true, explanation: 'Quả bóng tiếng Anh là "ball".' },
  { id: 'kite', topicId: t, word: 'kite', plural: 'kites', emoji: '🪁', countable: true, explanation: 'Con diều tiếng Anh là "kite".' },
  { id: 'doll', topicId: t, word: 'doll', plural: 'dolls', emoji: '🪆', countable: true, explanation: 'Búp bê tiếng Anh là "doll".' },
  { id: 'balloon', topicId: t, word: 'balloon', plural: 'balloons', emoji: '🎈', countable: true, explanation: 'Bóng bay tiếng Anh là "balloon".' },
  { id: 'robot', topicId: t, word: 'robot', plural: 'robots', emoji: '🤖', countable: true, explanation: 'Người máy tiếng Anh là "robot".' },
  { id: 'drum', topicId: t, word: 'drum', plural: 'drums', emoji: '🥁', countable: true, explanation: 'Cái trống tiếng Anh là "drum".' },
  { id: 'puzzle', topicId: t, word: 'puzzle', plural: 'puzzles', emoji: '🧩', countable: true, explanation: 'Trò chơi xếp hình tiếng Anh là "puzzle".' },
  { id: 'dice', topicId: t, word: 'dice', plural: 'dice', emoji: '🎲', countable: true, explanation: 'Xúc xắc tiếng Anh là "dice".' },
  { id: 'block', topicId: t, word: 'block', plural: 'blocks', emoji: '🧱', countable: true, explanation: 'Khối xếp hình tiếng Anh là "block".' },
];
