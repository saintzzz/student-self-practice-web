export interface Grade {
  id: string;
  name: string;
}

export interface Topic {
  id: string;
  gradeId: string;
  name: string;
}

/**
 * A single curated vocabulary entry. Every word must have a clear, common,
 * single-emoji representation (see plan.md v3 "Content: Expanded Vocabulary
 * Bank"). `countable` gates whether a word feeds the counting-image
 * generator; `plural` is only meaningful for countable words.
 */
export interface VocabWord {
  id: string;
  topicId: string;
  word: string;
  plural?: string;
  emoji: string;
  explanation: string;
  countable: boolean;
}

export type QuestionKind = 'image-choice' | 'listening-fill-blank' | 'counting-image' | 'extra-letter';

export interface ImageChoiceQuestion {
  id: string;
  topicId: string;
  kind: 'image-choice';
  emoji: string;
  options: readonly [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface ListeningFillBlankQuestion {
  id: string;
  topicId: string;
  kind: 'listening-fill-blank';
  word: string;
  explanation: string;
}

export type CountDirection = 'count-to-image' | 'image-to-count';

/** Shared shape for both the counting-image prompt and its 4 options. */
export interface CountingImageOption {
  word: string;
  plural: string;
  emoji: string;
  count: number;
}

export interface CountingImageQuestion {
  id: string;
  topicId: string;
  kind: 'counting-image';
  direction: CountDirection;
  /** The correct object+count combination the student must find among options. */
  prompt: CountingImageOption;
  options: readonly [CountingImageOption, CountingImageOption, CountingImageOption, CountingImageOption];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface ExtraLetterQuestion {
  id: string;
  topicId: string;
  kind: 'extra-letter';
  correctWord: string;
  displayLetters: readonly string[];
  extraIndex: number;
  explanation: string;
}

export type Question =
  | ImageChoiceQuestion
  | ListeningFillBlankQuestion
  | CountingImageQuestion
  | ExtraLetterQuestion;

export interface AnswerRecord {
  question: Question;
  isCorrect: boolean;
}

export interface SessionResult {
  correctCount: number;
  totalCount: number;
  answers: AnswerRecord[];
}
