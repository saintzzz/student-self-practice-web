import type { Topic, VocabWord } from '../../types';

export const COLORS_TOPIC: Topic = { id: 'g2-colors', gradeId: 'grade-2', name: 'Màu sắc' };

const t = COLORS_TOPIC.id;

export const COLORS_WORDS: VocabWord[] = [
  { id: 'red', topicId: t, word: 'red', emoji: '🔴', countable: false, explanation: 'Màu đỏ tiếng Anh là "red".' },
  { id: 'orange', topicId: t, word: 'orange', emoji: '🟠', countable: false, explanation: 'Màu cam tiếng Anh là "orange".' },
  { id: 'yellow', topicId: t, word: 'yellow', emoji: '🟡', countable: false, explanation: 'Màu vàng tiếng Anh là "yellow".' },
  { id: 'green', topicId: t, word: 'green', emoji: '🟢', countable: false, explanation: 'Màu xanh lá tiếng Anh là "green".' },
  { id: 'blue', topicId: t, word: 'blue', emoji: '🔵', countable: false, explanation: 'Màu xanh dương tiếng Anh là "blue".' },
  { id: 'purple', topicId: t, word: 'purple', emoji: '🟣', countable: false, explanation: 'Màu tím tiếng Anh là "purple".' },
  { id: 'black', topicId: t, word: 'black', emoji: '⚫', countable: false, explanation: 'Màu đen tiếng Anh là "black".' },
  { id: 'white', topicId: t, word: 'white', emoji: '⚪', countable: false, explanation: 'Màu trắng tiếng Anh là "white".' },
  { id: 'brown', topicId: t, word: 'brown', emoji: '🟤', countable: false, explanation: 'Màu nâu tiếng Anh là "brown".' },
];
