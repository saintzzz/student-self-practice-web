import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { ACTIONS_WORDS } from '../actions';

export const G4_ABILITIES_TOPIC: Topic = { id: 'g4-abilities', gradeId: 'grade-4', name: 'Khả năng' };

const t = G4_ABILITIES_TOPIC.id;

/** Global Success G4 abilities unit ("What can you do?") - shared action verbs plus new skills. */
export const G4_ABILITIES_WORDS: VocabWord[] = [
  ...pick(ACTIONS_WORDS, 'cook', 'sing', 'dance', 'swim', 'skate'),
  { id: 'ski', topicId: t, word: 'ski', emoji: '⛷️', countable: false, explanation: 'Trượt tuyết tiếng Anh là "ski".' },
  { id: 'dive', topicId: t, word: 'dive', emoji: '🤿', countable: false, explanation: 'Lặn biển tiếng Anh là "dive".' },
  { id: 'snowboard', topicId: t, word: 'snowboard', emoji: '🏂', countable: false, explanation: 'Trượt ván trên tuyết tiếng Anh là "snowboard".' },
  { id: 'juggle', topicId: t, word: 'juggle', emoji: '🤹', countable: false, explanation: 'Tung hứng tiếng Anh là "juggle".' },
];
