import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { CLOTHES_WORDS } from '../clothes';

export const G3_CLOTHES_TOPIC: Topic = { id: 'g3-clothes', gradeId: 'grade-3', name: 'Quần áo' };

const t = G3_CLOTHES_TOPIC.id;

/** Global Success G3 clothes unit - shared wardrobe plus cap, blouse, sandals. */
export const G3_CLOTHES_WORDS: VocabWord[] = [
  ...pick(CLOTHES_WORDS, 'shirt', 'pants', 'shoe', 'hat', 'sock', 'dress', 'jacket', 'scarf', 'glove'),
  { id: 'cap', topicId: t, word: 'cap', plural: 'caps', emoji: '🧢', countable: true, explanation: 'Mũ lưỡi trai tiếng Anh là "cap".' },
  { id: 'blouse', topicId: t, word: 'blouse', plural: 'blouses', emoji: '👚', countable: true, explanation: 'Áo sơ mi nữ tiếng Anh là "blouse".' },
  { id: 'sandals', topicId: t, word: 'sandals', emoji: '🩴', countable: false, explanation: 'Dép xăng đan tiếng Anh là "sandals".' },
];
