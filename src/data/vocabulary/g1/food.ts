import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { FOOD_WORDS } from '../food';
import { FRUITS_WORDS } from '../fruits';

export const G1_FOOD_TOPIC: Topic = { id: 'g1-food', gradeId: 'grade-1', name: 'Đồ ăn' };

/** Global Success G1 food unit - everyday foods, all shared with the G2 food/fruits banks. */
export const G1_FOOD_WORDS: VocabWord[] = [
  ...pick(FOOD_WORDS, 'bread', 'rice', 'egg', 'milk', 'cake', 'juice'),
  ...pick(FRUITS_WORDS, 'apple', 'banana'),
];
