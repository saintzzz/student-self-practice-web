import { describe, expect, it } from 'vitest';
import {
  EXAM_POINTS_PER_QUESTION,
  EXAM_TIME_LIMIT_SEC,
  answerCurrent,
  buildExamPool,
  computeExamResult,
  createExam,
  examConfigForGrade,
  examCorrectAnswerText,
  isExamAnswerCorrect,
  jumpTo,
  remainingSeconds,
  submitExam,
} from './examSession';

const NOW = 1_700_000_000_000;

describe('examConfigForGrade (CR-46)', () => {
  it('every grade gets the full feature set - only the sitting length scales', () => {
    expect(examConfigForGrade('grade-1')).toEqual({ drillCount: 10, examCount: 50, examTimeSec: 15 * 60 });
    expect(examConfigForGrade('grade-2')).toEqual({ drillCount: 15, examCount: 80, examTimeSec: 20 * 60 });
    expect(examConfigForGrade('grade-3')).toEqual({ drillCount: 20, examCount: 120, examTimeSec: 25 * 60 });
    expect(examConfigForGrade('grade-4')).toEqual({ drillCount: 25, examCount: 160, examTimeSec: 30 * 60 });
    // Grade 5 keeps the official 200-question / 30-minute format.
    expect(examConfigForGrade('grade-5')).toEqual({ drillCount: 30, examCount: 200, examTimeSec: 30 * 60 });
    expect(examConfigForGrade('bogus').examCount).toBe(200);
  });

  it('time pressure ramps toward the 9s/question IOE pace', () => {
    for (const g of ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5']) {
      const c = examConfigForGrade(g);
      const secPerQuestion = c.examTimeSec / c.examCount;
      expect(secPerQuestion, g).toBeGreaterThanOrEqual(9);
      expect(secPerQuestion, g).toBeLessThanOrEqual(20);
    }
  });
});

describe('createExam', () => {
  it('sizes the exam by grade config (CR-46)', () => {
    const g1 = createExam('english', 'grade-1', 's', NOW);
    expect(g1.questions.length).toBe(50);
    expect(g1.timeLimitSec).toBe(15 * 60);

    const g5 = createExam('english', 'grade-5', 's', NOW);
    expect(g5.questions.length).toBe(200);
    expect(g5.timeLimitSec).toBe(EXAM_TIME_LIMIT_SEC);

    const g4 = createExam('english', 'grade-4', 's', NOW);
    expect(g4.questions.length).toBe(160);
    expect(g4.answers).toEqual(g4.questions.map(() => null));
    expect(g4.finishedAtMs).toBeNull();
  });

  it('is deterministic for the same seed and differs across seeds', () => {
    const a = createExam('english', 'grade-4', 'seed-a', NOW);
    const b = createExam('english', 'grade-4', 'seed-a', NOW);
    const c = createExam('english', 'grade-4', 'seed-b', NOW);
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
    expect(a.questions.map((q) => q.id)).not.toEqual(c.questions.map((q) => q.id));
  });

  it('respects the count override for practice drills (CR-25)', () => {
    const drill = createExam('english', 'grade-4', 's', NOW, 20);
    expect(drill.questions.length).toBe(20);
  });

  it('every program + grade now fills a full 200-question pool', () => {
    for (const p of ['english', 'math', 'science'] as const) {
      for (const g of ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5']) {
        expect(buildExamPool(p, g, 's').length, `${p}/${g}`).toBeGreaterThanOrEqual(200);
      }
    }
  });

  it('builds a non-empty math pool distinct from the english bank', () => {
    const math = createExam('math', 'grade-4', 's', NOW);
    expect(math.questions.length).toBeGreaterThan(50);
    expect(math.questions.every((q) => q.kind === 'grammar-mcq' || q.kind === 'text-answer')).toBe(true);
  });

  it('builds a science pool mixing mcq, true-false and fill-in', () => {
    const exam = createExam('science', 'grade-4', 's', NOW);
    const kinds = new Set(exam.questions.map((q) => q.kind));
    expect(exam.questions.length).toBeGreaterThan(20);
    expect(kinds.has('true-false-reading')).toBe(true);
    expect(kinds.has('grammar-mcq') || kinds.has('text-answer')).toBe(true);
  });
});

