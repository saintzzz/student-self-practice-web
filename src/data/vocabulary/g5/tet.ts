import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { CAMPING_WORDS } from '../camping';
import { G4_BIRTHDAY_WORDS } from '../g4/birthday';
import { FRUITS_WORDS } from '../fruits';

export const G5_TET_TOPIC: Topic = { id: 'g5-tet', gradeId: 'grade-5', name: 'Tết và lễ hội' };

const t = G5_TET_TOPIC.id;

/** Global Success G5 Tet/special-days unit - Vietnamese festival words.
    'mid-autumn' lives in g5-special-days; 🏮 is shared with 'lantern'
    there and recorded as a sanctioned pair in bank.test.ts. */
export const G5_TET_WORDS: VocabWord[] = [
  { id: 'firecracker', topicId: t, word: 'firecracker', plural: 'firecrackers', emoji: '🧨', countable: true, explanation: 'Pháo Tết tiếng Anh là "firecracker".' },
  { id: 'red-envelope', topicId: t, word: 'red envelope', plural: 'red envelopes', emoji: '🧧', countable: true, explanation: 'Bao lì xì tiếng Anh là "red envelope".' },
  { id: 'dragon-dance', topicId: t, word: 'dragon dance', plural: 'dragon dances', emoji: '🐲', countable: true, explanation: 'Điệu múa rồng tiếng Anh là "dragon dance".' },
  { id: 'apricot-blossom', topicId: t, word: 'apricot blossom', plural: 'apricot blossoms', emoji: '🏵️', countable: true, explanation: 'Hoa mai tiếng Anh là "apricot blossom".' },
  { id: 'festival', topicId: t, word: 'festival', plural: 'festivals', emoji: '🎏', countable: true, explanation: 'Lễ hội tiếng Anh là "festival".' },
  { id: 'mooncake', topicId: t, word: 'mooncake', plural: 'mooncakes', emoji: '🥮', countable: true, explanation: 'Bánh trung thu tiếng Anh là "mooncake".' },
  ...pick(CAMPING_WORDS, 'lantern'),
  ...pick(G4_BIRTHDAY_WORDS, 'firework'),
  ...pick(FRUITS_WORDS, 'watermelon'),
];
