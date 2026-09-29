import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { BODY_PARTS_WORDS } from '../bodyParts';

export const G1_BODY_TOPIC: Topic = { id: 'g1-body', gradeId: 'grade-1', name: 'Cơ thể' };

/** Global Success G1 body-parts unit - all shared with G2. */
export const G1_BODY_WORDS: VocabWord[] = [
  ...pick(BODY_PARTS_WORDS, 'eye', 'ear', 'hand', 'foot', 'nose', 'mouth', 'leg'),
];
