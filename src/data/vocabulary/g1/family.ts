import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { FAMILY_WORDS } from '../family';

export const G1_FAMILY_TOPIC: Topic = { id: 'g1-family', gradeId: 'grade-1', name: 'Gia đình' };

/** Global Success G1 family members unit + friend (Cambridge Starters). */
export const G1_FAMILY_WORDS: VocabWord[] = [
  ...pick(FAMILY_WORDS, 'mom', 'dad', 'grandma', 'grandpa', 'sister', 'brother', 'baby'),
  { id: 'friend', topicId: G1_FAMILY_TOPIC.id, word: 'friend', plural: 'friends', emoji: '🧑‍🤝‍🧑', countable: true, explanation: 'Người bạn tiếng Anh là "friend".' },
];
