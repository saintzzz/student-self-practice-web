import type { Topic, VocabWord } from '../../types';

export const SPORTS_TOPIC: Topic = { id: 'g2-sports', gradeId: 'grade-2', name: 'Thể thao' };

const t = SPORTS_TOPIC.id;

/**
 * These are sport/game names, which English does not normally pluralize
 * ("2 tennis" is not natural), so none are marked countable here.
 */
export const SPORTS_WORDS: VocabWord[] = [
  { id: 'basketball', topicId: t, word: 'basketball', emoji: '🏀', countable: false, explanation: 'Bóng rổ tiếng Anh là "basketball".' },
  { id: 'tennis', topicId: t, word: 'tennis', emoji: '🎾', countable: false, explanation: 'Quần vợt tiếng Anh là "tennis".' },
  { id: 'badminton', topicId: t, word: 'badminton', emoji: '🏸', countable: false, explanation: 'Cầu lông tiếng Anh là "badminton".' },
  { id: 'volleyball', topicId: t, word: 'volleyball', emoji: '🏐', countable: false, explanation: 'Bóng chuyền tiếng Anh là "volleyball".' },
  { id: 'golf', topicId: t, word: 'golf', emoji: '⛳', countable: false, explanation: 'Golf tiếng Anh là "golf".' },
  { id: 'bowling', topicId: t, word: 'bowling', emoji: '🎳', countable: false, explanation: 'Bowling tiếng Anh là "bowling".' },
  { id: 'boxing', topicId: t, word: 'boxing', emoji: '🥊', countable: false, explanation: 'Quyền anh tiếng Anh là "boxing".' },
  { id: 'skateboard', topicId: t, word: 'skateboard', emoji: '🛹', countable: false, explanation: 'Ván trượt tiếng Anh là "skateboard".' },
  { id: 'surfing', topicId: t, word: 'surfing', emoji: '🏄', countable: false, explanation: 'Lướt sóng tiếng Anh là "surfing".' },
  // v5 vocabulary additions (plan.md "v5 Research-Grounded Content"). "badminton",
  // "tennis" and "basketball" were also on the approved list but already exist
  // above and were skipped.
  { id: 'table-tennis', topicId: t, word: 'table tennis', emoji: '🏓', countable: false, explanation: 'Bóng bàn tiếng Anh là "table tennis".' },
  { id: 'baseball', topicId: t, word: 'baseball', emoji: '⚾', countable: false, explanation: 'Bóng chày tiếng Anh là "baseball".' },
  { id: 'hockey', topicId: t, word: 'hockey', emoji: '🏒', countable: false, explanation: 'Khúc côn cầu tiếng Anh là "hockey".' },
  { id: 'swimming', topicId: t, word: 'swimming', emoji: '🏊', countable: false, explanation: 'Bơi lội tiếng Anh là "swimming".' },
];
