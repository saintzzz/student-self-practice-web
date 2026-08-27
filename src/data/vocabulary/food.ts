import type { Topic, VocabWord } from '../../types';

export const FOOD_TOPIC: Topic = { id: 'g2-food', gradeId: 'grade-2', name: 'Đồ ăn' };

const t = FOOD_TOPIC.id;

export const FOOD_WORDS: VocabWord[] = [
  // "bread", "rice" and "milk" are uncountable mass nouns in everyday English
  // ("1 bread" is not natural), so they stay out of the countable pool.
  { id: 'bread', topicId: t, word: 'bread', emoji: '🍞', countable: false, explanation: 'Bánh mì tiếng Anh là "bread".' },
  { id: 'rice', topicId: t, word: 'rice', emoji: '🍚', countable: false, explanation: 'Cơm tiếng Anh là "rice".' },
  { id: 'egg', topicId: t, word: 'egg', plural: 'eggs', emoji: '🥚', countable: true, explanation: 'Quả trứng tiếng Anh là "egg".' },
  { id: 'milk', topicId: t, word: 'milk', emoji: '🥛', countable: false, explanation: 'Sữa tiếng Anh là "milk".' },
  { id: 'cake', topicId: t, word: 'cake', plural: 'cakes', emoji: '🎂', countable: true, explanation: 'Bánh ngọt tiếng Anh là "cake".' },
  { id: 'pizza', topicId: t, word: 'pizza', plural: 'pizzas', emoji: '🍕', countable: true, explanation: 'Bánh pizza tiếng Anh là "pizza".' },
];
