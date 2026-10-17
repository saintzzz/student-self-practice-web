import { describe, expect, it } from 'vitest';
import { buildSpellTiles, spellEligibility } from './spellEligibility';

/**
 * CR-82 (DESIGN-SPEC-v5 s13.4) boundary matrix from the spec:
 * `book`/`school` repeated-letter instance ids; G1 6-letter -> 7 tiles;
 * G1 `rainbow` -> typed; G2 6-letter -> 8 tiles; G2 7-letter -> typed;
 * 8 letters -> typed; two-word/hyphen -> typed; confusable exclusion;
 * never-in-order shuffle.
 */
describe('spellEligibility', () => {
  it('admits 2-6 letter alphabet-only words for both grades', () => {
    for (const word of ['up', 'cat', 'school']) {
      expect(spellEligibility(word, 1).eligible).toBe(true);
      expect(spellEligibility(word, 2).eligible).toBe(true);
    }
  });

  it('grades differ only in distractor count (G1: 1, G2: 2)', () => {
    expect(spellEligibility('cat', 1)).toEqual({ eligible: true, distractorCount: 1 });
    expect(spellEligibility('cat', 2)).toEqual({ eligible: true, distractorCount: 2 });
  });

  it.each(['rainbow', 'elephant'])('rejects %s (7+ letters exceed the slot-row floor)', (word) => {
    expect(spellEligibility(word, 1).eligible).toBe(false);
    expect(spellEligibility(word, 2).eligible).toBe(false);
  });

  it.each(['ice cream', 'teddy bear'])('rejects two-word answer "%s"', (word) => {
    expect(spellEligibility(word, 1).eligible).toBe(false);
    expect(spellEligibility(word, 2).eligible).toBe(false);
  });

  it.each(['yo-yo', "o'clock", 'x-ray'])('rejects hyphenated/apostrophe answer "%s"', (word) => {
    expect(spellEligibility(word, 1).eligible).toBe(false);
    expect(spellEligibility(word, 2).eligible).toBe(false);
  });

  it('rejects single letters and empty words', () => {
    expect(spellEligibility('a', 1).eligible).toBe(false);
    expect(spellEligibility('', 2).eligible).toBe(false);
  });
});

describe('buildSpellTiles', () => {
  it('returns no tiles for an ineligible word', () => {
    expect(buildSpellTiles('rainbow', 1, 'q-1')).toEqual([]);
  });

  it('builds per-instance ids for repeated letters (book -> o-0/o-1)', () => {
    const tiles = buildSpellTiles('book', 1, 'q-book');
    const wordTiles = tiles.filter((t) => !t.id.includes('-d'));
    expect(wordTiles.map((t) => t.id).sort()).toEqual(['b-0', 'k-0', 'o-0', 'o-1']);
  });

  it('builds per-instance ids for school (two o tiles interchangeable)', () => {
    const tiles = buildSpellTiles('school', 2, 'q-school');
    const oTiles = tiles.filter((t) => t.letter === 'o');
    expect(oTiles.map((t) => t.id).sort()).toEqual(['o-0', 'o-1']);
  });

  it('G1 6-letter word -> 7 tiles (word + 1 distractor)', () => {
    const tiles = buildSpellTiles('school', 1, 'q-school');
    expect(tiles).toHaveLength(7);
    expect(tiles.filter((t) => t.id.includes('-d'))).toHaveLength(1);
  });

  it('G2 6-letter word -> 8 tiles (word + 2 distractors)', () => {
    const tiles = buildSpellTiles('school', 2, 'q-school');
    expect(tiles).toHaveLength(8);
    expect(tiles.filter((t) => t.id.includes('-d'))).toHaveLength(2);
  });

  it('distractors are letters not present in the word', () => {
    const tiles = buildSpellTiles('cat', 2, 'q-cat');
    const distractors = tiles.filter((t) => t.id.includes('-d'));
    for (const d of distractors) {
      expect('cat').not.toContain(d.letter);
    }
  });

  it.each([
    ['bid', 'd'], // word has b -> d is confusable
    ['dip', 'q'], // word has p -> q is confusable
    ['mom', 'n'], // word has m -> n is confusable
    ['lid', 'l'], // word has i -> l is confusable
  ])('excludes the confusable partner: %s never gets distractor %s', (word, confusable) => {
    for (let seed = 0; seed < 12; seed += 1) {
      const tiles = buildSpellTiles(word, 2, `q-${word}-${seed}`);
      const distractors = tiles.filter((t) => t.id.includes('-d'));
      expect(distractors.map((t) => t.letter)).not.toContain(confusable);
    }
  });

  it('never presents the word already spelled in order', () => {
    for (const word of ['up', 'cat', 'book', 'school', 'milk']) {
      for (const grade of [1, 2] as const) {
        for (let i = 0; i < 15; i += 1) {
          const tiles = buildSpellTiles(word, grade, `q-${word}-${i}`);
          expect(tiles.map((t) => t.letter).join('')).not.toBe(word);
        }
      }
    }
  });

  it('is deterministic per seed (question id)', () => {
    const a = buildSpellTiles('book', 1, 'q-stable');
    const b = buildSpellTiles('book', 1, 'q-stable');
    expect(a.map((t) => t.id)).toEqual(b.map((t) => t.id));
  });

  it('contains every word letter exactly once', () => {
    for (const word of ['book', 'school', 'cat']) {
      const tiles = buildSpellTiles(word, 2, 'q-letters');
      const bank = [...tiles.map((t) => t.letter)].sort();
      const expected = [...word].sort();
      const distractors = tiles.filter((t) => t.id.includes('-d')).map((t) => t.letter);
      expect(bank).toEqual([...expected, ...distractors].sort());
    }
  });
});
