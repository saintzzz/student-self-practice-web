/**
 * Round 4 addition (plan.md v8 "Round 4 Addition: Picture-Pair-Matching
 * Board"). Split out of types/index.ts to keep that file under the
 * project's ~200-line guideline - re-exported from index.ts so every
 * existing `import ... from '../types'` / `'../../types'` call site is
 * unaffected.
 */

/** One word-picture pair on a picture-pair-matching board. */
export interface PairMatchingPair {
  word: string;
  emoji: string;
}

export type PairTileType = 'word' | 'picture';

/**
 * One of the 8 shuffled tiles on a picture-pair-matching board. `pairIndex`
 * identifies which of the board's 4 pairs this tile belongs to (0-3); a real
 * match is exactly one word tile and one picture tile sharing the same
 * `pairIndex` - this is how the board's pure reducer
 * (rounds/pairMatchingBoard.ts) evaluates an attempt without ever needing a
 * vocabulary lookup.
 */
export interface PairMatchingTile {
  pairIndex: 0 | 1 | 2 | 3;
  tileType: PairTileType;
  label: string;
}

/**
 * A board of exactly 4 word-picture pairs rendered as 8 shuffled tiles
 * (`tiles`). The student clicks pairs of tiles until either all 4 pairs are
 * found or the mistake budget (rounds/pairMatchingBoard.ts's
 * `MAX_PAIR_MATCHING_MISTAKES`) is exceeded - this whole board counts as ONE
 * question in Round 4's sequence, matching every other kind's "answer, see
 * feedback, Next" progression.
 */
export interface PicturePairMatchingQuestion {
  id: string;
  topicId: string;
  kind: 'picture-pair-matching';
  pairs: readonly [PairMatchingPair, PairMatchingPair, PairMatchingPair, PairMatchingPair];
  tiles: readonly [
    PairMatchingTile,
    PairMatchingTile,
    PairMatchingTile,
    PairMatchingTile,
    PairMatchingTile,
    PairMatchingTile,
    PairMatchingTile,
    PairMatchingTile,
  ];
  explanation: string;
}
