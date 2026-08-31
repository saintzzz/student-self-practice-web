import { computeSessionResult, type PracticeSessionState } from './practiceSession';

export interface LiveScore {
  /** Correct answers so far. */
  correct: number;
  /** Questions answered so far (not the Round's total question count). */
  answered: number;
}

/**
 * Running score for the plan.md v7 "Live Score Display" (`live-score`
 * testid, AC26) - a pure read of `session.answers`, the same data
 * `computeSessionResult` already uses, so it updates the instant an answer
 * is recorded (before the student even clicks Next), with no new scoring
 * logic. Split out from practiceSession.ts to keep that file focused on the
 * session reducer and under the project's ~200-line guideline.
 */
export function computeLiveScore(session: PracticeSessionState): LiveScore {
  const result = computeSessionResult(session);
  return { correct: result.correctCount, answered: result.totalCount };
}
