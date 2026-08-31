import type { AnswerRecord, ListeningFillBlankQuestion, ListeningSentenceFillBlankQuestion, Question, SessionResult } from '../types';
import { formatCountLabel } from './generators/countingImage';
import { scorePronunciationAttempt } from './rounds/pronunciationScoring';

export interface CurrentAnswer {
  isCorrect: boolean;
  selectedIndex?: number;
  typedAnswer?: string;
  selectedLetterIndex?: number;
  pronunciationTranscript?: string;
  pronunciationScore?: number;
}

export interface PracticeSessionState {
  questions: Question[];
  currentIndex: number;
  answers: AnswerRecord[];
  currentAnswer: CurrentAnswer | null;
}

export function createSession(questions: Question[]): PracticeSessionState {
  return {
    questions,
    currentIndex: 0,
    answers: [],
    currentAnswer: null,
  };
}

export function getCurrentQuestion(state: PracticeSessionState): Question | null {
  return state.questions[state.currentIndex] ?? null;
}

export function hasAnsweredCurrent(state: PracticeSessionState): boolean {
  return state.currentAnswer !== null;
}

/** Trims and lowercases so listening answers match case-insensitively. */
export function normalizeAnswer(text: string): string {
  return text.trim().toLowerCase();
}

/** The correct answer text for a question, regardless of kind. */
export function getCorrectWord(question: Question): string {
  switch (question.kind) {
    case 'image-choice':
      return question.options[question.correctIndex];
    case 'listening-fill-blank':
    case 'listening-sentence-fill-blank':
      return question.word;
    case 'counting-image':
      return formatCountLabel(question.prompt);
    case 'extra-letter':
      return question.correctWord;
    case 'pronunciation-recording':
      return question.word;
    case 'describe-and-choose-image':
      return formatCountLabel(question.options[question.correctIndex]);
    case 'listening-image-choice':
      return question.word;
    case 'picture-pair-matching':
      return question.pairs.map((pair) => `${pair.word} - ${pair.emoji}`).join(', ');
  }
}

function isListeningQuestion(
  question: Question,
): question is ListeningFillBlankQuestion | ListeningSentenceFillBlankQuestion {
  return question.kind === 'listening-fill-blank' || question.kind === 'listening-sentence-fill-blank';
}

function recordAnswer(
  state: PracticeSessionState,
  currentAnswer: CurrentAnswer,
  question: Question,
): PracticeSessionState {
  const answerRecord: AnswerRecord = { question, isCorrect: currentAnswer.isCorrect };

  return {
    ...state,
    currentAnswer,
    answers: [...state.answers, answerRecord],
  };
}

/**
 * Handles every "pick 1 of 4 options" shaped kind: image-choice,
 * counting-image, describe-and-choose-image and listening-image-choice
 * (plan.md v8 "Round 2 Addition: Listening Image-Choice" - no typing, same
 * correctIndex-based scoring as the other option-shaped kinds).
 */
export function submitOptionAnswer(
  state: PracticeSessionState,
  selectedIndex: number,
): PracticeSessionState {
  if (hasAnsweredCurrent(state)) {
    return state;
  }

  const currentQuestion = getCurrentQuestion(state);
  if (
    !currentQuestion ||
    (currentQuestion.kind !== 'image-choice' &&
      currentQuestion.kind !== 'counting-image' &&
      currentQuestion.kind !== 'describe-and-choose-image' &&
      currentQuestion.kind !== 'listening-image-choice')
  ) {
    return state;
  }

  const isCorrect = selectedIndex === currentQuestion.correctIndex;
  return recordAnswer(state, { isCorrect, selectedIndex }, currentQuestion);
}

/**
 * Handles both listening-fill-blank (bare word) and
 * listening-sentence-fill-blank (Round 2 - full sentence with the word
 * blanked out) - both are "hear it, type the target word" shaped and match
 * case-insensitively/trimmed the same way.
 */
