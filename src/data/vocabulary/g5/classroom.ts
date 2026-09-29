import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { SCHOOL_OBJECTS_WORDS } from '../schoolObjects';
import { FURNITURE_WORDS } from '../furniture';

export const G5_CLASSROOM_TOPIC: Topic = { id: 'g5-classroom', gradeId: 'grade-5', name: 'Lớp học' };

const t = G5_CLASSROOM_TOPIC.id;

/** Global Success G5 classroom unit - boards, lockers and posters plus shared supplies. */
export const G5_CLASSROOM_WORDS: VocabWord[] = [
  { id: 'whiteboard', topicId: t, word: 'whiteboard', plural: 'whiteboards', emoji: '⬜', countable: true, explanation: 'Bảng trắng tiếng Anh là "whiteboard".' },
  { id: 'projector', topicId: t, word: 'projector', plural: 'projectors', emoji: '📽️', countable: true, explanation: 'Máy chiếu tiếng Anh là "projector".' },
  { id: 'locker', topicId: t, word: 'locker', plural: 'lockers', emoji: '🗄️', countable: true, explanation: 'Tủ đồ cá nhân tiếng Anh là "locker".' },
  { id: 'poster', topicId: t, word: 'poster', plural: 'posters', emoji: '🪧', countable: true, explanation: 'Áp phích tiếng Anh là "poster".' },
  ...pick(SCHOOL_OBJECTS_WORDS, 'pencil', 'ruler', 'calendar', 'pushpin'),
  ...pick(FURNITURE_WORDS, 'clock'),
];
