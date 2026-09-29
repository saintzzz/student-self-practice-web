import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { G4_HOMES_WORDS } from '../g4/homes';
import { TOYS_WORDS } from '../toys';

export const G5_STORIES_TOPIC: Topic = { id: 'g5-stories', gradeId: 'grade-5', name: 'Nhân vật truyện cổ tích' };

const t = G5_STORIES_TOPIC.id;

/** Global Success G5 stories unit - fairy-tale characters and fantasy nouns. */
export const G5_STORIES_WORDS: VocabWord[] = [
  { id: 'king', topicId: t, word: 'king', plural: 'kings', emoji: '🤴', countable: true, explanation: 'Nhà vua tiếng Anh là "king".' },
  { id: 'princess', topicId: t, word: 'princess', plural: 'princesses', emoji: '👸', countable: true, explanation: 'Công chúa tiếng Anh là "princess".' },
  { id: 'queen', topicId: t, word: 'queen', plural: 'queens', emoji: '🫅', countable: true, explanation: 'Nữ hoàng tiếng Anh là "queen".' },
  { id: 'witch', topicId: t, word: 'witch', plural: 'witches', emoji: '🧙‍♀️', countable: true, explanation: 'Mụ phù thủy tiếng Anh là "witch".' },
  { id: 'wizard', topicId: t, word: 'wizard', plural: 'wizards', emoji: '🧙', countable: true, explanation: 'Pháp sư tiếng Anh là "wizard".' },
  { id: 'dragon', topicId: t, word: 'dragon', plural: 'dragons', emoji: '🐉', countable: true, explanation: 'Con rồng tiếng Anh là "dragon".' },
  { id: 'giant', topicId: t, word: 'giant', plural: 'giants', emoji: '🧌', countable: true, explanation: 'Người khổng lồ tiếng Anh là "giant".' },
  { id: 'fairy', topicId: t, word: 'fairy', plural: 'fairies', emoji: '🧚', countable: true, explanation: 'Nàng tiên tiếng Anh là "fairy".' },
  { id: 'ghost', topicId: t, word: 'ghost', plural: 'ghosts', emoji: '👻', countable: true, explanation: 'Con ma tiếng Anh là "ghost".' },
  { id: 'alien', topicId: t, word: 'alien', plural: 'aliens', emoji: '👽', countable: true, explanation: 'Người ngoài hành tinh tiếng Anh là "alien".' },
  { id: 'treasure', topicId: t, word: 'treasure', plural: 'treasures', emoji: '💎', countable: true, explanation: 'Kho báu tiếng Anh là "treasure".' },
  ...pick(G4_HOMES_WORDS, 'castle'),
  ...pick(TOYS_WORDS, 'robot'),
];
