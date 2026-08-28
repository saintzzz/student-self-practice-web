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

export type QuestionKind =
  | 'image-choice'
  | 'listening-fill-blank'
  | 'counting-image'
  | 'extra-letter'
  | 'listening-sentence-fill-blank';

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

/**
 * Round 2 of the v5 Batch/Round model (see plan.md "Round 2 - Listening
 * Sentence Fill-Blank"). TTS speaks `sentence` in full; the student sees
 * `displaySentence` (the same sentence with `word` replaced by "___") and
 * types the missing word. Matching is case-insensitive/trimmed, same as
 * `ListeningFillBlankQuestion`.
 */
export interface ListeningSentenceFillBlankQuestion {
  id: string;
  topicId: string;
  kind: 'listening-sentence-fill-blank';
  word: string;
  sentence: string;
  displaySentence: string;
  explanation: string;
}

export type Question =
  | ImageChoiceQuestion
  | ListeningFillBlankQuestion
  | CountingImageQuestion
  | ExtraLetterQuestion
  | ListeningSentenceFillBlankQuestion;

/**
 * The 4 fixed Round kinds of a Batch (plan.md v5 "New Interaction Model:
 * Batch / Round"). Only `extra-letter` (Round 1) and
 * `listening-sentence-fill-blank` (Round 2) have real content generators
 * wired up in this build; `pronunciation-recording` (Round 3) and
 * `describe-and-choose-image` (Round 4) exist as a type-level placeholder
 * only - a follow-up task adds their real generators/components without
 * needing to touch this union or the round-index plumbing.
 */
export type RoundType =
  | 'extra-letter'
  | 'listening-sentence-fill-blank'
  | 'pronunciation-recording'
  | 'describe-and-choose-image';

export interface AnswerRecord {
  question: Question;
  isCorrect: boolean;
}

export interface SessionResult {
  correctCount: number;
  totalCount: number;
  answers: AnswerRecord[];
}
