import type { ComponentType } from 'react';
import type { Grade, QuestionKind } from '../types';
import type { HubTone } from '../lib/ui/tokens';

/**
 * CR-83 Game Zone - shared contracts. A game is a self-contained arcade
 * session over grade-scoped vocabulary: it renders rounds from the SAME
 * generator types the Batch/Exam use, owns its play loop, and reports one
 * GameEnd when finished. Stars go through the normal engagement ledger
 * (`recordGameResult`), so games never mint a parallel currency.
 */
export type GameId =
  | 'memory-match'
  | 'balloon-pop'
  | 'racing-cars'
  | 'fishing-catch'
  | 'letter-catch'
  | 'tic-tac-toe'
  | 'whack-a-mole'
  | 'feed-the-pig'
  | 'picture-reveal'
  | 'treasure-chest'
  | 'gold-quest'
  | 'quiz-show'
  | 'maze-chase'
  | 'word-worm'
  | 'castle-guard';

export interface GameEnd {
  /** Numerator for starsForScore (normalized per game, see each shell). */
  points: number;
  maxPoints: number;
  /** Correct answers in the run - feeds daily quest/pet/badges. */
  correctCount: number;
}

export interface GameProps {
  grade: Grade;
  /** Fresh per play - seeds every pick so a replay is a new run. */
  seed: string;
  onEnd: (end: GameEnd) => void;
}

/** Static shelf metadata - deliberately component-free so the hub tile
 *  (main bundle) never pulls the game implementations in. */
export interface GameDef {
  id: GameId;
  title: string;
  tagline: string;
  emoji: string;
  /** Optional grade filter - default all grades see the card. */
  grades?: readonly string[];
  /** Card identity hue (destination-card system, CR-85 redesign). */
  tone?: HubTone;
  /** Recently added game - the shelf badges it "Mới". */
  fresh?: boolean;
}

/**
 * Reusable step-mechanic a game is built on: the registry records which
 * question kinds it can host so a future Round/exam can embed it instead
 * of duplicating the interaction. `Step` is the bare interactive field
 * (no game framing) - the contract exam/practice renderers would use.
 */
export interface GameMechanic {
  /** The arcade mechanic id (used in docs/tests, not persisted). */
  id: string;
  /** Question kinds this mechanic can render as a step. */
  kinds: readonly QuestionKind[];
}

export type GameComponent = ComponentType<GameProps>;
