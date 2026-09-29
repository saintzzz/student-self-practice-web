import type { Topic, VocabWord } from '../../../types';

export const G4_DAILY_ROUTINE_TOPIC: Topic = { id: 'g4-daily-routine', gradeId: 'grade-4', name: 'Sinh hoạt hằng ngày' };

const t = G4_DAILY_ROUTINE_TOPIC.id;

/** Global Success G4 daily-routine unit - times of day, meals and everyday habits. */
export const G4_DAILY_ROUTINE_WORDS: VocabWord[] = [
  { id: 'morning', topicId: t, word: 'morning', emoji: '🌅', countable: false, explanation: 'Buổi sáng tiếng Anh là "morning".' },
  { id: 'afternoon', topicId: t, word: 'afternoon', emoji: '🌤️', countable: false, explanation: 'Buổi chiều tiếng Anh là "afternoon".' },
  { id: 'evening', topicId: t, word: 'evening', emoji: '🌆', countable: false, explanation: 'Buổi tối tiếng Anh là "evening".' },
  { id: 'night', topicId: t, word: 'night', emoji: '🌃', countable: false, explanation: 'Ban đêm tiếng Anh là "night".' },
  { id: 'breakfast', topicId: t, word: 'breakfast', plural: 'breakfasts', emoji: '🧇', countable: true, explanation: 'Bữa sáng tiếng Anh là "breakfast".' },
  { id: 'lunch', topicId: t, word: 'lunch', plural: 'lunches', emoji: '🍱', countable: true, explanation: 'Bữa trưa tiếng Anh là "lunch".' },
  { id: 'dinner', topicId: t, word: 'dinner', plural: 'dinners', emoji: '🍽️', countable: true, explanation: 'Bữa tối tiếng Anh là "dinner".' },
  { id: 'homework', topicId: t, word: 'homework', emoji: '📝', countable: false, explanation: 'Bài tập về nhà tiếng Anh là "homework".' },
  { id: 'wake-up', topicId: t, word: 'wake up', emoji: '⏰', countable: false, explanation: '"Wake up" nghĩa là thức dậy.' },
  { id: 'brush-teeth', topicId: t, word: 'brush teeth', emoji: '🪥', countable: false, explanation: '"Brush teeth" nghĩa là đánh răng.' },
];
