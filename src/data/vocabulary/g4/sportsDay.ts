import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { SPORTS_WORDS } from '../sports';
import { G3_SPORTS_GAMES_WORDS } from '../g3/sportsGames';

export const G4_SPORTS_DAY_TOPIC: Topic = { id: 'g4-sports-day', gradeId: 'grade-4', name: 'Ngày hội thể thao' };

const t = G4_SPORTS_DAY_TOPIC.id;

/** Global Success G4 sports-day unit - events and prizes plus shared sports for review. */
export const G4_SPORTS_DAY_WORDS: VocabWord[] = [
  ...pick(G3_SPORTS_GAMES_WORDS, 'football', 'basketball', 'volleyball'),
  ...pick(SPORTS_WORDS, 'tennis'),
  { id: 'race', topicId: t, word: 'race', plural: 'races', emoji: '🏁', countable: true, explanation: 'Cuộc đua tiếng Anh là "race".' },
  { id: 'medal', topicId: t, word: 'medal', plural: 'medals', emoji: '🥇', countable: true, explanation: 'Huy chương tiếng Anh là "medal".' },
  { id: 'trophy', topicId: t, word: 'trophy', plural: 'trophies', emoji: '🏆', countable: true, explanation: 'Cúp vô địch tiếng Anh là "trophy".' },
  { id: 'team', topicId: t, word: 'team', plural: 'teams', emoji: '👥', countable: true, explanation: 'Đội thi đấu tiếng Anh là "team".' },
  { id: 'goal', topicId: t, word: 'goal', plural: 'goals', emoji: '🥅', countable: true, explanation: 'Khung thành, bàn thắng tiếng Anh là "goal".' },
  { id: 'cheer', topicId: t, word: 'cheer', emoji: '📣', countable: false, explanation: '"Cheer" nghĩa là cổ vũ.' },
];
