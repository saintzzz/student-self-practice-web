import type { Topic, VocabWord } from '../../types';

export const FRUITS_TOPIC: Topic = { id: 'g2-fruits', gradeId: 'grade-2', name: 'Trái cây' };

const t = FRUITS_TOPIC.id;

export const FRUITS_WORDS: VocabWord[] = [
  { id: 'apple', topicId: t, word: 'apple', plural: 'apples', emoji: '🍎', countable: true, explanation: 'Quả táo tiếng Anh là "apple".' },
  { id: 'banana', topicId: t, word: 'banana', plural: 'bananas', emoji: '🍌', countable: true, explanation: 'Quả chuối tiếng Anh là "banana".' },
  { id: 'grape', topicId: t, word: 'grape', plural: 'grapes', emoji: '🍇', countable: true, explanation: 'Quả nho tiếng Anh là "grape".' },
  { id: 'strawberry', topicId: t, word: 'strawberry', plural: 'strawberries', emoji: '🍓', countable: true, explanation: 'Quả dâu tây tiếng Anh là "strawberry".' },
  { id: 'watermelon', topicId: t, word: 'watermelon', plural: 'watermelons', emoji: '🍉', countable: true, explanation: 'Quả dưa hấu tiếng Anh là "watermelon".' },
  { id: 'pineapple', topicId: t, word: 'pineapple', plural: 'pineapples', emoji: '🍍', countable: true, explanation: 'Quả dứa tiếng Anh là "pineapple".' },
  { id: 'cherry', topicId: t, word: 'cherry', plural: 'cherries', emoji: '🍒', countable: true, explanation: 'Quả anh đào tiếng Anh là "cherry".' },
  { id: 'lemon', topicId: t, word: 'lemon', plural: 'lemons', emoji: '🍋', countable: true, explanation: 'Quả chanh tiếng Anh là "lemon".' },
  { id: 'peach', topicId: t, word: 'peach', plural: 'peaches', emoji: '🍑', countable: true, explanation: 'Quả đào tiếng Anh là "peach".' },
  { id: 'pear', topicId: t, word: 'pear', plural: 'pears', emoji: '🍐', countable: true, explanation: 'Quả lê tiếng Anh là "pear".' },
  { id: 'mango', topicId: t, word: 'mango', plural: 'mangoes', emoji: '🥭', countable: true, explanation: 'Quả xoài tiếng Anh là "mango".' },
];
