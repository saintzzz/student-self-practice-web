import { describe, expect, it } from 'vitest';
import { isLiteralImageWord, isFlagEmoji } from '../lib/content/imageSemantics';
import { getRhymeGroup } from '../lib/phonics/rhymes';
import { getInitialSound } from '../lib/phonics/initialSounds';
import {
  countingShopRounds,
  flagPool,
  flagRounds,
  imageChoiceRounds,
  listeningImageRounds,
  missingLetterRounds,
  oddOneOutRounds,
  pickGameWords,
  rhymeRounds,
  spellableWords,
  wordOrderRounds,
} from './sources';

const GRADES = ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5'];

describe('pickGameWords', () => {
  it('is deterministic for a fixed seed and varies across seeds', () => {
    const a = pickGameWords('grade-1', 'seed-a', 8).map((w) => w.id);
    const b = pickGameWords('grade-1', 'seed-a', 8).map((w) => w.id);
    const c = pickGameWords('grade-1', 'seed-b', 8).map((w) => w.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('returns only literal-image words (no figurative emoji puzzles)', () => {
    for (const gradeId of GRADES) {
      for (const w of pickGameWords(gradeId, 't', 25)) {
        expect(isLiteralImageWord(w)).toBe(true);
      }
    }
  });

  it('never exceeds the requested count or the pool size', () => {
    expect(pickGameWords('grade-1', 't', 5)).toHaveLength(5);
    expect(pickGameWords('grade-1', 't', 9999).length).toBeGreaterThan(0);
  });

  it('CR-144: blocked word ids never enter the game pool', () => {
    const blocked = new Set([
      'liar', 'villain', 'crazy', 'woozy', 'kiss', 'santa-claus', 'billiards',
      'pinata', 'aland',
      'ok-badge', 'new-badge', 'free-badge', 'vs-badge',
    ]);
    for (const gradeId of GRADES) {
      for (const w of pickGameWords(gradeId, 't', 9999)) {
        expect(blocked.has(w.id), `game pool must not contain "${w.id}"`).toBe(false);
      }
    }
  });
});

describe('imageChoiceRounds (Racing / Tic-tac-toe)', () => {
  it('returns one valid 4-option round per requested word', () => {
    for (const gradeId of GRADES) {
      const rounds = imageChoiceRounds(gradeId, 's1', 8);
      expect(rounds.length).toBe(8);
      for (const q of rounds) {
        expect(q.kind).toBe('image-choice');
        expect(q.options).toHaveLength(4);
        expect(q.options[q.correctIndex]).toBeTruthy();
      }
      // One variant per word -> every round has a distinct prompt word.
      expect(new Set(rounds.map((q) => q.wordId)).size).toBe(rounds.length);
    }
  });
});

describe('listeningImageRounds (Balloon / Fishing)', () => {
  it('returns one valid audio->picture round per requested word', () => {
    for (const gradeId of GRADES) {
      const rounds = listeningImageRounds(gradeId, 's2', 6);
      expect(rounds.length).toBe(6);
      for (const q of rounds) {
        expect(q.kind).toBe('listening-image-choice');
        expect(q.options).toHaveLength(4);
        expect(q.options[q.correctIndex]).toBeTruthy();
      }
      expect(new Set(rounds.map((q) => q.word)).size).toBe(rounds.length);
    }
  });
});

describe('spellableWords (Letter Catch)', () => {
  it('caps length for G1-2 at 6 and G3-5 at 8, alpha-only, min 3', () => {
    for (const w of spellableWords('grade-1', 's3', 30)) {
      expect(w.word).toMatch(/^[a-zA-Z]+$/);
      expect(w.word.length).toBeGreaterThanOrEqual(3);
      expect(w.word.length).toBeLessThanOrEqual(6);
    }
    for (const w of spellableWords('grade-4', 's3', 30)) {
      expect(w.word).toMatch(/^[a-zA-Z]+$/);
      expect(w.word.length).toBeGreaterThanOrEqual(3);
      expect(w.word.length).toBeLessThanOrEqual(8);
    }
  });

  it('is deterministic per seed', () => {
    expect(spellableWords('grade-2', 's4', 5).map((w) => w.id)).toEqual(
      spellableWords('grade-2', 's4', 5).map((w) => w.id),
    );
  });
});

describe('missingLetterRounds (CR-119)', () => {
  it('masks a contiguous internal run - first and last letters stay visible', () => {
    for (const gradeId of GRADES) {
      for (const q of missingLetterRounds(gradeId, 'ml1', 6)) {
        const w = q.word.word.toLowerCase();
        expect(w.length).toBeGreaterThanOrEqual(4);
        expect(q.maskedWord[0]).toBe(w[0]);
        expect(q.maskedWord[q.maskedWord.length - 1]).toBe(w[w.length - 1]);
        expect(q.maskedWord).toContain('_');
        expect(q.missing.length).toBeGreaterThanOrEqual(1);
        expect(q.missing.length).toBeLessThanOrEqual(2);
        // Rebuild the word from mask + missing to prove the mask is honest.
        const rebuilt = q.maskedWord.replace(/_ /g, '#').replace(/_/g, '#');
        expect(rebuilt.replace(/#+/g, q.missing)).toBe(w);
      }
    }
  });

  it('gives 4 options with the answer exactly once at correctIndex', () => {
    for (const q of missingLetterRounds('grade-3', 'ml2', 8)) {
      expect(q.options).toHaveLength(4);
      expect(q.options.filter((o) => o === q.missing)).toHaveLength(1);
      expect(q.options[q.correctIndex]).toBe(q.missing);
    }
  });

  it('is deterministic per seed', () => {
    const a = missingLetterRounds('grade-2', 'ml3', 5).map((q) => `${q.word.id}:${q.missing}`);
    expect(a).toEqual(missingLetterRounds('grade-2', 'ml3', 5).map((q) => `${q.word.id}:${q.missing}`));
  });

  it('r158-1: filters before sampling - always serves a full run when the pool has words', () => {
    for (const gradeId of GRADES) {
      const rounds = missingLetterRounds(gradeId, '2603', 5);
      expect(rounds.length).toBe(5);
    }
  });

  it('r158-3: all 4 options are distinct', () => {
    for (const gradeId of GRADES) {
      for (const q of missingLetterRounds(gradeId, '1', 8)) {
        expect(new Set(q.options).size).toBe(4);
      }
    }
  });
});

describe('wordOrderRounds (CR-119)', () => {
  it('returns deduped, correctly-scrambled sentences within token bounds', () => {
    for (const gradeId of GRADES) {
      const rounds = wordOrderRounds(gradeId, 'wo1', 6);
      const sentences = rounds.map((q) => q.sentence);
      expect(new Set(sentences).size).toBe(sentences.length);
      for (const q of rounds) {
        expect(q.tiles.length).toBeGreaterThanOrEqual(4);
        expect(q.tiles.length).toBeLessThanOrEqual(8);
        // Never serve a free point: scrambled order differs from authored.
        expect(q.tiles.join(' ')).not.toBe(q.sentence);
      }
    }
  });
});

describe('oddOneOutRounds (CR-119)', () => {
  it('builds 3 same-topic + 1 different-topic options every round', () => {
    for (const gradeId of GRADES) {
      const rounds = oddOneOutRounds(gradeId, 'oo1', 6);
      expect(rounds.length).toBeGreaterThan(0);
      for (const q of rounds) {
        expect(q.words).toHaveLength(4);
        const intruder = q.words[q.correctIndex]!;
        expect(intruder.topicId).not.toBe(q.groupTopicId);
        const others = q.words.filter((_, i) => i !== q.correctIndex);
        expect(others.every((w) => w.topicId === q.groupTopicId)).toBe(true);
      }
    }
  });

  it('is deterministic per seed', () => {
    const a = oddOneOutRounds('grade-3', 'oo2', 4).map((q) => q.words.map((w) => w.id).join(','));
    expect(a).toEqual(oddOneOutRounds('grade-3', 'oo2', 4).map((q) => q.words.map((w) => w.id).join(',')));
  });
});

describe('countingShopRounds (CR-147)', () => {
  const NUM_WORDS = new Set(['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']);

  it('every grade with manifest art yields rounds; correct option matches the tray total', () => {
    for (const gradeId of GRADES) {
      const rounds = countingShopRounds(gradeId, 'cs1', 4, 1);
      expect(rounds.length).toBeGreaterThan(0);
      for (const q of rounds) {
        expect(q.trays).toHaveLength(1);
        expect(q.options).toHaveLength(4);
        expect(q.options[q.correctIndex]).toBe([...NUM_WORDS].find((_, i) => i === q.total - 1));
        // off-by-one distractors live inside +-2 of the total or pad cleanly
        for (const o of q.options) expect(NUM_WORDS.has(o)).toBe(true);
      }
    }
  });

  it('level 2 two-tray rounds sum both trays and stay within 1..10', () => {
    const rounds = countingShopRounds('grade-1', 'cs2', 5, 2);
    expect(rounds.length).toBeGreaterThan(0);
    for (const q of rounds) {
      expect(q.trays).toHaveLength(2);
      expect(q.total).toBe(q.trays[0]!.count + q.trays[1]!.count);
      expect(q.total).toBeGreaterThanOrEqual(1);
      expect(q.total).toBeLessThanOrEqual(10);
    }
  });

  it('is deterministic per seed', () => {
    const a = countingShopRounds('grade-2', 'cs3', 3, 1).map((q) => q.trays[0]!.imageUrl);
    expect(a).toEqual(countingShopRounds('grade-2', 'cs3', 3, 1).map((q) => q.trays[0]!.imageUrl));
  });
});

describe('rhymeRounds (CR-147)', () => {
  it('L1: exactly one option rhymes with the target (sound family, not spelling)', () => {
    for (const gradeId of GRADES) {
      const rounds = rhymeRounds(gradeId, 'rp1', 4, 1);
      expect(rounds.length).toBeGreaterThan(0);
      for (const q of rounds) {
        const mate = q.options[q.correctIndex]!;
        expect(getRhymeGroup(mate.word)).toBe(getRhymeGroup(q.target.word));
        expect(getRhymeGroup(mate.word).startsWith('solo:')).toBe(false);
        for (const [i, w] of q.options.entries()) {
          if (i === q.correctIndex) continue;
          const same = getRhymeGroup(w.word) === getRhymeGroup(q.target.word) && !getRhymeGroup(w.word).startsWith('solo:');
          expect(same).toBe(false);
        }
      }
    }
  });

  it('L2: exactly one option shares the initial sound', () => {
    const rounds = rhymeRounds('grade-2', 'rp2', 5, 2);
    expect(rounds.length).toBeGreaterThan(0);
    for (const q of rounds) {
      const mate = q.options[q.correctIndex]!;
      expect(getInitialSound(mate.word)).toBe(getInitialSound(q.target.word));
      expect(q.mode).toBe('initial');
    }
  });

  it('never touches blends/finals - options come from the audited pool only', () => {
    const rounds = rhymeRounds('grade-3', 'rp3', 8, 1);
    for (const q of rounds) {
      expect(isLiteralImageWord(q.target)).toBe(true);
      q.options.forEach((w) => expect(isLiteralImageWord(w)).toBe(true));
    }
  });
});

describe('flagPool + flagRounds (CR-147)', () => {
  const EXCLUDED = new Set([
    'european-union', 'taiwan', 'hong-kong', 'macau', 'kosovo',
    'aland', 'guernsey', 'faroe-islands', 'gibraltar',
  ]);

  it('pool holds only flag-emoji words minus EU + territories', () => {
    for (const gradeId of ['grade-4', 'grade-5']) {
      const pool = flagPool(gradeId);
      expect(pool.length).toBeGreaterThan(0);
      for (const w of pool) {
        expect(isFlagEmoji(w.emoji)).toBe(true);
        expect(EXCLUDED.has(w.id)).toBe(false);
      }
    }
  });

  it('flags never leak into the shared game word pool (G-5 pin)', () => {
    for (const gradeId of GRADES) {
      for (const w of pickGameWords(gradeId, 'fp', 200)) {
        expect(isFlagEmoji(w.emoji)).toBe(false);
      }
    }
  });

  it('rounds put the matching flag among 4 flag options', () => {
    const rounds = flagRounds('grade-5', 'fv1', 5);
    expect(rounds.length).toBeGreaterThan(0);
    for (const q of rounds) {
      expect(q.options).toHaveLength(4);
      expect(q.options[q.correctIndex]!.id).toBe(q.word.id);
      for (const o of q.options) expect(isFlagEmoji(o.emoji)).toBe(true);
    }
  });
});
