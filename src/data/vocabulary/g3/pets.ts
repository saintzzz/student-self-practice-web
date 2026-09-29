import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { ANIMALS_WORDS } from '../animals';
import { SEA_CREATURES_WORDS } from '../seaCreatures';

export const G3_PETS_TOPIC: Topic = { id: 'g3-pets', gradeId: 'grade-3', name: 'Thú cưng' };

const t = G3_PETS_TOPIC.id;

/** Global Success G3 pets unit - shared pets plus hamster and goldfish. */
export const G3_PETS_WORDS: VocabWord[] = [
  ...pick(ANIMALS_WORDS, 'cat', 'dog', 'fish', 'bird', 'rabbit', 'duck', 'parrot'),
  ...pick(SEA_CREATURES_WORDS, 'turtle'),
  { id: 'hamster', topicId: t, word: 'hamster', plural: 'hamsters', emoji: '🐹', countable: true, explanation: 'Con chuột hamster tiếng Anh là "hamster".' },
  { id: 'goldfish', topicId: t, word: 'goldfish', plural: 'goldfish', emoji: '🐠', countable: true, explanation: 'Con cá vàng tiếng Anh là "goldfish".' },
];
