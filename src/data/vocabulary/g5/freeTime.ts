import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { ACTIONS_WORDS } from '../actions';
import { G3_HOBBIES_WORDS } from '../g3/hobbies';
import { G1_TOYS_WORDS } from '../g1/toys';

export const G5_FREE_TIME_TOPIC: Topic = { id: 'g5-free-time', gradeId: 'grade-5', name: 'Thời gian rảnh' };

const t = G5_FREE_TIME_TOPIC.id;

/** Global Success G5 free-time unit - modern pastimes plus shared hobbies. */
export const G5_FREE_TIME_WORDS: VocabWord[] = [
  ...pick(ACTIONS_WORDS, 'sing', 'dance'),
  ...pick(G3_HOBBIES_WORDS, 'cycle', 'sewing', 'video-game'),
  ...pick(G1_TOYS_WORDS, 'puzzle'),
  { id: 'photography', topicId: t, word: 'photography', emoji: '📷', countable: false, explanation: 'Chụp ảnh tiếng Anh là "photography".' },
  { id: 'vlog', topicId: t, word: 'vlog', plural: 'vlogs', emoji: '📹', countable: true, explanation: 'Video nhật ký tiếng Anh là "vlog".' },
  { id: 'roller-skating', topicId: t, word: 'roller skating', emoji: '🛼', countable: false, explanation: 'Trượt patin tiếng Anh là "roller skating".' },
];
