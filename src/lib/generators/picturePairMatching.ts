import type { PairMatchingPair, PairMatchingTile, PicturePairMatchingQuestion, VocabWord } from '../../types';
import { seededShuffleIndices } from '../prng';
import { stratifiedSample } from '../rounds/stratifiedSample';

const PAIRS_PER_BOARD = 4;
const TILES_PER_BOARD = PAIRS_PER_BOARD * 2;

function toPair(word: VocabWord): PairMatchingPair {
  return { word: word.word, emoji: word.emoji };
}

function buildTiles(pairs: readonly PairMatchingPair[], seed: string): PicturePairMatchingQuestion['tiles'] {
  const raw: PairMatchingTile[] = [];
  pairs.forEach((pair, pairIndex) => {
    raw.push({ pairIndex: pairIndex as 0 | 1 | 2 | 3, tileType: 'word', label: pair.word });
    raw.push({ pairIndex: pairIndex as 0 | 1 | 2 | 3, tileType: 'picture', label: pair.emoji });
  });

  const order = seededShuffleIndices(TILES_PER_BOARD, `${seed}-tiles`);
  return order.map((i) => raw[i]!) as [
    PairMatchingTile,
    PairMatchingTile,
    PairMatchingTile,
    PairMatchingTile,
    PairMatchingTile,
    PairMatchingTile,
    PairMatchingTile,
    PairMatchingTile,
  ];
}

function buildExplanation(pairs: readonly PairMatchingPair[]): string {
  const list = pairs.map((pair) => `${pair.word} - ${pair.emoji}`).join(', ');
  return `Các cặp đúng trong bảng này là: ${list}.`;
}

/**
 * Builds one board anchored to `anchorWord` - the anchor only seeds which 4
 * pairs get drawn (via stratifiedSample, for per-board topic balance,
 * plan.md v8 "drawn via stratifiedSample (topic balance)") and is not
 * guaranteed to appear on its own board.
 */
function buildBoard(anchorWord: VocabWord, words: readonly VocabWord[]): PicturePairMatchingQuestion {
  const seedBase = `ppm-${anchorWord.id}`;
  const pairWords = stratifiedSample(words, PAIRS_PER_BOARD, seedBase);
  const pairs = pairWords.map(toPair) as [PairMatchingPair, PairMatchingPair, PairMatchingPair, PairMatchingPair];

  return {
    id: `q-ppm-${anchorWord.id}`,
    topicId: anchorWord.topicId,
    kind: 'picture-pair-matching',
    pairs,
    tiles: buildTiles(pairs, seedBase),
    explanation: buildExplanation(pairs),
  };
}

/**
 * Generates picture-pair-matching board instances (plan.md v8 "Round 4
 * Addition: Picture-Pair-Matching Board"): one board per word in `words`,
 * each drawing its own 4 word-picture pairs via `stratifiedSample` so a
 * single board is not dominated by one topic (e.g. 4 Animals). Different
 * anchor words yield different board seeds, giving a large, varied pool for
 * Round 4's stratified per-Batch draw (see round4DescribeAndChooseImage.ts).
 * Returns an empty pool if there are fewer than 4 words to pair (defensive,
 * never happens against the real vocabulary bank).
 */
export function generatePicturePairMatchingBoards(words: readonly VocabWord[]): PicturePairMatchingQuestion[] {
  if (words.length < PAIRS_PER_BOARD) {
    return [];
  }
  return words.map((anchorWord) => buildBoard(anchorWord, words));
}
