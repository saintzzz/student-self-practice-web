import type { Topic, VocabWord } from '../../types';

export const ACTIONS_TOPIC: Topic = { id: 'g2-actions', gradeId: 'grade-2', name: 'Hành động' };

const t = ACTIONS_TOPIC.id;

/**
 * Actions are not physical objects so none are countable (same reasoning as
 * feelings/weather). Only verbs with a widely recognized, unambiguous single
 * emoji are included - "jump" was considered and dropped because no standard
 * emoji clearly depicts jumping (as opposed to a specific animal jumping).
 */
export const ACTIONS_WORDS: VocabWord[] = [
  { id: 'run', topicId: t, word: 'run', emoji: '🏃', countable: false, explanation: 'Chạy tiếng Anh là "run".' },
  { id: 'walk', topicId: t, word: 'walk', emoji: '🚶', countable: false, explanation: 'Đi bộ tiếng Anh là "walk".' },
  { id: 'swim', topicId: t, word: 'swim', emoji: '🏊', countable: false, explanation: 'Bơi tiếng Anh là "swim".' },
  { id: 'dance', topicId: t, word: 'dance', emoji: '💃', countable: false, explanation: 'Nhảy múa tiếng Anh là "dance".' },
  { id: 'sing', topicId: t, word: 'sing', emoji: '🎤', countable: false, explanation: 'Hát tiếng Anh là "sing".' },
  { id: 'sleep', topicId: t, word: 'sleep', emoji: '😴', countable: false, explanation: 'Ngủ tiếng Anh là "sleep".' },
  { id: 'cry', topicId: t, word: 'cry', emoji: '😢', countable: false, explanation: 'Khóc tiếng Anh là "cry".' },
  { id: 'laugh', topicId: t, word: 'laugh', emoji: '😂', countable: false, explanation: 'Cười tiếng Anh là "laugh".' },
  { id: 'write', topicId: t, word: 'write', emoji: '✍️', countable: false, explanation: 'Viết tiếng Anh là "write".' },
  { id: 'read', topicId: t, word: 'read', emoji: '📖', countable: false, explanation: 'Đọc tiếng Anh là "read".' },
  { id: 'drink', topicId: t, word: 'drink', emoji: '🥤', countable: false, explanation: 'Uống tiếng Anh là "drink".' },
  { id: 'climb', topicId: t, word: 'climb', emoji: '🧗', countable: false, explanation: 'Leo trèo tiếng Anh là "climb".' },
  { id: 'cook', topicId: t, word: 'cook', emoji: '🍳', countable: false, explanation: 'Nấu ăn tiếng Anh là "cook".' },
  { id: 'draw', topicId: t, word: 'draw', emoji: '🎨', countable: false, explanation: 'Vẽ tiếng Anh là "draw".' },
  { id: 'clap', topicId: t, word: 'clap', emoji: '👏', countable: false, explanation: 'Vỗ tay tiếng Anh là "clap".' },
  { id: 'wave', topicId: t, word: 'wave', emoji: '👋', countable: false, explanation: 'Vẫy tay tiếng Anh là "wave".' },
];
