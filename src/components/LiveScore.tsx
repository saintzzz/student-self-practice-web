import { useCallback, useEffect, useRef, useState } from 'react';
import { computeLiveScore } from '../lib/liveScore';
import { POINTS_PER_CORRECT_ANSWER } from '../lib/batch/points';
import { CHIP_EMERALD } from '../lib/ui/tokens';
import { IconStar } from './icons';
import { useRewardFx } from './fx/RewardFxContext';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
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
 *
 * CR-82 (spec s16.2): registers itself as the star-fly score target and
 * ticks (160ms scale pulse) when the score climbs. Reduced motion skips
 * the tick - the RewardFxContext ring highlight still marks the gain.
 */
export default function LiveScore({ session }: LiveScoreProps) {
  const { correct, answered } = computeLiveScore(session);
  const points = correct * POINTS_PER_CORRECT_ANSWER;
  const { registerScoreTarget } = useRewardFx();
  const reducedMotion = usePrefersReducedMotion();
  const prevPointsRef = useRef(points);
  const [tick, setTick] = useState(false);

  /* Register / unregister as the star-fly target with the reward layer.
     Callback ref, not a mount effect: the chip does not exist on the
     first render (`answered === 0` returns null below), so a mount-time
     registration would store null forever and star-fly would never find
     a destination (external review r34-A1). React calls this with the
     element when it mounts and null when it unmounts. */
  const setChipRef = useCallback(
    (el: HTMLParagraphElement | null) => {
      registerScoreTarget(el);
    },
    [registerScoreTarget],
  );

  /* 160ms chip tick when the score climbs (full motion only). */
  useEffect(() => {
    if (points > prevPointsRef.current && !reducedMotion) {
      setTick(true);
      const t = setTimeout(() => setTick(false), 160);
      prevPointsRef.current = points;
      return () => clearTimeout(t);
    }
    prevPointsRef.current = points;
  }, [points, reducedMotion]);

  /* CR-69: "0 điểm (0/0 đúng)" before the first answer reads like a
    broken scoreboard - show the chip only once there is a score. */
  if (answered === 0) return null;

  return (
    <p
      ref={setChipRef}
      data-testid="live-score"
      className={`${CHIP_EMERALD} motion-reduce:transform-none`}
      style={{
        transform: tick ? 'scale(1.12)' : undefined,
        transition: 'transform 160ms ease-out',
      }}
    >
      <IconStar size={16} className="text-amber-300" />
      {points} điểm ({correct}/{answered} đúng)
    </p>
  );
}
