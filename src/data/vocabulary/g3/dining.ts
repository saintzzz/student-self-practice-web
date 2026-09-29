import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { KITCHEN_WORDS } from '../kitchen';

export const G3_DINING_TOPIC: Topic = { id: 'g3-dining', gradeId: 'grade-3', name: 'Bàn ăn' };

/** Global Success G3 dining-table unit - tableware.
    cup/plate/fork/bowl/pot/glass stay out per the PRD 7.3 flagged list
    (emoji misreads: coffee, three objects, fork+knife, spoon-in-bowl,
    soup-bound, alcohol/pouring). Only shared kitchen items are used. */
export const G3_DINING_WORDS: VocabWord[] = [
  ...pick(KITCHEN_WORDS, 'spoon', 'chopsticks', 'teapot', 'jar', 'salt', 'sponge'),
];
