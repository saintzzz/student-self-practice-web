import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { COLORS_WORDS } from '../colors';

export const G1_COLORS_TOPIC: Topic = { id: 'g1-colors', gradeId: 'grade-1', name: 'Màu sắc' };

/** Global Success G1 colours unit + pink (Cambridge Starters). */
export const G1_COLORS_WORDS: VocabWord[] = [
  ...pick(COLORS_WORDS, 'red', 'yellow', 'green', 'blue', 'orange', 'black', 'white'),
  { id: 'pink', topicId: G1_COLORS_TOPIC.id, word: 'pink', emoji: '🩷', countable: false, explanation: 'Màu hồng tiếng Anh là "pink".' },
];
