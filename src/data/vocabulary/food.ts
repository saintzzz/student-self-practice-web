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
  { id: 'cookie', topicId: t, word: 'cookie', plural: 'cookies', emoji: '🍪', countable: true, explanation: 'Bánh quy tiếng Anh là "cookie".' },
  // "chocolate", "popcorn", "noodles", "honey", "cheese" and "soup" are
  // uncountable mass nouns in everyday English (same reasoning as bread/rice/milk).
  { id: 'chocolate', topicId: t, word: 'chocolate', emoji: '🍫', countable: false, explanation: 'Sô cô la tiếng Anh là "chocolate".' },
  { id: 'sandwich', topicId: t, word: 'sandwich', plural: 'sandwiches', emoji: '🥪', countable: true, explanation: 'Bánh sandwich tiếng Anh là "sandwich".' },
  { id: 'hamburger', topicId: t, word: 'hamburger', plural: 'hamburgers', emoji: '🍔', countable: true, explanation: 'Bánh hamburger tiếng Anh là "hamburger".' },
  { id: 'popcorn', topicId: t, word: 'popcorn', emoji: '🍿', countable: false, explanation: 'Bỏng ngô tiếng Anh là "popcorn".' },
  { id: 'donut', topicId: t, word: 'donut', plural: 'donuts', emoji: '🍩', countable: true, explanation: 'Bánh donut tiếng Anh là "donut".' },
  { id: 'candy', topicId: t, word: 'candy', plural: 'candies', emoji: '🍬', countable: true, explanation: 'Kẹo tiếng Anh là "candy".' },
  { id: 'noodles', topicId: t, word: 'noodles', emoji: '🍜', countable: false, explanation: 'Mì tiếng Anh là "noodles".' },
  { id: 'honey', topicId: t, word: 'honey', emoji: '🍯', countable: false, explanation: 'Mật ong tiếng Anh là "honey".' },
  { id: 'cheese', topicId: t, word: 'cheese', emoji: '🧀', countable: false, explanation: 'Phô mai tiếng Anh là "cheese".' },
  { id: 'pancake', topicId: t, word: 'pancake', plural: 'pancakes', emoji: '🥞', countable: true, explanation: 'Bánh pancake tiếng Anh là "pancake".' },
  { id: 'soup', topicId: t, word: 'soup', emoji: '🍲', countable: false, explanation: 'Súp tiếng Anh là "soup".' },
];
