import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { COLORS_WORDS } from '../colors';
import { G1_COLORS_WORDS } from '../g1/colors';

export const G3_COLOURS_TOPIC: Topic = { id: 'g3-colours', gradeId: 'grade-3', name: 'Màu sắc' };

/** Global Success G3 colours unit - full G2 palette plus shared pink. */
export const G3_COLOURS_WORDS: VocabWord[] = [
  ...pick(COLORS_WORDS, 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'white', 'brown'),
  ...pick(G1_COLORS_WORDS, 'pink'),
];
