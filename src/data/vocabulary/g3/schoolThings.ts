import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { SCHOOL_OBJECTS_WORDS } from '../schoolObjects';

export const G3_SCHOOL_THINGS_TOPIC: Topic = { id: 'g3-school-things', gradeId: 'grade-3', name: 'Đồ dùng học tập' };

/** Global Success G3 "school things" units - core objects shared + classroom tech. */
export const G3_SCHOOL_THINGS_WORDS: VocabWord[] = [
  ...pick(SCHOOL_OBJECTS_WORDS, 'pencil', 'pen', 'book', 'bag', 'ruler', 'crayon', 'notebook', 'scissors', 'computer', 'globe'),
];
