import { Component, Suspense, useRef, type ReactNode } from 'react';
import type { Grade } from '../types';
import { GAME_LAZY } from '../games/lazyComponents';
import { GAME_DEFS } from '../games/defs';
import { recordGameResult } from '../lib/engagement/store';
import type { GameEnd, GameId } from '../games/types';
import { material, SCREEN_ENTER } from '../lib/ui/tokens';

/**
 * CR-86 "Game-as-exam" host: mounts a registered Game Zone game inside a
 * Batch Round (bonus Round 5) - the game run IS the assessment. The
 * wrapper owns the round board surface, the per-game lazy Suspense
 * (GAME_LAZY - one dynamic chunk per game, never the whole arcade), and
 * the single-completion guard so one run can never write its outcome
 * twice. Game stars still flow through `recordGameResult` with the
 * round's deterministic seed (`batch:<batchSeed>:r<idx>`), so the Game
 * Zone ledger stays idempotent on remount while every new Batch mints
 * fresh stars - same rule as standalone play. Practice scoring goes out
 * through `onComplete`, which `completeGameRound` maps onto the
 * RoundOutcome (uniform POINTS_PER_CORRECT_ANSWER scale).
 */
interface GameSectionProps {
  grade: Grade;
  gameId: GameId;
  /** Deterministic per round - e.g. `batch:<batchSeed>:r4`. */
  seed: string;
  level?: number;
  onComplete: (end: GameEnd) => void;
}

interface BoundaryProps {
  onSkip: () => void;
  children: (attempt: number) => ReactNode;
}

interface BoundaryState {
  attempt: number;
  failed: boolean;
}

/* CR-86 r57: a rejected chunk (stale deploy, flaky network) or a game
   crash must never sink a Batch AFTER four completed Rounds. Same family
   as GameRouteBoundary - retry mints a fresh lazy type per attempt, and
   "Qua vong nay" preserves progress by ending the round with a zero
   outcome instead of crashing the session. */
class GameSectionBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { attempt: 0, failed: false };

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true };
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p data-testid="game-section-error" className="font-semibold text-slate-200">
            Trò chơi chưa tải được - em thử lại nhé.
          </p>
          <button
            type="button"
            data-testid="game-section-retry"
            onClick={() => this.setState((s) => ({ attempt: s.attempt + 1, failed: false }))}
            className="min-h-[44px] rounded-2xl bg-amber-400 px-6 py-2 font-extrabold text-amber-950 transition hover:bg-amber-300 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
          >
            Thử lại
          </button>
          <button
            type="button"
            data-testid="game-section-skip"
            onClick={this.props.onSkip}
            className="min-h-[44px] rounded-2xl border-2 border-white/20 px-6 py-2 font-bold text-slate-200 transition hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300"
          >
            Qua vòng này
          </button>
        </div>
      );
    }
    return this.props.children(this.state.attempt);
  }
}

export default function GameSection({ grade, gameId, seed, level = 1, onComplete }: GameSectionProps) {
  const lazy = GAME_LAZY[gameId];
  const def = GAME_DEFS.find((d) => d.id === gameId);
  const endedRef = useRef(false);

  const handleEnd = (end: GameEnd) => {
    if (endedRef.current) return;
    endedRef.current = true;
    recordGameResult(grade.id, gameId, seed, end.points, end.maxPoints, level);
    onComplete(end);
  };

  const skipRound = () => handleEnd({ points: 0, maxPoints: 0, correctCount: 0, attempted: 0 });

  if (!lazy || !def) {
    /* Registry/desync safety net: skip the round rather than crash the
       Batch - the outcome lands as an empty implemented round. */
    return (
      <div className={`${material.board} ${SCREEN_ENTER} flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center`}>
        <p className="font-semibold text-slate-200">Trò chơi chưa sẵn sàng - qua vòng tiếp nhé.</p>
        <button
          type="button"
          data-testid="game-section-skip"
          onClick={skipRound}
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
        <GameSectionBoundary onSkip={skipRound}>
          {(attempt) => {
            const Game = lazy.typeFor(attempt);
            return (
              <Suspense
                fallback={
                  <div className="flex flex-1 items-center justify-center text-sm font-semibold text-slate-300">
                    Đang tải trò chơi...
                  </div>
                }
              >
                <Game key={attempt} grade={grade} seed={seed} level={level} onEnd={handleEnd} />
              </Suspense>
            );
          }}
        </GameSectionBoundary>
      </div>
    </div>
  );
}
