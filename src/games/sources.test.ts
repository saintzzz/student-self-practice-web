import { describe, expect, it } from 'vitest';
import { isLiteralImageWord } from '../lib/content/imageSemantics';
import {
  imageChoiceRounds,
  listeningImageRounds,
  pickGameWords,
  spellableWords,
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
