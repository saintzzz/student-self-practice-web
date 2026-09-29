import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { TOYS_WORDS } from '../toys';

export const G1_TOYS_TOPIC: Topic = { id: 'g1-toys', gradeId: 'grade-1', name: 'Đồ chơi' };

/** Global Success G1 toys unit + yo-yo (Cambridge Starters). */
export const G1_TOYS_WORDS: VocabWord[] = [
  ...pick(TOYS_WORDS, 'ball', 'kite', 'doll', 'balloon', 'robot', 'puzzle', 'teddy-bear'),
  { id: 'yo-yo', topicId: G1_TOYS_TOPIC.id, word: 'yo-yo', plural: 'yo-yos', emoji: '🪀', countable: true, explanation: 'Con yo-yo tiếng Anh là "yo-yo".' },
];
