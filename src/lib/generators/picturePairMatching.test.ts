import { describe, expect, it } from 'vitest';
import { generatePicturePairMatchingBoards } from './picturePairMatching';
import { ALL_WORDS } from '../../data/vocabulary';
import type { PicturePairMatchingQuestion, VocabWord } from '../../types';

function makeWords(topicCounts: Record<string, number>): VocabWord[] {
  const words: VocabWord[] = [];
  for (const [topicId, count] of Object.entries(topicCounts)) {
    for (let i = 0; i < count; i++) {
      words.push({
        id: `${topicId}-${i}`,
        topicId,
        word: `${topicId}word${i}`,
        emoji: `emoji-${topicId}-${i}`,
        countable: true,
        explanation: `explanation for ${topicId}-${i}`,
      });
    }
  }
  return words;
}

describe('generatePicturePairMatchingBoards', () => {
  it('generates one board per input word', () => {
    const words = makeWords({ a: 3, b: 3, c: 3 });
    const boards = generatePicturePairMatchingBoards(words);

    expect(boards).toHaveLength(words.length);
  });

  it('every board has exactly 4 distinct pairs and 8 tiles', () => {
    const words = makeWords({ a: 3, b: 3, c: 3, d: 3 });
    const boards = generatePicturePairMatchingBoards(words);

    for (const board of boards) {
      expect(board.kind).toBe('picture-pair-matching');
      expect(board.pairs).toHaveLength(4);
      expect(board.tiles).toHaveLength(8);

      const distinctWords = new Set(board.pairs.map((pair) => pair.word));
      expect(distinctWords.size).toBe(4);
    }
  });

  it('every board has exactly 4 word tiles and 4 picture tiles, one of each per pairIndex', () => {
    const words = makeWords({ a: 3, b: 3, c: 3, d: 3 });
    const boards = generatePicturePairMatchingBoards(words);

    for (const board of boards) {
      const wordTiles = board.tiles.filter((tile) => tile.tileType === 'word');
      const pictureTiles = board.tiles.filter((tile) => tile.tileType === 'picture');
      expect(wordTiles).toHaveLength(4);
      expect(pictureTiles).toHaveLength(4);

      for (let pairIndex = 0; pairIndex < 4; pairIndex++) {
        expect(wordTiles.filter((tile) => tile.pairIndex === pairIndex)).toHaveLength(1);
        expect(pictureTiles.filter((tile) => tile.pairIndex === pairIndex)).toHaveLength(1);
      }
    }
  });

  it('each tile label matches the board pairs data (word tile = pairs[pairIndex].word, picture tile = pairs[pairIndex].emoji)', () => {
    const words = makeWords({ a: 3, b: 3, c: 3, d: 3 });
    const boards = generatePicturePairMatchingBoards(words);

    for (const board of boards) {
      for (const tile of board.tiles) {
        const pair = board.pairs[tile.pairIndex];
        if (tile.tileType === 'word') {
          expect(tile.label).toBe(pair.word);
        } else {
          expect(tile.label).toBe(pair.emoji);
        }
      }
    }
  });

  it('shuffles tiles so they are not always in a fixed word-then-picture block order', () => {
    const words = makeWords({ a: 3, b: 3, c: 3, d: 3 });
    const boards = generatePicturePairMatchingBoards(words);

    const isBlockOrder = (board: PicturePairMatchingQuestion) =>
      board.tiles.slice(0, 4).every((tile) => tile.tileType === 'word');
    expect(boards.every(isBlockOrder)).toBe(false);
  });

  it('is deterministic for the same word pool', () => {
    const words = makeWords({ a: 3, b: 3, c: 3 });

    const first = generatePicturePairMatchingBoards(words).map((b) => b.id);
    const second = generatePicturePairMatchingBoards(words).map((b) => b.id);

    expect(first).toEqual(second);
  });

  it('draws each board topic-balanced via stratifiedSample (not dominated by one huge topic)', () => {
    // One huge topic (20 words) + 3 small topics (2 words each) = 4 eligible topics.
    const words = makeWords({ huge: 20, a: 2, b: 2, c: 2 });
    const boards = generatePicturePairMatchingBoards(words);

    for (const board of boards) {
      const topicIds = new Set(
        board.pairs.map((pair) => words.find((w) => w.word === pair.word)!.topicId),
      );
      // 4 eligible topics, 4 pairs per board: fair share means every topic
      // should contribute before any topic contributes a 2nd (stratifiedSample's
      // own fairness guarantee, exercised here through this generator).
      expect(topicIds.size).toBe(4);
    }
  });

  it('returns an empty array when fewer than 4 words are available (defensive)', () => {
    const words = makeWords({ a: 3 });
    expect(generatePicturePairMatchingBoards(words)).toEqual([]);
  });

  it('CR-01: never puts two words sharing an emoji on the same board, even when the pool has emoji collisions', () => {
    // Two word pairs share emoji-B and emoji-C; only 6 distinct emojis exist.
    const words: VocabWord[] = [
      { id: 'a1', topicId: 'a', word: 'w1', emoji: 'emoji-A', countable: true, explanation: 'x' },
      { id: 'a2', topicId: 'a', word: 'w2', emoji: 'emoji-B', countable: true, explanation: 'x' },
      { id: 'b1', topicId: 'b', word: 'w3', emoji: 'emoji-B', countable: true, explanation: 'x' },
      { id: 'b2', topicId: 'b', word: 'w4', emoji: 'emoji-C', countable: true, explanation: 'x' },
      { id: 'c1', topicId: 'c', word: 'w5', emoji: 'emoji-C', countable: true, explanation: 'x' },
      { id: 'c2', topicId: 'c', word: 'w6', emoji: 'emoji-D', countable: true, explanation: 'x' },
      { id: 'd1', topicId: 'd', word: 'w7', emoji: 'emoji-E', countable: true, explanation: 'x' },
      { id: 'd2', topicId: 'd', word: 'w8', emoji: 'emoji-F', countable: true, explanation: 'x' },
    ];
    const boards = generatePicturePairMatchingBoards(words);
    expect(boards).toHaveLength(words.length);

    for (const board of boards) {
      const emojis = new Set(board.pairs.map((pair) => pair.emoji));
      expect(emojis.size, `board ${board.id} has a duplicate picture tile`).toBe(4);
    }
  });

  it('CR-01: every board generated from the real vocabulary bank has 4 distinct picture tiles', () => {
    const boards = generatePicturePairMatchingBoards(ALL_WORDS);

    for (const board of boards) {
      const emojis = new Set(board.pairs.map((pair) => pair.emoji));
      expect(emojis.size, `board ${board.id} has a duplicate picture tile`).toBe(4);
    }
  });
});
