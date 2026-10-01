import { describe, expect, it } from 'vitest';
import {
  buildPlacementSession,
  computePlacement,
  QUESTIONS_PER_GRADE,
} from './placement';
import { GRADES } from '../data/vocabulary';
import { submitOptionAnswer, advanceToNextQuestion } from './practiceSession';
import type { PracticeSessionState } from './practiceSession';

/** Tra loi toan bo session bang index cho truoc (deterministic). */
function answerAll(session: PracticeSessionState, pick: (qIndex: number, correctIndex: number) => number) {
  let s = session;
  while (s.currentIndex < s.questions.length) {
    const q = s.questions[s.currentIndex] as { correctIndex: number };
    s = submitOptionAnswer(s, pick(s.currentIndex, q.correctIndex));
    s = advanceToNextQuestion(s);
  }
  return s;
}

describe('buildPlacementSession', () => {
  it('tao 15 cau: 3 cau/lop x 5 lop, grade tag dung thu tu', () => {
    const { session, questionGradeIds } = buildPlacementSession('test-seed');
    expect(session.questions).toHaveLength(GRADES.length * QUESTIONS_PER_GRADE);
    expect(questionGradeIds).toHaveLength(session.questions.length);
    for (const [i, g] of GRADES.entries()) {
      expect(questionGradeIds.slice(i * 3, i * 3 + 3)).toEqual([g.id, g.id, g.id]);
    }
    expect(session.questions.every((q) => q.kind === 'image-choice')).toBe(true);
  });

  it('deterministic theo seed', () => {
    const a = buildPlacementSession('seed-x').session.questions.map((q) => q.id);
    const b = buildPlacementSession('seed-x').session.questions.map((q) => q.id);
    expect(a).toEqual(b);
  });
});

describe('computePlacement', () => {
  it('tra loi sai het -> goi y lop 1', () => {
    const { session, questionGradeIds } = buildPlacementSession('s1');
    const done = answerAll(session, (_i, correct) => (correct + 1) % 4);
    const p = computePlacement(done, questionGradeIds);
    expect(p.recommendedGradeId).toBe('grade-1');
    expect(p.correctByGrade).toEqual([0, 0, 0, 0, 0]);
  });

  it('dung het -> goi y lop 5', () => {
    const { session, questionGradeIds } = buildPlacementSession('s2');
    const done = answerAll(session, (_i, correct) => correct);
    const p = computePlacement(done, questionGradeIds);
    expect(p.recommendedGradeId).toBe('grade-5');
    expect(p.correctByGrade).toEqual([3, 3, 3, 3, 3]);
  });

  it('vuot lop 1-2, rot lop 3 -> goi y lop 3', () => {
    const { session, questionGradeIds } = buildPlacementSession('s3');
    // Dung het lop 1+2 (cau 0-5), sai het tu lop 3 tro di.
    const done = answerAll(session, (i, correct) => (i < 6 ? correct : (correct + 1) % 4));
    const p = computePlacement(done, questionGradeIds);
    expect(p.recommendedGradeId).toBe('grade-3');
    expect(p.correctByGrade[0]).toBe(3);
    expect(p.correctByGrade[2]).toBe(0);
  });
});
