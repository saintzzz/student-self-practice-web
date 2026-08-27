import type { Topic, VocabWord } from '../../types';

export const NUMBERS_TOPIC: Topic = { id: 'g2-numbers', gradeId: 'grade-2', name: 'Số đếm' };

const t = NUMBERS_TOPIC.id;

export const NUMBERS_WORDS: VocabWord[] = [
  { id: 'one', topicId: t, word: 'one', emoji: '1️⃣', countable: false, explanation: 'Số 1 tiếng Anh là "one".' },
  { id: 'two', topicId: t, word: 'two', emoji: '2️⃣', countable: false, explanation: 'Số 2 tiếng Anh là "two".' },
  { id: 'three', topicId: t, word: 'three', emoji: '3️⃣', countable: false, explanation: 'Số 3 tiếng Anh là "three".' },
  { id: 'four', topicId: t, word: 'four', emoji: '4️⃣', countable: false, explanation: 'Số 4 tiếng Anh là "four".' },
  { id: 'five', topicId: t, word: 'five', emoji: '5️⃣', countable: false, explanation: 'Số 5 tiếng Anh là "five".' },
  { id: 'six', topicId: t, word: 'six', emoji: '6️⃣', countable: false, explanation: 'Số 6 tiếng Anh là "six".' },
  { id: 'seven', topicId: t, word: 'seven', emoji: '7️⃣', countable: false, explanation: 'Số 7 tiếng Anh là "seven".' },
  { id: 'eight', topicId: t, word: 'eight', emoji: '8️⃣', countable: false, explanation: 'Số 8 tiếng Anh là "eight".' },
  { id: 'nine', topicId: t, word: 'nine', emoji: '9️⃣', countable: false, explanation: 'Số 9 tiếng Anh là "nine".' },
  { id: 'ten', topicId: t, word: 'ten', emoji: '🔟', countable: false, explanation: 'Số 10 tiếng Anh là "ten".' },
];
