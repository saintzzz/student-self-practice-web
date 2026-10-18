import { createRetryableLazy, type RetryableLazy } from '../lib/retryableLazy';
import type { GameId, GameProps } from './types';

/**
 * CR-86 r57: per-game lazy entry points for hosts OUTSIDE the Game Zone
 * shell (Batch bonus Round today, exam surfaces later). Unlike
 * `GAME_COMPONENTS` in registry.tsx - a static map bundled inside the
 * Game Zone chunk - each entry here is a dynamic import, so the host only
 * ever fetches the ONE game it picked. `createRetryableLazy` gives every
 * entry the retry contract (fresh import() per attempt number) that an
 * error boundary needs after a stale-chunk or network rejection.
 */
export const GAME_LAZY: Record<GameId, RetryableLazy<GameProps>> = {
  'memory-match': createRetryableLazy(() => import('./games/MemoryMatch')),
  'balloon-pop': createRetryableLazy(() => import('./games/BalloonPop')),
  'racing-cars': createRetryableLazy(() => import('./games/RacingCars')),
  'fishing-catch': createRetryableLazy(() => import('./games/FishingCatch')),
  'letter-catch': createRetryableLazy(() => import('./games/LetterCatch')),
  'tic-tac-toe': createRetryableLazy(() => import('./games/TicTacToe')),
  'whack-a-mole': createRetryableLazy(() => import('./games/WhackMole')),
  'feed-the-pig': createRetryableLazy(() => import('./games/FeedThePig')),
  'picture-reveal': createRetryableLazy(() => import('./games/PictureReveal')),
  'treasure-chest': createRetryableLazy(() => import('./games/TreasureChest')),
  'gold-quest': createRetryableLazy(() => import('./games/GoldQuest')),
  'quiz-show': createRetryableLazy(() => import('./games/QuizShow')),
  'maze-chase': createRetryableLazy(() => import('./games/MazeChase')),
  'word-worm': createRetryableLazy(() => import('./games/WordWorm')),
  'castle-guard': createRetryableLazy(() => import('./games/CastleGuard')),
};
