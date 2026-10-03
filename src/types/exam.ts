import type { Question } from './index';

/**
 * CR-24 - IOE-style exam question kinds. These types only exist in the
 * Thi thử (mock exam) flow - they are deliberately kept out of the
 * practice `Question` union so self-practice rounds are untouched.
 * Every kind carries `explanation` for the post-submit answer review.
 */

/** Sắp xếp lại câu: tap scrambled tiles in order to rebuild `sentence`. */
export interface WordOrderQuestion {
  id: string;
  topicId: string;
  kind: 'word-order';
  /** The correct sentence, e.g. "I can see a cat." */
  sentence: string;
  /** Display tokens in scrambled order (never the correct order). */
  tiles: readonly string[];
  explanation: string;
}

/**
 * Tìm từ phát âm khác: 4 words, exactly one does not share the others'
 * sound on `dimension` (rhyme family, initial sound, or final sound).
 */
export interface OddPronunciationQuestion {
  id: string;
  topicId: string;
  kind: 'odd-pronunciation';
  dimension: 'rhyme' | 'initial' | 'final';
  options: readonly [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

/** Điền chữ còn thiếu: "There are two big __dows." -> type "win". */
export interface MissingLetterQuestion {
  id: string;
  topicId: string;
  kind: 'missing-letter';
  /** The full correct word (feedback + answer). */
  word: string;
  wordId: string;
  /** The word rendered with the missing run shown as "___". */
  maskedWord: string;
  /** The letters the student must type, e.g. "win". */
  missing: string;
  /** Full sentence context shown above the word. */
  sentence: string;
  displaySentence: string;
  explanation: string;
}

/** Đọc hiểu Đúng/Sai: short passage + statement -> True/False. */
export interface TrueFalseQuestion {
  id: string;
  topicId: string;
  kind: 'true-false-reading';
  passage: string;
  statement: string;
  answer: boolean;
  explanation: string;
}

/** Grammar MCQ: "Lien ___ lunch at 11:30." -> has. */
export interface GrammarMcqQuestion {
  id: string;
  topicId: string;
  kind: 'grammar-mcq';
  /** Sentence with the blank rendered as "___". */
  prompt: string;
  options: readonly [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  /**
   * CR-33 - optional self-hosted illustration/prompt image (harvested
   * Violympic items). Rendered above the prompt when present.
   */
  imageUrl?: string;
  /**
   * CR-33 - when every option is an image rather than text, these are
   * rendered inside the option buttons instead of `options` text.
   * Must be the same length/order as `options`.
   */
  optionImages?: readonly [string, string, string, string];
}

/**
 * Free-text answer: math ("Five times nine minus ___ equals
 * thirty-four." -> "11"/"eleven") and science fills. `accept` lists every
 * acceptable spelling (e.g. digits AND the English word form).
 */
export interface TextAnswerQuestion {
  id: string;
  topicId: string;
  kind: 'text-answer';
  /** Full correct sentence (shown in review). */
  sentence: string;
  /** Sentence with the answer rendered as "___". */
  displaySentence: string;
  /** All accepted answers, compared case-insensitive trimmed. */
  accept: readonly string[];
  explanation: string;
  /** CR-33 - optional self-hosted question illustration. */
  imageUrl?: string;
}

export type ExamOnlyQuestion =
  | WordOrderQuestion
  | OddPronunciationQuestion
  | MissingLetterQuestion
  | TrueFalseQuestion
  | GrammarMcqQuestion
  | TextAnswerQuestion;

/** An exam may draw from both practice kinds and exam-only kinds. */
export type ExamQuestion = Question | ExamOnlyQuestion;

export type ExamProgramId = 'english' | 'math' | 'science';
