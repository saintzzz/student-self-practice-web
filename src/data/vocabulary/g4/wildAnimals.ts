import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { ANIMALS_WORDS } from '../animals';

export const G4_WILD_ANIMALS_TOPIC: Topic = { id: 'g4-wild-animals', gradeId: 'grade-4', name: 'Động vật hoang dã' };

const t = G4_WILD_ANIMALS_TOPIC.id;

/** Global Success G4 wild-animals unit - forest and northern wildlife. */
export const G4_WILD_ANIMALS_WORDS: VocabWord[] = [
  ...pick(ANIMALS_WORDS, 'wolf', 'fox', 'bear', 'deer', 'squirrel', 'hedgehog', 'owl'),
  { id: 'eagle', topicId: t, word: 'eagle', plural: 'eagles', emoji: '🦅', countable: true, explanation: 'Chim đại bàng tiếng Anh là "eagle".' },
  { id: 'beaver', topicId: t, word: 'beaver', plural: 'beavers', emoji: '🦫', countable: true, explanation: 'Con hải ly tiếng Anh là "beaver".' },
  { id: 'otter', topicId: t, word: 'otter', plural: 'otters', emoji: '🦦', countable: true, explanation: 'Con rái cá tiếng Anh là "otter".' },
  { id: 'raccoon', topicId: t, word: 'raccoon', plural: 'raccoons', emoji: '🦝', countable: true, explanation: 'Con gấu trúc mỹ tiếng Anh là "raccoon".' },
  { id: 'skunk', topicId: t, word: 'skunk', plural: 'skunks', emoji: '🦨', countable: true, explanation: 'Con chồn hôi tiếng Anh là "skunk".' },
  { id: 'bison', topicId: t, word: 'bison', plural: 'bison', emoji: '🦬', countable: true, explanation: 'Con bò rừng bizon tiếng Anh là "bison".' },
  { id: 'bat', topicId: t, word: 'bat', plural: 'bats', emoji: '🦇', countable: true, explanation: 'Con dơi tiếng Anh là "bat".' },
];
