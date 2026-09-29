import type { Topic, VocabWord } from '../../types';

export const PARTY_TOPIC: Topic = { id: 'g2-party', gradeId: 'grade-2', name: 'Tiệc sinh nhật' };

const t = PARTY_TOPIC.id;

// SGK Tiếng Anh 2 Unit 1 (Birthday party) gap additions (docs/sdlc/prd.md section 7.1).
export const PARTY_WORDS: VocabWord[] = [
  { id: 'present', topicId: t, word: 'present', plural: 'presents', emoji: '🎁', countable: true, explanation: 'Món quà tiếng Anh là "present".' },
  { id: 'cupcake', topicId: t, word: 'cupcake', plural: 'cupcakes', emoji: '🧁', countable: true, explanation: 'Bánh nướng nhỏ tiếng Anh là "cupcake".' },
  { id: 'lollipop', topicId: t, word: 'lollipop', plural: 'lollipops', emoji: '🍭', countable: true, explanation: 'Kẹo mút tiếng Anh là "lollipop".' },
  { id: 'ribbon', topicId: t, word: 'ribbon', plural: 'ribbons', emoji: '🎀', countable: true, explanation: 'Cái nơ ruy băng tiếng Anh là "ribbon".' },
  { id: 'pasta', topicId: t, word: 'pasta', emoji: '🍝', countable: false, explanation: 'Mì Ý tiếng Anh là "pasta".' },
  { id: 'pie', topicId: t, word: 'pie', plural: 'pies', emoji: '🥧', countable: true, explanation: 'Bánh nướng có nhân tiếng Anh là "pie".' },
  { id: 'hot-dog', topicId: t, word: 'hot dog', plural: 'hot dogs', emoji: '🌭', countable: true, explanation: 'Bánh mì kẹp xúc xích tiếng Anh là "hot dog".' },
  { id: 'bubble-tea', topicId: t, word: 'bubble tea', emoji: '🧋', countable: false, explanation: 'Trà sữa trân châu tiếng Anh là "bubble tea".' },
];
