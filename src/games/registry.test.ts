import { describe, expect, it } from 'vitest';
import { GAME_DEFS } from './defs';
import { GAME_COMPONENTS, GAME_MECHANICS } from './registry';
import { imageChoiceRounds, listeningImageRounds, spellableWords } from './sources';

const GRADES = ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5'];

describe('game catalog integrity', () => {
  it('every GAME_DEFS id has a mounted component and vice versa', () => {
    expect(GAME_DEFS.map((d) => d.id).sort()).toEqual(
      Object.keys(GAME_COMPONENTS).sort(),
    );
  });

  it('defs carry shelf copy (title/tagline/emoji) for every game', () => {
    for (const def of GAME_DEFS) {
      expect(def.title.length).toBeGreaterThan(0);
      expect(def.tagline.length).toBeGreaterThan(0);
      expect(def.emoji.length).toBeGreaterThan(0);
    }
  });
});

describe('mechanics reuse contract (CR-83: game steps render in practice/exam)', () => {
  it('every round kind produced by game sources is covered by a mechanic', () => {
    const covered = new Set(
      Object.values(GAME_MECHANICS).flatMap((m) => m.kinds),
    );
    for (const gradeId of GRADES) {
      for (const q of imageChoiceRounds(gradeId, 'cov', 6)) {
        expect(covered.has(q.kind)).toBe(true);
      }
      for (const q of listeningImageRounds(gradeId, 'cov', 6)) {
        expect(covered.has(q.kind)).toBe(true);
      }
    }
    // Letter Catch consumes raw VocabWord spelling - no question kind to map.
    expect(spellableWords('grade-2', 'cov', 5).length).toBeGreaterThan(0);
  });

  it('every mechanic declares a Step component and at least one kind', () => {
    for (const [id, m] of Object.entries(GAME_MECHANICS)) {
      expect(m.id).toBe(id);
      expect(m.kinds.length).toBeGreaterThan(0);
      expect(typeof m.Step).toBe('function');
    }
  });

  it('no kind is double-mapped across mechanics', () => {
    const all = Object.values(GAME_MECHANICS).flatMap((m) => m.kinds);
    expect(new Set(all).size).toBe(all.length);
  });
});
