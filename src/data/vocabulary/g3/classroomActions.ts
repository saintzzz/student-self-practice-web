import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { ACTIONS_WORDS } from '../actions';

export const G3_CLASSROOM_ACTIONS_TOPIC: Topic = { id: 'g3-classroom-actions', gradeId: 'grade-3', name: 'Khẩu lệnh lớp học' };

const t = G3_CLASSROOM_ACTIONS_TOPIC.id;

/** Global Success G3 classroom-instruction verbs (stand up, sit down, listen, look, point) + shared actions. */
export const G3_CLASSROOM_ACTIONS_WORDS: VocabWord[] = [
  ...pick(ACTIONS_WORDS, 'write', 'read', 'draw', 'clap'),
  { id: 'stand', topicId: t, word: 'stand', emoji: '🧍', countable: false, explanation: '"Stand" nghĩa là đứng lên.' },
  { id: 'sit', topicId: t, word: 'sit', emoji: '🧎', countable: false, explanation: '"Sit" nghĩa là ngồi xuống.' },
  { id: 'listen', topicId: t, word: 'listen', emoji: '🎧', countable: false, explanation: '"Listen" nghĩa là nghe, lắng nghe.' },
  { id: 'point', topicId: t, word: 'point', emoji: '👉', countable: false, explanation: '"Point" nghĩa là chỉ vào.' },
  { id: 'look', topicId: t, word: 'look', emoji: '👀', countable: false, explanation: '"Look" nghĩa là nhìn, xem.' },
];
