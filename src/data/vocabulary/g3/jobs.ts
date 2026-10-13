import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { OCCUPATIONS_WORDS } from '../occupations';

export const G3_JOBS_TOPIC: Topic = { id: 'g3-jobs', gradeId: 'grade-3', name: 'Nghề nghiệp' };

const t = G3_JOBS_TOPIC.id;

/** Global Success G3 jobs unit - shared occupations plus nurse, soldier, singer.
    Jobs follow the occupations convention (identities, not physical objects): countable: false. */
export const G3_JOBS_WORDS: VocabWord[] = [
  ...pick(OCCUPATIONS_WORDS, 'doctor', 'teacher', 'farmer', 'policeman', 'firefighter', 'pilot'),
  { id: 'nurse', topicId: t, word: 'nurse', emoji: '👩‍⚕️', countable: false, explanation: 'Y tá tiếng Anh là "nurse".' },
  { id: 'soldier', topicId: t, word: 'soldier', emoji: '💂', countable: false, explanation: 'Người lính tiếng Anh là "soldier".' },
  { id: 'singer', topicId: t, word: 'singer', emoji: '🧑‍🎤', countable: false, explanation: 'Ca sĩ tiếng Anh là "singer".' },
];
