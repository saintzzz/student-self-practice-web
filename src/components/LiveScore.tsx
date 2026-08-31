import { computeLiveScore } from '../lib/liveScore';
import type { PracticeSessionState } from '../lib/practiceSession';

interface LiveScoreProps {
  session: PracticeSessionState;
}

/**
 * Running score shown throughout an active Round's question loop (plan.md
 * v7 "Live Score Display", AC26) - X = correct so far, Y = questions
 * answered so far (not the Round's total, since the student has not seen
 * the unanswered ones yet). Reads `session.answers` via `computeLiveScore`,
 * so it updates the instant an answer is recorded, the same moment the
 * per-question feedback appears.
 */
export default function LiveScore({ session }: LiveScoreProps) {
  const { correct, answered } = computeLiveScore(session);

  return (
    <p data-testid="live-score" className="text-lg font-bold text-emerald-700">
      Điểm: {correct}/{answered} đúng
    </p>
  );
}
