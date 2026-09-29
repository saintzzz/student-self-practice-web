import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { SPORTS_WORDS } from '../sports';
import { G3_HOBBIES_WORDS } from './hobbies';

export const G3_SPORTS_GAMES_TOPIC: Topic = { id: 'g3-sports-games', gradeId: 'grade-3', name: 'Thể thao và trò chơi' };

const t = G3_SPORTS_GAMES_TOPIC.id;

/** Global Success G3 break-time/sports unit - team sports plus playground games.
    football reuses ⚽ (the same ball as 'ball') - recorded as a sanctioned
    shared-emoji pair in bank.test.ts (AC-6.3 note for CR-07). */
export const G3_SPORTS_GAMES_WORDS: VocabWord[] = [
  { id: 'football', topicId: t, word: 'football', plural: 'footballs', emoji: '⚽', countable: true, explanation: 'Bóng đá tiếng Anh là "football".' },
  ...pick(SPORTS_WORDS, 'basketball', 'badminton', 'volleyball', 'table-tennis'),
  ...pick(G3_HOBBIES_WORDS, 'chess'),
  { id: 'hide-and-seek', topicId: t, word: 'hide and seek', emoji: '🫣', countable: false, explanation: 'Trò chơi trốn tìm tiếng Anh là "hide and seek".' },
];
