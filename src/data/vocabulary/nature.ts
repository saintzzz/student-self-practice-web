import type { Topic, VocabWord } from '../../types';

export const NATURE_TOPIC: Topic = { id: 'g2-nature', gradeId: 'grade-2', name: 'Thiên nhiên' };

const t = NATURE_TOPIC.id;

export const NATURE_WORDS: VocabWord[] = [
  { id: 'tree', topicId: t, word: 'tree', plural: 'trees', emoji: '🌳', countable: true, explanation: 'Cây tiếng Anh là "tree".' },
  { id: 'flower', topicId: t, word: 'flower', plural: 'flowers', emoji: '🌸', countable: true, explanation: 'Bông hoa tiếng Anh là "flower".' },
  { id: 'leaf', topicId: t, word: 'leaf', plural: 'leaves', emoji: '🍃', countable: true, explanation: 'Chiếc lá tiếng Anh là "leaf".' },
  { id: 'mountain', topicId: t, word: 'mountain', plural: 'mountains', emoji: '⛰️', countable: true, explanation: 'Ngọn núi tiếng Anh là "mountain".' },
  { id: 'rock', topicId: t, word: 'rock', plural: 'rocks', emoji: '🪨', countable: true, explanation: 'Hòn đá tiếng Anh là "rock".' },
  // "ocean" and "fire" are not countable in everyday usage for a 7-year-old learner.
  { id: 'ocean', topicId: t, word: 'ocean', emoji: '🌊', countable: false, explanation: 'Đại dương tiếng Anh là "ocean".' },
  { id: 'fire', topicId: t, word: 'fire', emoji: '🔥', countable: false, explanation: 'Lửa tiếng Anh là "fire".' },
  // v5 vocabulary additions (plan.md "v5 Research-Grounded Content").
  { id: 'shell', topicId: t, word: 'shell', plural: 'shells', emoji: '🐚', countable: true, explanation: 'Vỏ sò tiếng Anh là "shell".' },
  { id: 'water', topicId: t, word: 'water', emoji: '💧', countable: false, explanation: 'Nước tiếng Anh là "water".' },
];