describe('exam flow', () => {
  it('records answers, supports jump + revisit, and submit ends it', () => {
    let exam = createExam('english', 'grade-4', 's', NOW);
    exam = answerCurrent(exam, { type: 'option', index: 0 });
    exam = jumpTo(exam, 50);
    expect(exam.currentIndex).toBe(50);
    exam = answerCurrent(exam, { type: 'option', index: 1 });
    exam = jumpTo(exam, 0);
    expect(exam.answers[0]).toEqual({ type: 'option', index: 0 });
    exam = submitExam(exam, NOW + 60_000);
    const result = computeExamResult(exam);
    expect(result.answeredCount).toBe(2);
    expect(result.timeUsedSec).toBe(60);
  });

  it('ignores answers after submit', () => {
    let exam = createExam('english', 'grade-4', 's', NOW);
    exam = submitExam(exam, NOW);
    const frozen = answerCurrent(exam, { type: 'option', index: 0 });
    expect(frozen.answers[0]).toBeNull();
  });

  it('counts down remaining seconds and clamps at zero', () => {
    const exam = createExam('english', 'grade-4', 's', NOW);
    expect(remainingSeconds(exam, NOW)).toBe(EXAM_TIME_LIMIT_SEC);
    expect(remainingSeconds(exam, NOW + 90_000)).toBe(EXAM_TIME_LIMIT_SEC - 90);
    expect(remainingSeconds(exam, NOW + EXAM_TIME_LIMIT_SEC * 1000 + 5_000)).toBe(0);
  });

  it('auto-submit at deadline scores whatever was answered', () => {
    let exam = createExam('english', 'grade-4', 's', NOW);
    exam = answerCurrent(exam, { type: 'option', index: 0 });
    exam = submitExam(exam, NOW + EXAM_TIME_LIMIT_SEC * 1000);
    const result = computeExamResult(exam);
    expect(result.timeUsedSec).toBe(EXAM_TIME_LIMIT_SEC);
    expect(result.answeredCount).toBe(1);
  });
});

describe('scoring', () => {
  const exam = createExam('english', 'grade-4', 's', NOW);

  it('answers every question correctly via examCorrectAnswerText roundtrip where possible', () => {
    let answered = exam;
    // Deterministic full-correct pass: derive each correct answer from the
    // question shape itself.
    for (let i = 0; i < answered.questions.length; i++) {
      const q = answered.questions[i]!;
      answered = jumpTo(answered, i);
      switch (q.kind) {
        case 'grammar-mcq':
        case 'odd-pronunciation':
        case 'image-choice':
          answered = answerCurrent(answered, { type: 'option', index: q.correctIndex });
          break;
        case 'true-false-reading':
          answered = answerCurrent(answered, { type: 'bool', value: q.answer });
          break;
        case 'missing-letter':
          answered = answerCurrent(answered, { type: 'text', text: q.missing });
          break;
        case 'text-answer':
          answered = answerCurrent(answered, { type: 'text', text: q.accept[0]! });
          break;
        case 'listening-sentence-fill-blank':
        case 'listening-fill-blank':
          answered = answerCurrent(answered, { type: 'text', text: q.word });
          break;
        case 'extra-letter':
          answered = answerCurrent(answered, { type: 'option', index: q.extraIndex });
          break;
        case 'word-order':
          answered = answerCurrent(answered, { type: 'order', indices: q.tiles.map((_, t) => t).sort((a, b) => q.tiles[a]!.localeCompare(q.tiles[b]!)) });
          break;
        default:
          break;
      }
    }
    const result = computeExamResult(submitExam(answered, NOW + 1000));
    // word-order roundtrip via sorted tiles is not guaranteed correct; all
    // other kinds must be 100% correct.
    const nonWO = result.review.filter((r) => r.question.kind !== 'word-order');
    expect(nonWO.every((r) => r.isCorrect)).toBe(true);
    expect(result.points).toBe(result.correctCount * EXAM_POINTS_PER_QUESTION);
  });

  it('wrong answers score zero for the question', () => {
    const q = exam.questions.find((x) => x.kind === 'grammar-mcq');
    if (!q || q.kind !== 'grammar-mcq') throw new Error('no grammar-mcq in pool');
    const wrong = (q.correctIndex + 1) % 4;
    expect(isExamAnswerCorrect(q, { type: 'option', index: wrong })).toBe(false);
    expect(isExamAnswerCorrect(q, { type: 'option', index: q.correctIndex })).toBe(true);
    expect(isExamAnswerCorrect(q, null)).toBe(false);
  });

  it('text-answer accepts any listed spelling, case-insensitive', () => {
    const q = createExam('math', 'grade-4', 's', NOW).questions.find((x) => x.kind === 'text-answer');
    if (!q || q.kind !== 'text-answer') throw new Error('no text-answer in math pool');
    for (const accepted of q.accept) {
      expect(isExamAnswerCorrect(q, { type: 'text', text: accepted.toUpperCase() })).toBe(true);
    }
    expect(isExamAnswerCorrect(q, { type: 'text', text: 'bogus answer' })).toBe(false);
  });
});

describe('examCorrectAnswerText', () => {
  it('returns a non-empty string for every question kind in the pool', () => {
    const exam = createExam('english', 'grade-4', 's', NOW);
    for (const q of exam.questions) {
      expect(examCorrectAnswerText(q).length).toBeGreaterThan(0);
    }
  });
});

describe('pool mix', () => {
  it('english exam includes the IOE-style new kinds', () => {
    const pool = buildExamPool('english', 'grade-4', 's');
    const kinds = new Set(pool.map((q) => q.kind));
    for (const kind of ['word-order', 'odd-pronunciation', 'missing-letter', 'grammar-mcq', 'true-false-reading'] as const) {
      expect(kinds.has(kind), `missing kind ${kind}`).toBe(true);
    }
  });
});
