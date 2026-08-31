import { vi } from 'vitest';
import type {
  CountingImageQuestion,
  DescribeAndChooseImageQuestion,
  ExtraLetterQuestion,
  ImageChoiceQuestion,
  ListeningFillBlankQuestion,
  ListeningSentenceFillBlankQuestion,
  PronunciationRecordingQuestion,
} from '../types';

/** Shared fixtures for QuestionCard.test.tsx and QuestionCard.counting-extra.test.tsx. */
export const IMAGE_QUESTION: ImageChoiceQuestion = {
  id: 'q1',
  topicId: 't1',
  kind: 'image-choice',
  emoji: '🐱',
  options: ['cat', 'dog', 'fish', 'bird'],
  correctIndex: 0,
  explanation: 'Con mèo tiếng Anh là "cat".',
};

export const LISTENING_QUESTION: ListeningFillBlankQuestion = {
  id: 'q2',
  topicId: 't1',
  kind: 'listening-fill-blank',
  word: 'rabbit',
  explanation: 'Con thỏ tiếng Anh là "rabbit".',
};

export const COUNTING_QUESTION: CountingImageQuestion = {
  id: 'q3',
  topicId: 't1',
  kind: 'counting-image',
  direction: 'image-to-count',
  prompt: { word: 'cat', plural: 'cats', emoji: '🐱', count: 3 },
  options: [
    { word: 'cat', plural: 'cats', emoji: '🐱', count: 3 },
    { word: 'cat', plural: 'cats', emoji: '🐱', count: 2 },
    { word: 'dog', plural: 'dogs', emoji: '🐶', count: 3 },
    { word: 'dog', plural: 'dogs', emoji: '🐶', count: 4 },
  ],
  correctIndex: 0,
  explanation: 'Đếm số lượng trong hình rồi chọn "3 cats".',
};

export const LISTENING_SENTENCE_QUESTION: ListeningSentenceFillBlankQuestion = {
  id: 'q5',
  topicId: 't1',
  kind: 'listening-sentence-fill-blank',
  word: 'cat',
  sentence: 'I have a cat.',
  displaySentence: 'I have a ___.',
  explanation: 'Con mèo tiếng Anh là "cat".',
};

export const EXTRA_LETTER_QUESTION: ExtraLetterQuestion = {
  id: 'q4',
  topicId: 't1',
  kind: 'extra-letter',
  correctWord: 'bird',
  displayLetters: ['b', 'i', 'r', 's', 'd'],
  extraIndex: 3,
  explanation: 'Con chim tiếng Anh là "bird". Chữ cái thừa là "s".',
};

export const PRONUNCIATION_QUESTION: PronunciationRecordingQuestion = {
  id: 'q6',
  topicId: 't1',
  kind: 'pronunciation-recording',
  word: 'cat',
  explanation: 'Con mèo tiếng Anh là "cat".',
};

export const DESCRIBE_IMAGE_QUESTION: DescribeAndChooseImageQuestion = {
  id: 'q7',
  topicId: 't1',
  kind: 'describe-and-choose-image',
  descriptionType: 'count',
  sentence: 'There are 3 cats.',
  options: [
    { word: 'cat', plural: 'cats', emoji: '🐱', count: 3 },
    { word: 'cat', plural: 'cats', emoji: '🐱', count: 2 },
    { word: 'dog', plural: 'dogs', emoji: '🐶', count: 3 },
    { word: 'dog', plural: 'dogs', emoji: '🐶', count: 4 },
  ],
  correctIndex: 0,
  explanation: 'Chọn hình có 3 cats. Con mèo tiếng Anh là "cat".',
};

export const noopHandlers = {
  onSubmitOption: vi.fn(),
  onSubmitListening: vi.fn(),
  onSubmitExtraLetter: vi.fn(),
  onSubmitPronunciation: vi.fn(),
  onNext: vi.fn(),
};
