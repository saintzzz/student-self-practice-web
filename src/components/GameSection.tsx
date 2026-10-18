import { Suspense, useRef } from 'react';
import type { Grade } from '../types';
import { GAME_COMPONENTS } from '../games/registry';
import { GAME_DEFS } from '../games/defs';
import { recordGameResult } from '../lib/engagement/store';
import type { GameEnd, GameId } from '../games/types';
import { material, SCREEN_ENTER } from '../lib/ui/tokens';

/**
 * CR-86 "Game-as-exam" host: mounts a registered Game Zone game inside a
 * Batch Round (bonus Round 5) - the game run IS the assessment. The
 * wrapper owns the round board surface, the lazy Suspense (GameScreen's
 * route boundary does not exist here), and the single-completion guard
 * so one run can never write its outcome twice. Game stars still flow
 * through `recordGameResult` with the round's deterministic seed
 * (`batch:<batchSeed>:r<idx>`), so the Game Zone ledger stays idempotent
 * on remount while every new Batch mints fresh stars - same rule as
 * standalone play. Practice scoring goes out through `onComplete`, which
 * `completeGameRound` maps onto the RoundOutcome (uniform
 * POINTS_PER_CORRECT_ANSWER scale).
 */
interface GameSectionProps {
  grade: Grade;
  gameId: GameId;
  /** Deterministic per round - e.g. `batch:<batchSeed>:r4`. */
  seed: string;
  level?: number;
  onComplete: (end: GameEnd) => void;
}

export default function GameSection({ grade, gameId, seed, level = 1, onComplete }: GameSectionProps) {
  const Game = GAME_COMPONENTS[gameId];
  const def = GAME_DEFS.find((d) => d.id === gameId);
  const endedRef = useRef(false);

  const handleEnd = (end: GameEnd) => {
    if (endedRef.current) return;
    endedRef.current = true;
    recordGameResult(grade.id, gameId, seed, end.points, end.maxPoints, level);
    onComplete(end);
  };

  if (!Game || !def) {
    /* Registry/desync safety net: skip the round rather than crash the
       Batch - the outcome lands as an empty implemented round. */
    return (
      <div className={`${material.board} ${SCREEN_ENTER} flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center`}>
        <p className="font-semibold text-slate-200">Trò chơi chưa sẵn sàng - qua vòng tiếp nhé.</p>
        <button
          type="button"
          data-testid="game-section-skip"
          onClick={() => handleEnd({ points: 0, maxPoints: 0, correctCount: 0, attempted: 0 })}
          className="min-h-[44px] rounded-2xl bg-amber-400 px-6 py-2 font-extrabold text-amber-950 transition hover:bg-amber-300 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
        >
          Vòng tiếp
        </button>
      </div>
    );
  }

  return (
    <div className={`${material.board} ${SCREEN_ENTER} flex flex-1 flex-col gap-3 p-4 sm:p-5 [@media(max-height:420px)]:gap-1.5 [@media(max-height:420px)]:p-2`}>
      {/* Kids-UX: the bonus round announces itself - same information
          density as the QUESTION_BANNER, gold = treat/reward language. */}
      <p
        data-testid="game-section-banner"
        className="shrink-0 rounded-xl bg-white/10 px-4 py-2 text-center text-sm font-bold text-amber-200 ring-1 ring-white/15 [@media(max-height:420px)]:py-1 [@media(max-height:420px)]:text-xs"
      >
        Vòng thưởng - chơi hết mình, điểm vẫn tính như bài tập!
      </p>
      <div className="flex min-h-0 flex-1 flex-col">
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center text-sm font-semibold text-slate-300">
              Đang tải trò chơi...
            </div>
          }
        >
          <Game grade={grade} seed={seed} level={level} onEnd={handleEnd} />
        </Suspense>
      </div>
    </div>
  );
}
