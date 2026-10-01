import type { ExamProgramId, ExamQuestion } from '../../types/exam';
import { getWordsByGrade } from '../../data/vocabulary';
import { generateImageChoiceQuestions } from '../generators/imageChoice';
import { generateListeningSentenceFillBlankQuestions } from '../generators/listeningSentenceFillBlank';
import { generateExtraLetterQuestions } from '../generators/extraLetter';
import { seededPickN, seededShuffleIndices } from '../prng';
import { generateWordOrderQuestions, isWordOrderCorrect } from './wordOrder';
import { generateOddPronunciationQuestions } from './oddPronunciation';
import { generateMissingLetterQuestions } from './missingLetter';
import { generateGrammarMcqQuestions, generateTrueFalseQuestions } from './englishGenerators';
import { generateMathQuestions } from './mathEnglish';
import { generateScienceQuestions } from './scienceQuestions';
import { isLiteralImageWord } from '../content/imageSemantics';

export const EXAM_QUESTION_COUNT = 200;
export const PRACTICE_QUESTION_COUNT = 20;
export const EXAM_TIME_LIMIT_SEC = 30 * 60;
export const EXAM_POINTS_PER_QUESTION = 10;

/** What the student entered on one exam question. */
export type ExamAnswer =
  | { type: 'option'; index: number }
  | { type: 'text'; text: string }
  | { type: 'bool'; value: boolean }
  | { type: 'order'; indices: readonly number[] };

export interface ExamState {
  programId: ExamProgramId;
  gradeId: string;
  questions: readonly ExamQuestion[];
  /** Parallel to `questions`; null = skipped/unanswered. */
  answers: readonly (ExamAnswer | null)[];
  currentIndex: number;
  /** ms epoch when the countdown started (UI owns the ticking). */
  startedAtMs: number;
  timeLimitSec: number;
  /** Set when the student pressed SUBMIT or time ran out. */
  finishedAtMs: number | null;
}

export interface ExamReviewItem {
  index: number;
  question: ExamQuestion;
  answer: ExamAnswer | null;
  isCorrect: boolean;
}

