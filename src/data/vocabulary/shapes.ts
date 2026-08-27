import type { Topic, VocabWord } from '../../types';

export const SHAPES_TOPIC: Topic = { id: 'g2-shapes', gradeId: 'grade-2', name: 'Hình dạng' };

const t = SHAPES_TOPIC.id;

export const SHAPES_WORDS: VocabWord[] = [
  { id: 'circle', topicId: t, word: 'circle', plural: 'circles', emoji: '⭕', countable: true, explanation: 'Hình tròn tiếng Anh là "circle".' },
  { id: 'square', topicId: t, word: 'square', plural: 'squares', emoji: '⬛', countable: true, explanation: 'Hình vuông tiếng Anh là "square".' },
  { id: 'triangle', topicId: t, word: 'triangle', plural: 'triangles', emoji: '🔺', countable: true, explanation: 'Hình tam giác tiếng Anh là "triangle".' },
  { id: 'star', topicId: t, word: 'star', plural: 'stars', emoji: '⭐', countable: true, explanation: 'Hình ngôi sao tiếng Anh là "star".' },
  { id: 'heart', topicId: t, word: 'heart', plural: 'hearts', emoji: '❤️', countable: true, explanation: 'Hình trái tim tiếng Anh là "heart".' },
  { id: 'diamond', topicId: t, word: 'diamond', plural: 'diamonds', emoji: '🔶', countable: true, explanation: 'Hình thoi tiếng Anh là "diamond".' },
];
