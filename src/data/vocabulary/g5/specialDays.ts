import type { Topic, VocabWord } from '../../../types';

export const G5_SPECIAL_DAYS_TOPIC: Topic = { id: 'g5-special-days', gradeId: 'grade-5', name: 'Ngày lễ đặc biệt' };

const t = G5_SPECIAL_DAYS_TOPIC.id;

/** Global Success G5 special-days unit - celebrations through the school year. */
export const G5_SPECIAL_DAYS_WORDS: VocabWord[] = [
  { id: 'graduation', topicId: t, word: 'graduation', emoji: '🎓', countable: false, explanation: 'Lễ tốt nghiệp tiếng Anh là "graduation".' },
  { id: 'school-festival', topicId: t, word: 'school festival', emoji: '🎪', countable: false, explanation: 'Hội trường tiếng Anh là "school festival".' },
  { id: 'christmas', topicId: t, word: 'Christmas', emoji: '🎄', countable: false, explanation: 'Lễ Giáng sinh tiếng Anh là "Christmas".' },
  { id: 'new-year', topicId: t, word: 'New Year', emoji: '🎊', countable: false, explanation: 'Năm mới tiếng Anh là "New Year".' },
  { id: 'mid-autumn', topicId: t, word: 'Mid-Autumn Festival', emoji: '🏮', countable: false, explanation: 'Tết Trung thu tiếng Anh là "Mid-Autumn Festival".' },
];
