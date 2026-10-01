import type { PairMatchingPair, PairMatchingTile, PicturePairMatchingQuestion, VocabWord } from '../../types';
import { isLiteralImageWord } from '../content/imageSemantics';
import { seededShuffleIndices } from '../prng';
import { stratifiedSample } from '../rounds/stratifiedSample';

const PAIRS_PER_BOARD = 4;
const TILES_PER_BOARD = PAIRS_PER_BOARD * 2;

function toPair(word: VocabWord): PairMatchingPair {
  return { word: word.word, emoji: word.emoji, wordId: word.id };
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
/**
 * Draws the 4 pair words for one board, guaranteeing the 4 picture tiles
 * are visually distinct: if the plain stratified draw picks two words that
 * share an emoji (the 4 allowlisted shared-emoji pairs in the bank, e.g.
 * cry/sad -> 😢, CR-01/PRD F-8), the board redraws deterministically from
 * the full stratified order and keeps the first 4 words with unique emojis.
 * Boards without a collision keep the original stratifiedSample output
 * byte-for-byte, so unchanged words keep their generated question pools.
 */
function pickBoardWords(words: readonly VocabWord[], seedBase: string): VocabWord[] {
  const first = stratifiedSample(words, PAIRS_PER_BOARD, seedBase);
  if (new Set(first.map((w) => w.emoji)).size === PAIRS_PER_BOARD) {
    return first;
  }

  const seenEmojis = new Set<string>();
  const deduped = stratifiedSample(words, words.length, seedBase).filter((w) => {
    if (seenEmojis.has(w.emoji)) return false;
    seenEmojis.add(w.emoji);
    return true;
  });
  return deduped.length >= PAIRS_PER_BOARD ? deduped.slice(0, PAIRS_PER_BOARD) : first;
}

function buildBoard(anchorWord: VocabWord, words: readonly VocabWord[]): PicturePairMatchingQuestion {
  const seedBase = `ppm-${anchorWord.id}`;
  const pairWords = pickBoardWords(words, seedBase);
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
  // CR-24: only literal-emoji words pair - matching "vlog" to 📹 teaches a
  // wrong association (the tile is a camera, not a vlog).
  const literal = words.filter(isLiteralImageWord);
  if (literal.length < PAIRS_PER_BOARD) {
    return [];
  }
  return literal.map((anchorWord) => buildBoard(anchorWord, literal));
}
