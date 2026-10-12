import { describe, expect, it } from 'vitest';
import { isWordOrderCorrect } from './wordOrder';

// external-review r4: punctuation emitted as its own tile joins with a
// space ("home ."), and a bare strip left a trailing space so every
// correct answer scored wrong.
describe('isWordOrderCorrect', () => {
  it('accepts correct order when the final period is its own tile', () => {
    expect(isWordOrderCorrect('I go home.', ['I', 'go', 'home', '.'])).toBe(true);
  });

  it('accepts correct order when punctuation is glued to the last word', () => {
    expect(isWordOrderCorrect('I go home.', ['I', 'go', 'home.'])).toBe(true);
  });

  it('accepts correct order when the sentence has no punctuation', () => {
    expect(isWordOrderCorrect('I love father', ['I', 'love', 'father'])).toBe(true);
  });

  it('ignores case differences', () => {
    expect(isWordOrderCorrect('we eat mooncakes.', ['We', 'eat', 'mooncakes.'])).toBe(true);
  });

  it('accepts correct order with an internal comma tile (r5)', () => {
    expect(isWordOrderCorrect('Yesterday, I played.', ['Yesterday', ',', 'I', 'played', '.'])).toBe(true);
  });

  it('accepts correct order when the comma is glued to its word', () => {
    expect(isWordOrderCorrect('Yesterday, I played.', ['Yesterday,', 'I', 'played.'])).toBe(true);
  });

  it('rejects wrong order', () => {
    expect(isWordOrderCorrect('I go home.', ['go', 'I', 'home.'])).toBe(false);
  });

  it('rejects a different sentence sharing the same words', () => {
    expect(isWordOrderCorrect('She is my mother.', ['my', 'She', 'is', 'mother.'])).toBe(false);
  });
});
