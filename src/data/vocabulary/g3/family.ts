import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { FAMILY_WORDS } from '../family';
import { G1_FAMILY_WORDS } from '../g1/family';

export const G3_FAMILY_TOPIC: Topic = { id: 'g3-family', gradeId: 'grade-3', name: 'Gia đình' };

const t = G3_FAMILY_TOPIC.id;

/** Global Success G3 family unit - shared members plus aunt, uncle, cousin.
    People follow the family convention (identities, not physical objects): countable: false. */
export const G3_FAMILY_WORDS: VocabWord[] = [
  ...pick(FAMILY_WORDS, 'mom', 'dad', 'grandma', 'grandpa', 'sister', 'brother', 'baby'),
  ...pick(G1_FAMILY_WORDS, 'friend'),
  { id: 'aunt', topicId: t, word: 'aunt', emoji: '👩‍🦱', countable: false, explanation: 'Cô, dì, bác gái tiếng Anh là "aunt".' },
  { id: 'uncle', topicId: t, word: 'uncle', emoji: '🧔', countable: false, explanation: 'Chú, bác trai tiếng Anh là "uncle".' },
  { id: 'cousin', topicId: t, word: 'cousin', emoji: '🧒', countable: false, explanation: 'Anh chị em họ tiếng Anh là "cousin".' },
];
