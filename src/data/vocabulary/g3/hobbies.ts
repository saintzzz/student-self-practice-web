import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { ACTIONS_WORDS } from '../actions';

export const G3_HOBBIES_TOPIC: Topic = { id: 'g3-hobbies', gradeId: 'grade-3', name: 'Sở thích' };

const t = G3_HOBBIES_TOPIC.id;

/** Global Success G3 hobbies unit - shared action verbs plus game/pastime nouns. */
export const G3_HOBBIES_WORDS: VocabWord[] = [
  ...pick(ACTIONS_WORDS, 'sing', 'dance', 'draw', 'swim', 'skate'),
  { id: 'chess', topicId: t, word: 'chess', emoji: '♟️', countable: false, explanation: 'Cờ vua tiếng Anh là "chess".' },
  { id: 'video-game', topicId: t, word: 'video game', plural: 'video games', emoji: '🎮', countable: true, explanation: 'Trò chơi điện tử tiếng Anh là "video game".' },
  { id: 'sewing', topicId: t, word: 'sewing', emoji: '🪡', countable: false, explanation: 'Khâu vá tiếng Anh là "sewing".' },
  { id: 'gardening', topicId: t, word: 'gardening', emoji: '🪴', countable: false, explanation: 'Làm vườn tiếng Anh là "gardening".' },
  { id: 'camping', topicId: t, word: 'camping', emoji: '🏕️', countable: false, explanation: 'Đi cắm trại tiếng Anh là "camping".' },
  { id: 'cycle', topicId: t, word: 'cycle', emoji: '🚴', countable: false, explanation: 'Đạp xe tiếng Anh là "cycle".' },
];
