import type { PicturePairMatchingQuestion } from './pairMatching';

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
  | 'listening-sentence-fill-blank'
  | 'pronunciation-recording'
  | 'describe-and-choose-image'
  | 'listening-image-choice'
  | 'picture-pair-matching';

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

/**
 * Round 2 addition (plan.md v8 "Round 2 Addition: Listening Image-Choice").
 * TTS speaks `word` in full; the student picks the matching image from
 * `options` (4 emojis, no typing) - reuses the same "pick 1 of 4 options"
 * shell and `option-{index}` testid as `ImageChoiceQuestion`. Mixed into
 * Round 2's pool alongside `ListeningSentenceFillBlankQuestion`.
 */
export interface ListeningImageChoiceQuestion {
  id: string;
  topicId: string;
  kind: 'listening-image-choice';
  word: string;
  options: readonly [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

/**
 * Round 3 of the v5 Batch/Round model (see plan.md "Round 3 - Pronunciation
 * Recording"). The student reads `word` aloud; the browser's
 * SpeechRecognition API transcribes the attempt and
 * `submitPronunciationAnswer` (practiceSession.ts) scores it via
 * `scorePronunciationAttempt` (rounds/pronunciationScoring.ts) - an
 * approximate string-similarity check, not phoneme-level analysis.
 */
export interface PronunciationRecordingQuestion {
  id: string;
  topicId: string;
  kind: 'pronunciation-recording';
  word: string;
  explanation: string;
}

/** The two sentence shapes Round 4 generates (plan.md v5 "Round 4 - Describe and Choose Image"). */
export type DescriptionType = 'count' | 'negation';

/**
 * Round 4 of the v5/v6 Batch/Round model (see plan.md "Round 4 - Describe
 * and Choose Image" and "Round 4 Negation Design"). `sentence` is spoken via
 * TTS and shown on screen; the student picks the matching repeated-emoji
 * image from `options`. For `descriptionType: 'count'`, the correct option
 * depicts the described object at the described count. For
 * `descriptionType: 'negation'`, the correct option depicts a completely
 * different object (zero of the negated word) while the other 3 options all
 * depict the negated word at varying counts - this keeps the "exactly one
 * correct option out of 4" invariant intact instead of a "3 correct + 1
 * wrong" shape.
 */
export interface DescribeAndChooseImageQuestion {
  id: string;
  topicId: string;
  kind: 'describe-and-choose-image';
  descriptionType: DescriptionType;
  sentence: string;
  options: readonly [CountingImageOption, CountingImageOption, CountingImageOption, CountingImageOption];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

/** Picture-pair-matching types (plan.md v8) live in ./pairMatching.ts, split out for file-size hygiene. */
export * from './pairMatching';

export type Question =
  | ImageChoiceQuestion
  | ListeningFillBlankQuestion
  | CountingImageQuestion
  | ExtraLetterQuestion
  | ListeningSentenceFillBlankQuestion
  | PronunciationRecordingQuestion
  | DescribeAndChooseImageQuestion
  | ListeningImageChoiceQuestion
  | PicturePairMatchingQuestion;

/**
 * The 4 fixed Round kinds of a Batch (plan.md v5 "New Interaction Model:
 * Batch / Round"). All 4 kinds have real content generators wired up
 * (plan.md v6 AC24/AC25).
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
