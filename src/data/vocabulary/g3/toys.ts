import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { TOYS_WORDS } from '../toys';
import { G1_TOYS_WORDS } from '../g1/toys';

export const G3_TOYS_TOPIC: Topic = { id: 'g3-toys', gradeId: 'grade-3', name: 'Đồ chơi' };

/** Global Success G3 toys unit - full G2 toy set plus shared yo-yo. */
export const G3_TOYS_WORDS: VocabWord[] = [
  ...pick(TOYS_WORDS, 'ball', 'kite', 'doll', 'balloon', 'robot', 'puzzle', 'dice', 'drum', 'teddy-bear'),
  ...pick(G1_TOYS_WORDS, 'yo-yo'),
];
