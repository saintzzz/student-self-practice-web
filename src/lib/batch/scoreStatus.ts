/**
 * IOE-style "hoàn thành" (completed) status threshold (plan.md v10 "Points
 * Scoring" - IOE gates this at 75% of a round's/the total's max). A small,
 * encouraging status badge, never a hard gate - the below-threshold case
 * is phrased gently, no "failed"/"incomplete" framing, matching this app's
 * non-punitive tone since v2.
 */
export const COMPLETION_THRESHOLD_RATIO = 0.75;

export interface ScoreStatus {
  isComplete: boolean;
  label: string;
}

/**
 * `maxPoints` of 0 (e.g. a Round that timed out with zero answered
 * questions) is treated as below-threshold rather than dividing by zero.
 */
export function getScoreStatus(points: number, maxPoints: number): ScoreStatus {
  const ratio = maxPoints > 0 ? points / maxPoints : 0;

  if (ratio >= COMPLETION_THRESHOLD_RATIO) {
    return { isComplete: true, label: 'Hoàn thành! Em làm rất tốt!' };
  }

  return { isComplete: false, label: 'Cố lên, luyện tập thêm để đạt điểm cao hơn nhé!' };
}