export function submitListeningAnswer(
  state: PracticeSessionState,
  typedAnswer: string,
): PracticeSessionState {
  if (hasAnsweredCurrent(state)) {
    return state;
  }

  const currentQuestion = getCurrentQuestion(state);
  if (!currentQuestion || !isListeningQuestion(currentQuestion)) {
    return state;
  }

  const isCorrect = normalizeAnswer(typedAnswer) === normalizeAnswer(currentQuestion.word);
  return recordAnswer(state, { isCorrect, typedAnswer }, currentQuestion);
}

export function submitExtraLetterAnswer(
  state: PracticeSessionState,
  selectedLetterIndex: number,
): PracticeSessionState {
  if (hasAnsweredCurrent(state)) {
    return state;
  }

  const currentQuestion = getCurrentQuestion(state);
  if (!currentQuestion || currentQuestion.kind !== 'extra-letter') {
    return state;
  }

  const isCorrect = selectedLetterIndex === currentQuestion.extraIndex;
  return recordAnswer(state, { isCorrect, selectedLetterIndex }, currentQuestion);
}

/**
 * Round 3 - Pronunciation Recording (plan.md v5/v6). `transcript` is either
 * a real SpeechRecognition result or an explicit empty string (no speech
 * detected, or the student used the skip affordance on the
 * permission-denied / unsupported-browser fallback messages). Scoring is
 * computed here - the single source of truth for correctness, same as
 * every other kind's submit function.
 */
export function submitPronunciationAnswer(
  state: PracticeSessionState,
  transcript: string,
): PracticeSessionState {
  if (hasAnsweredCurrent(state)) {
    return state;
  }

  const currentQuestion = getCurrentQuestion(state);
  if (!currentQuestion || currentQuestion.kind !== 'pronunciation-recording') {
    return state;
  }

  const { score, isCorrect } = scorePronunciationAttempt(currentQuestion.word, transcript);
  return recordAnswer(
    state,
    { isCorrect, pronunciationTranscript: transcript, pronunciationScore: score },
    currentQuestion,
  );
}

/**
 * Round 4 addition - Picture-Pair-Matching Board (plan.md v8, AC32). The
 * board itself (PicturePairMatchingQuestion + rounds/pairMatchingBoard.ts)
 * is the single source of truth for whether it was solved within the
 * mistake budget; this reducer just records that outcome exactly once, same
 * "does nothing once already answered / on the wrong kind" guard shape as
 * every other submit function here.
 */
export function submitPairMatchingAnswer(
  state: PracticeSessionState,
  isCorrect: boolean,
): PracticeSessionState {
  if (hasAnsweredCurrent(state)) {
    return state;
  }

  const currentQuestion = getCurrentQuestion(state);
  if (!currentQuestion || currentQuestion.kind !== 'picture-pair-matching') {
    return state;
  }

  return recordAnswer(state, { isCorrect }, currentQuestion);
}

export function advanceToNextQuestion(state: PracticeSessionState): PracticeSessionState {
  if (!hasAnsweredCurrent(state)) {
    return state;
  }

  return {
    ...state,
    currentIndex: state.currentIndex + 1,
    currentAnswer: null,
  };
}

export function isSessionComplete(state: PracticeSessionState): boolean {
  return state.currentIndex >= state.questions.length;
}

/**
 * `totalCount` is derived from `state.answers.length` (questions actually
 * answered so far), not `state.questions.length` (the Round's full size).
 * These are identical once a Round completes normally (every question is
 * answered before the loop advances past it), but they diverge when a Round
 * ends early - e.g. the plan.md v7 Round Timer expiring mid-Round (AC28) -
 * where only the answered questions should count toward the total.
 */
export function computeSessionResult(state: PracticeSessionState): SessionResult {
  const correctCount = state.answers.filter((answer) => answer.isCorrect).length;

  return {
    correctCount,
    totalCount: state.answers.length,
    answers: state.answers,
  };
}

export function getIncorrectAnswers(result: SessionResult): AnswerRecord[] {
  return result.answers.filter((answer) => !answer.isCorrect);
}
