import type { ExamProgramId, ExamQuestion } from '../../types/exam';
import { getWordsByGrade } from '../../data/vocabulary';
import { generateImageChoiceQuestions } from '../generators/imageChoice';
import { generateListeningSentenceFillBlankQuestions } from '../generators/listeningSentenceFillBlank';
import { generateExtraLetterQuestions } from '../generators/extraLetter';
import { seededPickN, seededShuffleIndices } from '../prng';
import { generateAuthoredWordOrderQuestions, generateWordOrderQuestions, isWordOrderCorrect } from './wordOrder';
import { generateOddPronunciationQuestions } from './oddPronunciation';
import { generateMissingLetterQuestions } from './missingLetter';
import { generateGrammarMcqQuestions, generateIoeMcqQuestions, generateIoeRealMaskedQuestions, generateIoeRealMcqQuestions, generateIoeRealTfQuestions, generateTrueFalseQuestions } from './englishGenerators';
import { reorderBankForGrade } from '../../data/reorderBank';
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
 * CR-26 - per-grade-band quotas. The original mix gave grade 4 the same
 * 40-image-recognition share as grade 1, which is why it felt too easy.
 * Upper grades shift weight to authored MCQ (grammar + spelling +
 * pronunciation + error correction + facts), longer authored reorders
 * and reading; grades 1-2 keep the picture/phonics-heavy mix.
 */
interface EnglishQuotas {
  image: number;
  wordOrder: number;
  oddPronunciation: number;
  missingLetter: number;
  mcq: number;
  trueFalse: number;
  listening: number;
  extraLetter: number;
}

function englishQuotas(gradeId: string): EnglishQuotas {
  if (gradeId === 'grade-4' || gradeId === 'grade-5') {
    return { image: 22, wordOrder: 48, oddPronunciation: 25, missingLetter: 20, mcq: 50, trueFalse: 20, listening: 20, extraLetter: 12 };
  }
  if (gradeId === 'grade-3') {
    return { image: 30, wordOrder: 42, oddPronunciation: 28, missingLetter: 25, mcq: 35, trueFalse: 16, listening: 24, extraLetter: 14 };
  }
  return { image: 40, wordOrder: 40, oddPronunciation: 30, missingLetter: 30, mcq: 20, trueFalse: 15, listening: 30, extraLetter: 15 };
}

/**
 * English-program pool: IOE-style mix. Each kind contributes a quota
 * slice stratified across topics so one giant topic cannot dominate.
 * Pool far exceeds 200 so repeated exams differ by seed.
 */
function buildEnglishPool(gradeId: string, seed: string): ExamQuestion[] {
  const words = getWordsByGrade(gradeId);
  const imageWords = words.filter(isLiteralImageWord);
  const q = englishQuotas(gradeId);
  // Authored reorders get their own slice (sharing one topicId would
  // let stratification squeeze them out); template sentences fill the
  // rest of the word-order quota.
  const authoredReorder = generateAuthoredWordOrderQuestions(gradeId, reorderBankForGrade(gradeId));
  const mcqPool = [
    ...generateGrammarMcqQuestions(gradeId),
    ...generateIoeMcqQuestions(gradeId),
  ];
  // Real harvested IOE items take priority over generated fillers.
  // Quotas follow what the harvest actually covers per grade: G4-5 are
  // the deep Thi thử bank; G1-2 contribute makeWord/masked items; G3
  // real reorder sentences flow in via reorderBankForGrade.
  const real = {
    'grade-1': { mcq: 10, masked: 10, tf: 0 },
    'grade-2': { mcq: 10, masked: 0, tf: 0 },
    'grade-3': { mcq: 0, masked: 0, tf: 0 },
    'grade-4': { mcq: 55, masked: 45, tf: 15 },
    'grade-5': { mcq: 55, masked: 45, tf: 15 },
  }[gradeId] ?? { mcq: 0, masked: 0, tf: 0 };

  const slices: ExamQuestion[][] = [
    seededPickN(generateIoeRealMcqQuestions(gradeId), real.mcq, `${seed}-rmcq`),
    seededPickN(generateIoeRealMaskedQuestions(gradeId), real.masked, `${seed}-rml`),
    seededPickN(generateIoeRealTfQuestions(gradeId), real.tf, `${seed}-rtf`),
    seededPickN(generateImageChoiceQuestions(imageWords), q.image, `${seed}-ic`),
    seededPickN(authoredReorder, Math.min(authoredReorder.length, Math.floor(q.wordOrder / 2)), `${seed}-woa`),
    seededPickN(generateWordOrderQuestions(words), q.wordOrder, `${seed}-wo`),
    seededPickN(generateOddPronunciationQuestions(words), q.oddPronunciation, `${seed}-odd`),
    seededPickN(generateMissingLetterQuestions(words), q.missingLetter, `${seed}-ml`),
    seededPickN(mcqPool, q.mcq, `${seed}-g`),
    seededPickN(generateTrueFalseQuestions(gradeId), q.trueFalse, `${seed}-tf`),
    seededPickN(generateListeningSentenceFillBlankQuestions(words), q.listening, `${seed}-ls`),
    seededPickN(generateExtraLetterQuestions(words), q.extraLetter, `${seed}-el`),
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
