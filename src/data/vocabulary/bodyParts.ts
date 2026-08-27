import type { Topic, VocabWord } from '../../types';

export const BODY_PARTS_TOPIC: Topic = { id: 'g2-body-parts', gradeId: 'grade-2', name: 'Bộ phận cơ thể' };

const t = BODY_PARTS_TOPIC.id;

export const BODY_PARTS_WORDS: VocabWord[] = [
  { id: 'eye', topicId: t, word: 'eye', emoji: '👁️', countable: false, explanation: 'Con mắt tiếng Anh là "eye".' },
  { id: 'ear', topicId: t, word: 'ear', emoji: '👂', countable: false, explanation: 'Cái tai tiếng Anh là "ear".' },
  { id: 'hand', topicId: t, word: 'hand', emoji: '✋', countable: false, explanation: 'Bàn tay tiếng Anh là "hand".' },
  { id: 'foot', topicId: t, word: 'foot', emoji: '🦶', countable: false, explanation: 'Bàn chân tiếng Anh là "foot".' },
  { id: 'nose', topicId: t, word: 'nose', emoji: '👃', countable: false, explanation: 'Cái mũi tiếng Anh là "nose".' },
  { id: 'mouth', topicId: t, word: 'mouth', emoji: '👄', countable: false, explanation: 'Cái miệng tiếng Anh là "mouth".' },
];
