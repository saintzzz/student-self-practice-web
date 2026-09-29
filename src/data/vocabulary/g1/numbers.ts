import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { NUMBERS_WORDS } from '../numbers';

export const G1_NUMBERS_TOPIC: Topic = { id: 'g1-numbers', gradeId: 'grade-1', name: 'Các số' };

/** Global Success G1 numbers unit: counting 1-10, all shared with G2. */
export const G1_NUMBERS_WORDS: VocabWord[] = [
  ...pick(NUMBERS_WORDS, 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'),
];
