import type { PicturePairMatchingQuestion } from '../../types';

/** "Up to 3 mistakes allowed" per plan.md v8 / AC32 (medium-confidence research finding). */
export const MAX_PAIR_MATCHING_MISTAKES = 3;
const PAIR_COUNT = 4;

export interface PairAttemptOutcome {
  tileIndexA: number;
  tileIndexB: number;
  correct: boolean;
}

export interface PairMatchingBoardState {
  matchedPairIndices: readonly number[];
  pendingTileIndex: number | null;
  mistakeCount: number;
  /** Last evaluated attempt, for the incorrect-flash visual. Cleared as soon as a fresh first tile is selected. */
  lastAttempt: PairAttemptOutcome | null;
}

export type PairMatchingOutcome = 'solved' | 'failed' | null;

export function createPairMatchingBoardState(): PairMatchingBoardState {
  return { matchedPairIndices: [], pendingTileIndex: null, mistakeCount: 0, lastAttempt: null };
}

/** null while the board is still in progress; AC32's two resolution states once it is done. */
export function getPairMatchingOutcome(state: PairMatchingBoardState): PairMatchingOutcome {
  if (state.matchedPairIndices.length >= PAIR_COUNT) return 'solved';
  if (state.mistakeCount > MAX_PAIR_MATCHING_MISTAKES) return 'failed';
  return null;
}

export function isPairMatchingTileMatched(
  state: PairMatchingBoardState,
  tiles: PicturePairMatchingQuestion['tiles'],
  tileIndex: number,
): boolean {
  const tile = tiles[tileIndex];
  return tile !== undefined && state.matchedPairIndices.includes(tile.pairIndex);
}

/**
 * Pure reducer driving one tile click (plan.md v8 "Round 4 Addition:
 * Picture-Pair-Matching Board", AC32). The first click of an attempt marks a
 * tile "pending"; the second click evaluates the pair immediately - correct
 * only if both tiles share the same `pairIndex` AND have different
 * `tileType`s.
 *
 * Design choice for same-type clicks (word+word or picture+picture, plan.md
 * "never treated as a valid match attempt"): since exactly one tile per
 * pairIndex is a word tile and the other is a picture tile, two tiles of the
 * same type can never share a pairIndex - they are structurally guaranteed
 * to evaluate as a mismatch. Rather than special-casing them into a silent
 * no-op, they are treated as a real (always-failing) attempt that still
 * consumes a mistake - this is both the simplest rule to implement/test and
 * keeps "same-type clicks can never produce a match" true by construction,
 * matching plan.md's wording.
 *
 * The incorrect-flash signal (`lastAttempt`) is cleared the moment a fresh
 * first tile is selected rather than on a timer, so the whole state machine
 * stays synchronous and deterministic - easier to test, and avoids any
 * timer-based flakiness for a 7-year-old's real clicks.
 *
 * Once resolved (solved or failed), an already-matched tile, or a re-click
 * of the currently pending tile, every further click is a no-op.
 */
export function clickPairMatchingTile(
  state: PairMatchingBoardState,
  tiles: PicturePairMatchingQuestion['tiles'],
  tileIndex: number,
): PairMatchingBoardState {
  if (getPairMatchingOutcome(state) !== null) return state;
  if (isPairMatchingTileMatched(state, tiles, tileIndex)) return state;
  if (state.pendingTileIndex === tileIndex) return state;

  if (state.pendingTileIndex === null) {
    return { ...state, pendingTileIndex: tileIndex, lastAttempt: null };
  }

  const tileA = tiles[state.pendingTileIndex]!;
  const tileB = tiles[tileIndex]!;
  const correct = tileA.pairIndex === tileB.pairIndex && tileA.tileType !== tileB.tileType;

  if (correct) {
    return {
      ...state,
      matchedPairIndices: [...state.matchedPairIndices, tileA.pairIndex],
      pendingTileIndex: null,
      lastAttempt: { tileIndexA: state.pendingTileIndex, tileIndexB: tileIndex, correct: true },
    };
  }

  return {
    ...state,
    pendingTileIndex: null,
    mistakeCount: state.mistakeCount + 1,
    lastAttempt: { tileIndexA: state.pendingTileIndex, tileIndexB: tileIndex, correct: false },
  };
}
