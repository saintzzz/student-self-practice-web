import type { Topic, VocabWord } from '../../types';

export const INSTRUMENTS_TOPIC: Topic = { id: 'g2-instruments', gradeId: 'grade-2', name: 'Nhạc cụ' };

const t = INSTRUMENTS_TOPIC.id;

export const INSTRUMENTS_WORDS: VocabWord[] = [
  { id: 'guitar', topicId: t, word: 'guitar', plural: 'guitars', emoji: '🎸', countable: true, explanation: 'Đàn ghi ta tiếng Anh là "guitar".' },
  { id: 'piano', topicId: t, word: 'piano', plural: 'pianos', emoji: '🎹', countable: true, explanation: 'Đàn piano tiếng Anh là "piano".' },
  { id: 'violin', topicId: t, word: 'violin', plural: 'violins', emoji: '🎻', countable: true, explanation: 'Đàn vi-ô-lông tiếng Anh là "violin".' },
  { id: 'trumpet', topicId: t, word: 'trumpet', plural: 'trumpets', emoji: '🎺', countable: true, explanation: 'Kèn trumpet tiếng Anh là "trumpet".' },
  { id: 'saxophone', topicId: t, word: 'saxophone', plural: 'saxophones', emoji: '🎷', countable: true, explanation: 'Kèn saxophone tiếng Anh là "saxophone".' },
  { id: 'accordion', topicId: t, word: 'accordion', plural: 'accordions', emoji: '🪗', countable: true, explanation: 'Đàn accordion tiếng Anh là "accordion".' },
  { id: 'banjo', topicId: t, word: 'banjo', plural: 'banjos', emoji: '🪕', countable: true, explanation: 'Đàn banjo tiếng Anh là "banjo".' },
];
