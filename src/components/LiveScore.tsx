import { computeLiveScore } from '../lib/liveScore';
import { POINTS_PER_CORRECT_ANSWER } from '../lib/batch/points';
import type { PracticeSessionState } from '../lib/practiceSession';

interface LiveScoreProps {
  session: PracticeSessionState;
}

/**
 * Running score shown throughout an active Round's question loop (plan.md
 * v7 "Live Score Display", AC26; plan.md v10 "Points Scoring", AC35). X =
 * correct so far, Y = questions answered so far (not the Round's total,
 * since the student has not seen the unanswered ones yet). The running
 * point total (correct * 10) is computed inline here, purely derived from
 * `correct` - no new state. Reads `session.answers` via `computeLiveScore`,
 * so both numbers update the instant an answer is recorded, the same
 * moment the per-question feedback appears.
 */
export default function LiveScore({ session }: LiveScoreProps) {
  const { correct, answered } = computeLiveScore(session);
  const points = correct * POINTS_PER_CORRECT_ANSWER;

  return (
    <p data-testid="live-score" className="text-base font-bold text-emerald-700">
      {points} điểm ({correct}/{answered} đúng)
    </p>
  );
}
