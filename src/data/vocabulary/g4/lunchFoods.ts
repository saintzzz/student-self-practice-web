import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { FOOD_WORDS } from '../food';
import { PARTY_WORDS } from '../party';

export const G4_LUNCH_FOODS_TOPIC: Topic = { id: 'g4-lunch-foods', gradeId: 'grade-4', name: 'Món ăn trưa' };

const t = G4_LUNCH_FOODS_TOPIC.id;

/** Global Success G4 food unit - world lunch items plus shared fast foods. */
export const G4_LUNCH_FOODS_WORDS: VocabWord[] = [
  ...pick(FOOD_WORDS, 'sandwich', 'hamburger'),
  ...pick(PARTY_WORDS, 'hot-dog'),
  { id: 'salad', topicId: t, word: 'salad', plural: 'salads', emoji: '🥗', countable: true, explanation: 'Món rau trộn tiếng Anh là "salad".' },
  { id: 'burrito', topicId: t, word: 'burrito', plural: 'burritos', emoji: '🌯', countable: true, explanation: 'Bánh burrito tiếng Anh là "burrito".' },
  { id: 'taco', topicId: t, word: 'taco', plural: 'tacos', emoji: '🌮', countable: true, explanation: 'Bánh taco tiếng Anh là "taco".' },
  { id: 'kebab', topicId: t, word: 'kebab', plural: 'kebabs', emoji: '🥙', countable: true, explanation: 'Bánh kẹp thịt nướng tiếng Anh là "kebab".' },
  { id: 'sushi', topicId: t, word: 'sushi', emoji: '🍣', countable: false, explanation: 'Món sushi tiếng Anh là "sushi".' },
];
