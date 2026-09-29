import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { G3_SPORTS_GAMES_WORDS } from '../g3/sportsGames';

export const G5_CLUB_ACTIVITIES_TOPIC: Topic = { id: 'g5-club-activities', gradeId: 'grade-5', name: 'Hoạt động câu lạc bộ' };

const t = G5_CLUB_ACTIVITIES_TOPIC.id;

/** Global Success G5 school-activities unit - clubs and competitions. */
export const G5_CLUB_ACTIVITIES_WORDS: VocabWord[] = [
  ...pick(G3_SPORTS_GAMES_WORDS, 'chess', 'football', 'badminton'),
  { id: 'quiz', topicId: t, word: 'quiz', plural: 'quizzes', emoji: '❓', countable: true, explanation: 'Cuộc đố vui tiếng Anh là "quiz".' },
  { id: 'contest', topicId: t, word: 'contest', plural: 'contests', emoji: '🏅', countable: true, explanation: 'Cuộc thi tiếng Anh là "contest".' },
  { id: 'drama', topicId: t, word: 'drama', emoji: '🎭', countable: false, explanation: 'Hoạt động kịch tiếng Anh là "drama".' },
  { id: 'debate', topicId: t, word: 'debate', plural: 'debates', emoji: '💬', countable: true, explanation: 'Cuộc tranh luận tiếng Anh là "debate".' },
  { id: 'volunteer', topicId: t, word: 'volunteer', plural: 'volunteers', emoji: '🙋', countable: true, explanation: 'Tình nguyện viên tiếng Anh là "volunteer".' },
  { id: 'recorder', topicId: t, word: 'recorder', plural: 'recorders', emoji: '🪈', countable: true, explanation: 'Sáo recorder tiếng Anh là "recorder".' },
];
