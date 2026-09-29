import type { Topic, VocabWord } from '../../types';

export const SEASIDE_TOPIC: Topic = { id: 'g2-seaside', gradeId: 'grade-2', name: 'Bãi biển' };

const t = SEASIDE_TOPIC.id;

// SGK Tiếng Anh 2 Unit 3 (Seaside) gap additions (docs/sdlc/prd.md section 7.1).
export const SEASIDE_WORDS: VocabWord[] = [
  { id: 'island', topicId: t, word: 'island', plural: 'islands', emoji: '🏝️', countable: true, explanation: 'Hòn đảo tiếng Anh là "island".' },
  { id: 'seal', topicId: t, word: 'seal', plural: 'seals', emoji: '🦭', countable: true, explanation: 'Con hải cẩu tiếng Anh là "seal".' },
  { id: 'jellyfish', topicId: t, word: 'jellyfish', plural: 'jellyfish', emoji: '🪼', countable: true, explanation: 'Con sứa tiếng Anh là "jellyfish".' },
  { id: 'coral', topicId: t, word: 'coral', emoji: '🪸', countable: false, explanation: 'San hô tiếng Anh là "coral".' },
  { id: 'umbrella', topicId: t, word: 'umbrella', plural: 'umbrellas', emoji: '⛱️', countable: true, explanation: 'Cái ô che nắng tiếng Anh là "umbrella".' },
  { id: 'swimsuit', topicId: t, word: 'swimsuit', plural: 'swimsuits', emoji: '🩱', countable: true, explanation: 'Đồ bơi tiếng Anh là "swimsuit".' },
  { id: 'bucket', topicId: t, word: 'bucket', plural: 'buckets', emoji: '🪣', countable: true, explanation: 'Cái xô tiếng Anh là "bucket".' },
  { id: 'palm-tree', topicId: t, word: 'palm tree', plural: 'palm trees', emoji: '🌴', countable: true, explanation: 'Cây cọ tiếng Anh là "palm tree".' },
  { id: 'goggles', topicId: t, word: 'goggles', emoji: '🥽', countable: false, explanation: 'Kính bơi tiếng Anh là "goggles".' },
  { id: 'coconut', topicId: t, word: 'coconut', plural: 'coconuts', emoji: '🥥', countable: true, explanation: 'Quả dừa tiếng Anh là "coconut".' },
];
