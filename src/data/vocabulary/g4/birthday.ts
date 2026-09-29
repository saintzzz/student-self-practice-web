import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { PARTY_WORDS } from '../party';
import { FOOD_WORDS } from '../food';
import { FURNITURE_WORDS } from '../furniture';
import { TOYS_WORDS } from '../toys';

export const G4_BIRTHDAY_TOPIC: Topic = { id: 'g4-birthday', gradeId: 'grade-4', name: 'Sinh nhật' };

const t = G4_BIRTHDAY_TOPIC.id;

/** Global Success G4 birthday-party unit - shared party words plus firework.
    'party' 🥳 and 'birthday card' 💌 stay out per the PRD 7.3 flagged list
    (🥳 reads as a happy face; 💌 reads as a love letter). */
export const G4_BIRTHDAY_WORDS: VocabWord[] = [
  ...pick(PARTY_WORDS, 'present', 'cupcake', 'lollipop', 'ribbon', 'pie'),
  ...pick(FOOD_WORDS, 'cake'),
  ...pick(FURNITURE_WORDS, 'candle'),
  ...pick(TOYS_WORDS, 'balloon'),
  { id: 'firework', topicId: t, word: 'firework', plural: 'fireworks', emoji: '🎆', countable: true, explanation: 'Pháo hoa tiếng Anh là "firework".' },
];
