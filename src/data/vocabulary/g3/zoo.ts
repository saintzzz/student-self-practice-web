import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { ANIMALS_WORDS } from '../animals';

export const G3_ZOO_TOPIC: Topic = { id: 'g3-zoo', gradeId: 'grade-3', name: 'Sở thú' };

const t = G3_ZOO_TOPIC.id;

/** Global Success G3 zoo unit - safari animals, shared plus gorilla, rhinoceros, flamingo. */
export const G3_ZOO_WORDS: VocabWord[] = [
  ...pick(ANIMALS_WORDS, 'elephant', 'lion', 'tiger', 'monkey', 'panda', 'zebra', 'giraffe', 'crocodile', 'kangaroo', 'hippo', 'peacock', 'parrot'),
  { id: 'gorilla', topicId: t, word: 'gorilla', plural: 'gorillas', emoji: '🦍', countable: true, explanation: 'Con khỉ đột tiếng Anh là "gorilla".' },
  { id: 'rhinoceros', topicId: t, word: 'rhinoceros', plural: 'rhinoceroses', emoji: '🦏', countable: true, explanation: 'Con tê giác tiếng Anh là "rhinoceros".' },
  { id: 'flamingo', topicId: t, word: 'flamingo', plural: 'flamingos', emoji: '🦩', countable: true, explanation: 'Chim hồng hạc tiếng Anh là "flamingo".' },
];
