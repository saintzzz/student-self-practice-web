import { Component, Suspense, type ComponentType, type ReactNode } from 'react';
import type { Grade } from '../types';
import type { GameId } from './types';
import { createRetryableLazy } from '../lib/retryableLazy';
import { reloadPage } from '../lib/reload';

/**
 * CR-83: the whole Game Zone (all six games + art) lives in ONE lazy
 * chunk behind this boundary - main-bundle budget stays intact and a
 * flaky chunk leaves a retry affordance instead of a blank route (same
 * family as FlashcardErrorBoundary/ExamRouteBoundary, D-03).
 */
interface GameScreenProps {
  grade: Grade;
  gameId: GameId;
  onExit: () => void;
}

const lazyScreen = createRetryableLazy<GameScreenProps>(
  () => import('./GameScreen') as Promise<{ default: ComponentType<GameScreenProps> }>,
);

interface BoundaryState {
  attempt: number;
  failed: boolean;
}

class GameRouteBoundaryInner extends Component<GameScreenProps, BoundaryState> {
  state: BoundaryState = { attempt: 0, failed: false };

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true };
  }

  render(): ReactNode {
    const { onExit } = this.props;
    if (this.state.failed) {
      return (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 py-10 text-center">
          <p data-testid="game-error" className="text-xl font-bold text-white">
            Chưa mở được trò chơi - em thử lại nhé.
          </p>
          <button
            type="button"
            data-testid="game-error-retry"
            onClick={() => this.setState((s) => ({ attempt: s.attempt + 1, failed: false }))}
            className="rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-6 py-3 font-bold text-white"
          >
            Thử lại
          </button>
          {this.state.attempt >= 1 && (
            <button
              type="button"
              data-testid="game-error-reload"
              onClick={() => reloadPage()}
              className="rounded-2xl border-2 border-white/20 px-6 py-3 font-bold text-slate-200"
            >
              Tải lại trang
            </button>
          )}
          <button
            type="button"
            data-testid="game-error-exit"
            onClick={onExit}
            className="rounded-2xl border-2 border-white/20 px-6 py-3 font-bold text-slate-200"
          >
            Về trang chính
          </button>
        </div>
      );
    }

    const Lazy = lazyScreen.typeFor(this.state.attempt);
    return (
      <Suspense
        fallback={
          <div
            data-testid="game-loading"
            aria-busy="true"
            className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4"
          >
            <div className="h-24 w-24 animate-pulse rounded-full bg-amber-300/30 motion-reduce:animate-none" />
          </div>
        }
      >
        <Lazy key={this.state.attempt} {...this.props} />
      </Suspense>
    );
  }
}

export default function GameRouteBoundary(props: GameScreenProps) {
  return <GameRouteBoundaryInner {...props} />;
}
