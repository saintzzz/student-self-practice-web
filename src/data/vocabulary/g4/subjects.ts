import type { Topic, VocabWord } from '../../../types';

export const G4_SUBJECTS_TOPIC: Topic = { id: 'g4-subjects', gradeId: 'grade-4', name: 'Môn học' };

const t = G4_SUBJECTS_TOPIC.id;

/** Global Success G4 school-subjects unit. */
export const G4_SUBJECTS_WORDS: VocabWord[] = [
  { id: 'maths', topicId: t, word: 'maths', emoji: '🔢', countable: false, explanation: 'Môn toán tiếng Anh là "maths".' },
  { id: 'english', topicId: t, word: 'English', emoji: '🔤', countable: false, explanation: 'Môn tiếng Anh là "English".' },
  { id: 'science', topicId: t, word: 'science', emoji: '🔬', countable: false, explanation: 'Môn khoa học tiếng Anh là "science".' },
  { id: 'art', topicId: t, word: 'art', emoji: '🖼️', countable: false, explanation: 'Môn mỹ thuật tiếng Anh là "art".' },
  { id: 'music', topicId: t, word: 'music', emoji: '🎵', countable: false, explanation: 'Môn âm nhạc tiếng Anh là "music".' },
  { id: 'pe', topicId: t, word: 'PE', emoji: '🤸', countable: false, explanation: 'Môn thể dục tiếng Anh là "PE".' },
  { id: 'ict', topicId: t, word: 'ICT', emoji: '🖥️', countable: false, explanation: 'Môn tin học tiếng Anh là "ICT".' },
  { id: 'history', topicId: t, word: 'history', emoji: '📜', countable: false, explanation: 'Môn lịch sử tiếng Anh là "history".' },
  { id: 'geography', topicId: t, word: 'geography', emoji: '🌏', countable: false, explanation: 'Môn địa lý tiếng Anh là "geography".' },
];
