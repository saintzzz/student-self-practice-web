import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { SCHOOL_OBJECTS_WORDS } from '../schoolObjects';

export const G1_SCHOOL_THINGS_TOPIC: Topic = { id: 'g1-school-things', gradeId: 'grade-1', name: 'Đồ dùng học tập' };

/** Global Success G1 school-things unit - all core objects, shared with the G2 bank. */
export const G1_SCHOOL_THINGS_WORDS: VocabWord[] = [
  ...pick(SCHOOL_OBJECTS_WORDS, 'pencil', 'pen', 'book', 'bag', 'ruler', 'crayon', 'notebook', 'scissors'),
];
