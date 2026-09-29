import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { ANIMALS_WORDS } from '../animals';

export const G1_PETS_TOPIC: Topic = { id: 'g1-pets', gradeId: 'grade-1', name: 'Thú cưng' };

/** Global Success G1 pets unit - common household animals, all shared with the G2 animal bank. */
export const G1_PETS_WORDS: VocabWord[] = [
  ...pick(ANIMALS_WORDS, 'cat', 'dog', 'fish', 'bird', 'rabbit', 'duck', 'chicken', 'pig'),
];
