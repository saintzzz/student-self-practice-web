import type { Topic, VocabWord } from '../../types';

export const VEGETABLES_TOPIC: Topic = { id: 'g2-vegetables', gradeId: 'grade-2', name: 'Rau củ' };

const t = VEGETABLES_TOPIC.id;

export const VEGETABLES_WORDS: VocabWord[] = [
  // "corn", "garlic", "broccoli" and "lettuce" are uncountable mass nouns in
  // everyday English (same reasoning as bread/rice/milk in food.ts).
  { id: 'corn', topicId: t, word: 'corn', emoji: '🌽', countable: false, explanation: 'Ngô tiếng Anh là "corn".' },
  { id: 'potato', topicId: t, word: 'potato', plural: 'potatoes', emoji: '🥔', countable: true, explanation: 'Củ khoai tây tiếng Anh là "potato".' },
  { id: 'tomato', topicId: t, word: 'tomato', plural: 'tomatoes', emoji: '🍅', countable: true, explanation: 'Quả cà chua tiếng Anh là "tomato".' },
  { id: 'carrot', topicId: t, word: 'carrot', plural: 'carrots', emoji: '🥕', countable: true, explanation: 'Củ cà rốt tiếng Anh là "carrot".' },
  { id: 'onion', topicId: t, word: 'onion', plural: 'onions', emoji: '🧅', countable: true, explanation: 'Củ hành tây tiếng Anh là "onion".' },
  { id: 'garlic', topicId: t, word: 'garlic', emoji: '🧄', countable: false, explanation: 'Tỏi tiếng Anh là "garlic".' },
  { id: 'mushroom', topicId: t, word: 'mushroom', plural: 'mushrooms', emoji: '🍄', countable: true, explanation: 'Cây nấm tiếng Anh là "mushroom".' },
  { id: 'avocado', topicId: t, word: 'avocado', plural: 'avocados', emoji: '🥑', countable: true, explanation: 'Quả bơ tiếng Anh là "avocado".' },
  { id: 'cucumber', topicId: t, word: 'cucumber', plural: 'cucumbers', emoji: '🥒', countable: true, explanation: 'Quả dưa chuột tiếng Anh là "cucumber".' },
  { id: 'broccoli', topicId: t, word: 'broccoli', emoji: '🥦', countable: false, explanation: 'Bông cải xanh tiếng Anh là "broccoli".' },
  { id: 'pumpkin', topicId: t, word: 'pumpkin', plural: 'pumpkins', emoji: '🎃', countable: true, explanation: 'Quả bí ngô tiếng Anh là "pumpkin".' },
  { id: 'pepper', topicId: t, word: 'pepper', plural: 'peppers', emoji: '🌶️', countable: true, explanation: 'Quả ớt tiếng Anh là "pepper".' },
  { id: 'eggplant', topicId: t, word: 'eggplant', plural: 'eggplants', emoji: '🍆', countable: true, explanation: 'Quả cà tím tiếng Anh là "eggplant".' },
  { id: 'lettuce', topicId: t, word: 'lettuce', emoji: '🥬', countable: false, explanation: 'Rau xà lách tiếng Anh là "lettuce".' },
  // v5 vocabulary additions (plan.md "v5 Research-Grounded Content"): "carrot",
  // "onion", "potato" and "tomato" were all on the approved list but already
  // exist above (added pre-v5) and were skipped as exact duplicates - see
  // plans/reports/engineer-260828-student-self-practice-v5-vocab.md.
];
