import { describe, expect, it } from 'vitest';
import {
  MAX_PAIR_MATCHING_MISTAKES,
  clickPairMatchingTile,
  createPairMatchingBoardState,
  getPairMatchingOutcome,
  isPairMatchingTileMatched,
} from './pairMatchingBoard';
import type { PicturePairMatchingQuestion } from '../../types';

/** 4 pairs, tiles arranged as [word0, picture0, word1, picture1, word2, picture2, word3, picture3]. */
const TILES: PicturePairMatchingQuestion['tiles'] = [
  { pairIndex: 0, tileType: 'word', label: 'cat' },
  { pairIndex: 0, tileType: 'picture', label: '🐱' },
  { pairIndex: 1, tileType: 'word', label: 'dog' },
  { pairIndex: 1, tileType: 'picture', label: '🐶' },
  { pairIndex: 2, tileType: 'word', label: 'fish' },
  { pairIndex: 2, tileType: 'picture', label: '🐟' },
  { pairIndex: 3, tileType: 'word', label: 'bird' },
  { pairIndex: 3, tileType: 'picture', label: '🐦' },
];

function click(state: ReturnType<typeof createPairMatchingBoardState>, tileIndex: number) {
  return clickPairMatchingTile(state, TILES, tileIndex);
}

describe('getPairMatchingOutcome', () => {
  it('is null for a fresh board', () => {
    expect(getPairMatchingOutcome(createPairMatchingBoardState())).toBeNull();
  });
});

describe('clickPairMatchingTile - correct match', () => {
  it('marks both tiles matched when a word tile and its picture tile are clicked (any order)', () => {
    let state = createPairMatchingBoardState();
    state = click(state, 0); // cat (word, pairIndex 0)
    state = click(state, 1); // 🐱 (picture, pairIndex 0)

    expect(state.matchedPairIndices).toEqual([0]);
    expect(isPairMatchingTileMatched(state, TILES, 0)).toBe(true);
    expect(isPairMatchingTileMatched(state, TILES, 1)).toBe(true);
    expect(state.mistakeCount).toBe(0);
    expect(state.lastAttempt).toEqual({ tileIndexA: 0, tileIndexB: 1, correct: true });
  });

  it('finding all 4 pairs resolves the board as solved (AC32)', () => {
    let state = createPairMatchingBoardState();
    for (const [a, b] of [
      [0, 1],
      [2, 3],
      [4, 5],
      [6, 7],
    ]) {
      state = click(state, a!);
      state = click(state, b!);
    }

    expect(getPairMatchingOutcome(state)).toBe('solved');
    expect(state.mistakeCount).toBe(0);
  });
});

describe('clickPairMatchingTile - mismatches', () => {
  it('an incorrect attempt (different pairIndex, one word one picture) increments mistakeCount and does not match', () => {
    let state = createPairMatchingBoardState();
    state = click(state, 0); // cat (word, pairIndex 0)
    state = click(state, 3); // 🐶 (picture, pairIndex 1)

    expect(state.matchedPairIndices).toEqual([]);
    expect(state.mistakeCount).toBe(1);
    expect(state.lastAttempt).toEqual({ tileIndexA: 0, tileIndexB: 3, correct: false });
  });

  it('two word tiles (same type) can never match, and still counts as a mistake', () => {
    let state = createPairMatchingBoardState();
    state = click(state, 0); // cat (word)
    state = click(state, 2); // dog (word)

    expect(state.matchedPairIndices).toEqual([]);
    expect(state.mistakeCount).toBe(1);
  });

  it('two picture tiles (same type) can never match, and still counts as a mistake', () => {
    let state = createPairMatchingBoardState();
    state = click(state, 1); // 🐱 (picture)
    state = click(state, 3); // 🐶 (picture)

    expect(state.matchedPairIndices).toEqual([]);
    expect(state.mistakeCount).toBe(1);
  });

  it('exceeding 3 mistakes resolves the board as failed (AC32)', () => {
    let state = createPairMatchingBoardState();
    // 4 guaranteed-wrong word-vs-word attempts.
    for (let i = 0; i < 4; i++) {
      state = click(state, 0);
      state = click(state, 2);
    }

    expect(state.mistakeCount).toBe(4);
    expect(state.mistakeCount).toBeGreaterThan(MAX_PAIR_MATCHING_MISTAKES);
    expect(getPairMatchingOutcome(state)).toBe('failed');
  });

  it('exactly 3 mistakes does not yet fail the board (budget is "up to 3 allowed")', () => {
    let state = createPairMatchingBoardState();
    for (let i = 0; i < 3; i++) {
      state = click(state, 0);
      state = click(state, 2);
    }

    expect(state.mistakeCount).toBe(3);
    expect(getPairMatchingOutcome(state)).toBeNull();
  });
});

describe('clickPairMatchingTile - guards', () => {
  it('re-clicking the pending tile is a no-op', () => {
    let state = createPairMatchingBoardState();
    state = click(state, 0);
    const after = click(state, 0);

    expect(after).toBe(state);
  });

  it('clicking an already-matched tile is a no-op', () => {
    let state = createPairMatchingBoardState();
    state = click(state, 0);
    state = click(state, 1); // matches pairIndex 0

    const after = click(state, 0);
    expect(after).toBe(state);
  });

  it('ignores further clicks once the board has resolved (solved)', () => {
    let state = createPairMatchingBoardState();
    for (const [a, b] of [
      [0, 1],
      [2, 3],
      [4, 5],
      [6, 7],
    ]) {
      state = click(state, a!);
      state = click(state, b!);
    }

    const after = click(state, 4);
    expect(after).toBe(state);
  });

  it('ignores further clicks once the board has resolved (failed)', () => {
    let state = createPairMatchingBoardState();
    for (let i = 0; i < 4; i++) {
      state = click(state, 0);
      state = click(state, 2);
    }

    const after = click(state, 4);
    expect(after).toBe(state);
  });

  it('clears the previous incorrect-flash as soon as a fresh first tile is selected', () => {
    let state = createPairMatchingBoardState();
    state = click(state, 0);
    state = click(state, 2); // mismatch, lastAttempt set

    expect(state.lastAttempt).not.toBeNull();

    state = click(state, 4); // fresh first click of a new attempt
    expect(state.lastAttempt).toBeNull();
    expect(state.pendingTileIndex).toBe(4);
  });
});