export interface ExamResult {
  totalCount: number;
  answeredCount: number;
  correctCount: number;
  /** correctCount * EXAM_POINTS_PER_QUESTION (IOE-style big score). */
  points: number;
  timeUsedSec: number;
  review: ExamReviewItem[];
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Single source of truth: does this answer mark this question right? */
export function isExamAnswerCorrect(question: ExamQuestion, answer: ExamAnswer | null): boolean {
  if (!answer) return false;
  switch (question.kind) {
    case 'word-order': {
      if (answer.type !== 'order') return false;
      const picked = answer.indices.map((i) => question.tiles[i]);
      return picked.length === question.tiles.length && isWordOrderCorrect(question.sentence, picked);
    }
    case 'odd-pronunciation':
    case 'grammar-mcq':
    case 'image-choice':
    case 'listening-image-choice':
    case 'describe-and-choose-image':
    case 'phonics-rhyme-choice':
    case 'phonics-sound-choice':
    case 'phonics-word-choice':
    case 'phonics-final-choice':
    case 'phonics-blend-choice':
    case 'counting-image':
      return answer.type === 'option' && answer.index === question.correctIndex;
    case 'true-false-reading':
      return answer.type === 'bool' && answer.value === question.answer;
    case 'missing-letter':
      return answer.type === 'text' && normalize(answer.text) === normalize(question.missing);
    case 'text-answer':
      return answer.type === 'text' && question.accept.some((a) => normalize(a) === normalize(answer.text));
    case 'listening-sentence-fill-blank':
    case 'listening-fill-blank':
      return answer.type === 'text' && normalize(answer.text) === normalize(question.word);
    case 'extra-letter':
      return answer.type === 'option' && answer.index === question.extraIndex;
    case 'pronunciation-recording':
    case 'picture-pair-matching':
      // Not used in exam mode.
      return false;
  }
}

/** The correct answer rendered as text for the review screen. */
export function examCorrectAnswerText(question: ExamQuestion): string {
  switch (question.kind) {
    case 'word-order':
      return question.sentence;
    case 'odd-pronunciation':
    case 'grammar-mcq':
    case 'image-choice':
    case 'listening-image-choice':
    case 'phonics-rhyme-choice':
    case 'phonics-word-choice':
    case 'phonics-sound-choice':
    case 'phonics-final-choice':
    case 'phonics-blend-choice':
      return question.options[question.correctIndex];
    case 'counting-image':
      return question.options[question.correctIndex].plural;
    case 'describe-and-choose-image':
      return question.options[question.correctIndex].plural;
    case 'true-false-reading':
      return question.answer ? 'True' : 'False';
    case 'missing-letter':
      return `${question.missing} (${question.word})`;
    case 'text-answer':
      return question.accept[0] ?? '';
    case 'listening-sentence-fill-blank':
    case 'listening-fill-blank':
      return question.word;
    case 'extra-letter':
      return question.correctWord;
    case 'pronunciation-recording':
      return question.word;
    case 'picture-pair-matching':
      return question.pairs.map((p) => p.word).join(', ');
  }
}

/**
 * English-program pool: IOE-style mix. Each kind contributes a quota
 * slice stratified across topics so one giant topic cannot dominate.
 * Pool far exceeds 200 so repeated exams differ by seed.
 */
function buildEnglishPool(gradeId: string, seed: string): ExamQuestion[] {
  const words = getWordsByGrade(gradeId);
  const imageWords = words.filter(isLiteralImageWord);

  const slices: ExamQuestion[][] = [
    seededPickN(generateImageChoiceQuestions(imageWords), 40, `${seed}-ic`),
    seededPickN(generateWordOrderQuestions(words), 40, `${seed}-wo`),
    seededPickN(generateOddPronunciationQuestions(words), 30, `${seed}-odd`),
    seededPickN(generateMissingLetterQuestions(words), 30, `${seed}-ml`),
    seededPickN(generateGrammarMcqQuestions(gradeId), 20, `${seed}-g`),
    seededPickN(generateTrueFalseQuestions(gradeId), 15, `${seed}-tf`),
    seededPickN(generateListeningSentenceFillBlankQuestions(words), 30, `${seed}-ls`),
    seededPickN(generateExtraLetterQuestions(words), 15, `${seed}-el`),
  ];

  const pool: ExamQuestion[] = slices.flat();
  const order = seededShuffleIndices(pool.length, `${seed}-mix`);
  return order.map((i) => pool[i]!);
}

export function buildExamPool(programId: ExamProgramId, gradeId: string, seed: string): ExamQuestion[] {
  switch (programId) {
    case 'math':
      return generateMathQuestions(gradeId, seed);
    case 'science':
      return generateScienceQuestions(gradeId);
    case 'english':
      return buildEnglishPool(gradeId, seed);
  }
}

/**
 * Creates a 200-question / 30-minute exam. If the pool is smaller than
 * 200 the exam is capped at the pool size (documented floor: early
 * grades and the science bank may not fill 200).
 */
export function createExam(
  programId: ExamProgramId,
  gradeId: string,
  seed: string,
  nowMs: number,
  count = EXAM_QUESTION_COUNT,
): ExamState {
  const pool = buildExamPool(programId, gradeId, seed);
  const questions = pool.slice(0, count);
  return {
    programId,
    gradeId,
    questions,
    answers: questions.map(() => null),
    currentIndex: 0,
    startedAtMs: nowMs,
    timeLimitSec: EXAM_TIME_LIMIT_SEC,
    finishedAtMs: null,
  };
}

export function answerCurrent(state: ExamState, answer: ExamAnswer): ExamState {
  if (state.finishedAtMs !== null) return state;
  const answers = [...state.answers];
  answers[state.currentIndex] = answer;
  return { ...state, answers };
}

export function clearCurrent(state: ExamState): ExamState {
  if (state.finishedAtMs !== null) return state;
  const answers = [...state.answers];
  answers[state.currentIndex] = null;
  return { ...state, answers };
}

export function jumpTo(state: ExamState, index: number): ExamState {
  if (index < 0 || index >= state.questions.length) return state;
  return { ...state, currentIndex: index };
}

export function submitExam(state: ExamState, nowMs: number): ExamState {
  if (state.finishedAtMs !== null) return state;
  return { ...state, finishedAtMs: nowMs };
}

export function remainingSeconds(state: ExamState, nowMs: number): number {
  const elapsed = Math.floor((nowMs - state.startedAtMs) / 1000);
  return Math.max(0, state.timeLimitSec - elapsed);
}

export function computeExamResult(state: ExamState): ExamResult {
  const review: ExamReviewItem[] = state.questions.map((question, index) => {
    const answer = state.answers[index] ?? null;
    return { index, question, answer, isCorrect: isExamAnswerCorrect(question, answer) };
  });
  const correctCount = review.filter((r) => r.isCorrect).length;
  const answeredCount = state.answers.filter((a) => a !== null).length;
  const finished = state.finishedAtMs ?? state.startedAtMs + state.timeLimitSec * 1000;
  return {
    totalCount: state.questions.length,
    answeredCount,
    correctCount,
    points: correctCount * EXAM_POINTS_PER_QUESTION,
    timeUsedSec: Math.min(state.timeLimitSec, Math.max(0, Math.floor((finished - state.startedAtMs) / 1000))),
    review,
  };
}
