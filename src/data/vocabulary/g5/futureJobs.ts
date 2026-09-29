import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { OCCUPATIONS_WORDS } from '../occupations';
import { G3_JOBS_WORDS } from '../g3/jobs';
import { G4_JOBS_WORDS } from '../g4/jobs';

export const G5_FUTURE_JOBS_TOPIC: Topic = { id: 'g5-future-jobs', gradeId: 'grade-5', name: 'Nghề nghiệp tương lai' };

const t = G5_FUTURE_JOBS_TOPIC.id;

/** Global Success G5 future-jobs unit - shared professions plus aspirational roles. */
export const G5_FUTURE_JOBS_WORDS: VocabWord[] = [
  ...pick(OCCUPATIONS_WORDS, 'astronaut', 'scientist', 'artist'),
  ...pick(G3_JOBS_WORDS, 'nurse', 'singer'),
  ...pick(G4_JOBS_WORDS, 'vet', 'reporter'),
  { id: 'engineer', topicId: t, word: 'engineer', plural: 'engineers', emoji: '⚙️', countable: true, explanation: 'Kỹ sư tiếng Anh là "engineer".' },
  { id: 'programmer', topicId: t, word: 'programmer', plural: 'programmers', emoji: '🧑‍💻', countable: true, explanation: 'Lập trình viên tiếng Anh là "programmer".' },
  { id: 'dentist', topicId: t, word: 'dentist', plural: 'dentists', emoji: '👨‍⚕️', countable: true, explanation: 'Nha sĩ tiếng Anh là "dentist".' },
  { id: 'architect', topicId: t, word: 'architect', plural: 'architects', emoji: '📐', countable: true, explanation: 'Kiến trúc sư tiếng Anh là "architect".' },
  { id: 'banker', topicId: t, word: 'banker', plural: 'bankers', emoji: '💳', countable: true, explanation: 'Nhân viên ngân hàng tiếng Anh là "banker".' },
];
