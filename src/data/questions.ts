import type { Grade, Topic, Question } from '../types';

/**
 * Original vocabulary set authored for this app (not copied from any
 * external source). One grade ("Lop 2" / Grade 2), two topics, six words
 * per topic. Each topic mixes 3 image-choice questions and 3
 * listening-fill-blank questions so every 6-question session covers both
 * question kinds (see plan.md v2 Functional Scope, item 3 and 8).
 */
export const GRADES: readonly Grade[] = [{ id: 'grade-2', name: 'Lớp 2' }];

export const TOPICS: readonly Topic[] = [
  { id: 'g2-animals', gradeId: 'grade-2', name: 'Con vật' },
  { id: 'g2-colors', gradeId: 'grade-2', name: 'Màu sắc' },
];

export const QUESTIONS: readonly Question[] = [
  // Topic: Con vật (Animals)
  {
    id: 'q-g2-animals-1',
    topicId: 'g2-animals',
    kind: 'image-choice',
    emoji: '🐱',
    options: ['cat', 'dog', 'fish', 'bird'],
    correctIndex: 0,
    explanation: 'Con mèo tiếng Anh là "cat".',
  },
  {
    id: 'q-g2-animals-2',
    topicId: 'g2-animals',
    kind: 'image-choice',
    emoji: '🐶',
    options: ['fish', 'dog', 'bird', 'rabbit'],
    correctIndex: 1,
    explanation: 'Con chó tiếng Anh là "dog".',
  },
  {
    id: 'q-g2-animals-3',
    topicId: 'g2-animals',
    kind: 'image-choice',
    emoji: '🐟',
    options: ['bird', 'rabbit', 'fish', 'elephant'],
    correctIndex: 2,
    explanation: 'Con cá tiếng Anh là "fish".',
  },
  {
    id: 'q-g2-animals-4',
    topicId: 'g2-animals',
    kind: 'listening-fill-blank',
    word: 'bird',
    explanation: 'Con chim tiếng Anh là "bird".',
  },
  {
    id: 'q-g2-animals-5',
    topicId: 'g2-animals',
    kind: 'listening-fill-blank',
    word: 'rabbit',
    explanation: 'Con thỏ tiếng Anh là "rabbit".',
  },
  {
    id: 'q-g2-animals-6',
    topicId: 'g2-animals',
    kind: 'listening-fill-blank',
    word: 'elephant',
    explanation: 'Con voi tiếng Anh là "elephant".',
  },
  // Topic: Màu sắc (Colors)
  {
    id: 'q-g2-colors-1',
    topicId: 'g2-colors',
    kind: 'image-choice',
    emoji: '🔴',
    options: ['red', 'blue', 'yellow', 'green'],
    correctIndex: 0,
    explanation: 'Màu đỏ tiếng Anh là "red".',
  },
  {
    id: 'q-g2-colors-2',
    topicId: 'g2-colors',
    kind: 'image-choice',
    emoji: '🔵',
    options: ['yellow', 'blue', 'green', 'orange'],
    correctIndex: 1,
    explanation: 'Màu xanh dương tiếng Anh là "blue".',
  },
  {
    id: 'q-g2-colors-3',
    topicId: 'g2-colors',
    kind: 'image-choice',
    emoji: '🟡',
    options: ['green', 'orange', 'yellow', 'purple'],
    correctIndex: 2,
    explanation: 'Màu vàng tiếng Anh là "yellow".',
  },
  {
    id: 'q-g2-colors-4',
    topicId: 'g2-colors',
    kind: 'listening-fill-blank',
    word: 'green',
    explanation: 'Màu xanh lá tiếng Anh là "green".',
  },
  {
    id: 'q-g2-colors-5',
    topicId: 'g2-colors',
    kind: 'listening-fill-blank',
    word: 'orange',
    explanation: 'Màu cam tiếng Anh là "orange".',
  },
  {
    id: 'q-g2-colors-6',
    topicId: 'g2-colors',
    kind: 'listening-fill-blank',
    word: 'purple',
    explanation: 'Màu tím tiếng Anh là "purple".',
  },
];

export function getTopicsByGrade(gradeId: string): Topic[] {
  return TOPICS.filter((topic) => topic.gradeId === gradeId);
}

export function getQuestionsByTopic(topicId: string): Question[] {
  return QUESTIONS.filter((question) => question.topicId === topicId);
}
