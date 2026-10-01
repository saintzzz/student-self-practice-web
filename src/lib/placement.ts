import type { ImageChoiceQuestion, Question } from '../types';
import { GRADES, getWordsByGrade } from '../data/vocabulary';
import { generateImageChoiceQuestions } from './generators/imageChoice';
import { seededShuffleIndices } from './prng';
import {
  createSession,
  type PracticeSessionState,
} from './practiceSession';

/** So cau cho moi lop trong bai placement - 3 cau x 5 lop = 15 cau. */
export const QUESTIONS_PER_GRADE = 3;
/** Nguong "vuot lop" - it nhat 2/3 cau dung moi duoc tinh la nam vung lop do. */
export const PASS_THRESHOLD = 2;

export interface PlacementResult {
  /** So cau dung tren tung lop, index theo GRADES. */
  correctByGrade: number[];
  /** Lop goi y bat dau luyen tap. */
  recommendedGradeId: string;
}

/**
 * Sinh session placement: 15 cau image-choice, 3 cau/lop theo thu tu
 * lop 1 -> lop 5. Tra ve session + map gradeId theo tung cau de cham
 * tung lop rieng sau khi ket thuc.
 */
export function buildPlacementSession(seed: string): {
  session: PracticeSessionState;
  questionGradeIds: string[];
} {
  const questions: Question[] = [];
  const questionGradeIds: string[] = [];
  for (const grade of GRADES) {
    const pool = generateImageChoiceQuestions(getWordsByGrade(grade.id));
    const order = seededShuffleIndices(pool.length, `${seed}-${grade.id}`);
    for (const i of order.slice(0, QUESTIONS_PER_GRADE)) {
      questions.push(pool[i] as ImageChoiceQuestion);
      questionGradeIds.push(grade.id);
    }
  }
  return { session: createSession(questions), questionGradeIds };
}

/**
 * Cham placement: lop goi y = lop dau tien hoc sinh chua dat nguong
 * (it nhat PASS_THRESHOLD/QUESTIONS_PER_GRADE cau dung). Vuot het 5 lop
 * -> goi y lop 5 (muc cao nhat hien co).
 */
export function computePlacement(
  session: PracticeSessionState,
  questionGradeIds: string[],
): PlacementResult {
  const correctByGrade = GRADES.map(() => 0);
  session.answers.forEach((a, i) => {
    if (a.isCorrect) {
      const idx = GRADES.findIndex((g) => g.id === questionGradeIds[i]);
      if (idx >= 0) correctByGrade[idx] += 1;
    }
  });
  const failIdx = correctByGrade.findIndex((c) => c < PASS_THRESHOLD);
  const recommendedGradeId =
    failIdx === -1 ? GRADES[GRADES.length - 1].id : GRADES[failIdx].id;
  return { correctByGrade, recommendedGradeId };
}
