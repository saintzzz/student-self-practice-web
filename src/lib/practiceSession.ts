import type { AnswerRecord, Question, SessionResult } from '../types';
import { formatCountLabel } from './generators/countingImage';

export interface CurrentAnswer {
  isCorrect: boolean;
  selectedIndex?: number;
  typedAnswer?: string;
  selectedLetterIndex?: number;
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
      return question.word;
    case 'counting-image':
      return formatCountLabel(question.prompt);
    case 'extra-letter':
      return question.correctWord;
  }
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

/** Handles both image-choice and counting-image - both are "pick 1 of 4 options" shaped. */
export function submitOptionAnswer(
  state: PracticeSessionState,
  selectedIndex: number,
): PracticeSessionState {
  if (hasAnsweredCurrent(state)) {
    return state;
  }

  const currentQuestion = getCurrentQuestion(state);
  if (!currentQuestion || (currentQuestion.kind !== 'image-choice' && currentQuestion.kind !== 'counting-image')) {
    return state;
  }

  const isCorrect = selectedIndex === currentQuestion.correctIndex;
  return recordAnswer(state, { isCorrect, selectedIndex }, currentQuestion);
}

export function submitListeningAnswer(
  state: PracticeSessionState,
  typedAnswer: string,
): PracticeSessionState {
  if (hasAnsweredCurrent(state)) {
    return state;
  }

  const currentQuestion = getCurrentQuestion(state);
  if (!currentQuestion || currentQuestion.kind !== 'listening-fill-blank') {
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

export function computeSessionResult(state: PracticeSessionState): SessionResult {
  const correctCount = state.answers.filter((answer) => answer.isCorrect).length;

  return {
    correctCount,
    totalCount: state.questions.length,
    answers: state.answers,
  };
}

export function getIncorrectAnswers(result: SessionResult): AnswerRecord[] {
  return result.answers.filter((answer) => !answer.isCorrect);
}
