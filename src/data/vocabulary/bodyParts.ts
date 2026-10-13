import type { Topic, VocabWord } from '../../types';

export const BODY_PARTS_TOPIC: Topic = { id: 'g2-body-parts', gradeId: 'grade-2', name: 'Bộ phận cơ thể' };

const t = BODY_PARTS_TOPIC.id;

// Body parts are countable - children count eyes, ears and hands naturally.
export const BODY_PARTS_WORDS: VocabWord[] = [
  { id: 'eye', topicId: t, word: 'eye', plural: 'eyes', emoji: '👁️', countable: true, explanation: 'Con mắt tiếng Anh là "eye".' },
  { id: 'ear', topicId: t, word: 'ear', plural: 'ears', emoji: '👂', countable: true, explanation: 'Cái tai tiếng Anh là "ear".' },
  { id: 'hand', topicId: t, word: 'hand', plural: 'hands', emoji: '✋', countable: true, explanation: 'Bàn tay tiếng Anh là "hand".' },
  { id: 'foot', topicId: t, word: 'foot', plural: 'feet', emoji: '🦶', countable: true, explanation: 'Bàn chân tiếng Anh là "foot".' },
  { id: 'nose', topicId: t, word: 'nose', plural: 'noses', emoji: '👃', countable: true, explanation: 'Cái mũi tiếng Anh là "nose".' },
  { id: 'mouth', topicId: t, word: 'mouth', plural: 'mouths', emoji: '👄', countable: true, explanation: 'Cái miệng tiếng Anh là "mouth".' },
  { id: 'leg', topicId: t, word: 'leg', plural: 'legs', emoji: '🦵', countable: true, explanation: 'Chân tiếng Anh là "leg".' },
];
