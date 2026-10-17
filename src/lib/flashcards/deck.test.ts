import { describe, expect, it } from 'vitest';
import type { VocabWord } from '../../types';
import {
  againCards,
  buildDeck,
  deckReducer,
  DECK_MAX,
  INITIAL_DECK_STATE,
  ratingTally,
  type DeckCard,
  type DeckState,
} from './deck';

/**
 * CR-82 (spec s14.2): deck building rules (again-first ordering, seeded
 * shuffle, eligibility, DECK_MAX) and the session reducer (rate /
 * endEarly exit kinds / resume to first unrated / retryAgain).
 */

function word(id: string, overrides: Partial<VocabWord> = {}): VocabWord {
  return {
    id,
    topicId: 'topic-a',
    word: id,
    emoji: 'x',
    explanation: `nghia ${id}`,
    countable: false,
    ...overrides,
  };
}

function card(id: string): DeckCard {
  return { wordId: id, word: id, emoji: 'x', explanation: `nghia ${id}` };
}

function cardsState(ids: string[]): DeckState {
  return deckReducer(INITIAL_DECK_STATE, {
    type: 'load',
    deck: ids.map(card),
  });
}

describe('buildDeck', () => {
  const words = Array.from({ length: 20 }, (_, i) => word(`w${i}`));

  it('caps the deck at DECK_MAX', () => {
    expect(buildDeck(words, new Map(), 's').length).toBe(DECK_MAX);
  });

  it('returns every eligible word when the pool is smaller than DECK_MAX', () => {
    const small = [word('a'), word('b'), word('c')];
    const deck = buildDeck(small, new Map(), 's');
    expect(deck).toHaveLength(3);
    expect(new Set(deck.map((c) => c.wordId))).toEqual(new Set(['a', 'b', 'c']));
  });

  it('returns [] when no word is eligible', () => {
    const bad = [word('blank', { emoji: '', word: '  ' }), word('novis', { emoji: ' ' })];
    expect(buildDeck(bad, new Map(), 's')).toEqual([]);
  });

  it('puts "again" entries first, most recently rated first', () => {
    const ratings = new Map([
      ['w3', { r: 'a' as const, t: 100 }],
      ['w7', { r: 'a' as const, t: 300 }],
      ['w1', { r: 'k' as const, t: 200 }],
    ]);
    const deck = buildDeck(words, ratings, 's');
    expect(deck[0]!.wordId).toBe('w7');
    expect(deck[1]!.wordId).toBe('w3');
  });

  it('is deterministic for the same seed and differs across seeds', () => {
    const a1 = buildDeck(words, new Map(), 'seed-a').map((c) => c.wordId);
    const a2 = buildDeck(words, new Map(), 'seed-a').map((c) => c.wordId);
    const b = buildDeck(words, new Map(), 'seed-b').map((c) => c.wordId);
    expect(a1).toEqual(a2);
    /* The deck is the first DECK_MAX of a seeded shuffle - a different
       seed changes the selection and/or order. */
    expect(b).not.toEqual(a1);
  });
});

describe('deckReducer', () => {
  it('load with an empty deck enters the empty phase', () => {
    const s = deckReducer(INITIAL_DECK_STATE, { type: 'load', deck: [] });
    expect(s.phase).toBe('empty');
  });

  it('rate advances the cursor and records the rating', () => {
    const s = deckReducer(cardsState(['a', 'b']), { type: 'rate', rating: 'known' });
    expect(s.phase).toBe('cards');
    expect(s.cursor).toBe(1);
    expect(s.rated.get('a')).toBe('known');
  });

  it('rating the last card ends the deck with exit full', () => {
    let s = cardsState(['a', 'b']);
    s = deckReducer(s, { type: 'rate', rating: 'known' });
    s = deckReducer(s, { type: 'rate', rating: 'again' });
    expect(s.phase).toBe('summary');
    expect(s.exit).toBe('full');
  });

  it('endEarly with zero ratings is exit zero', () => {
    const s = deckReducer(cardsState(['a', 'b']), { type: 'endEarly' });
    expect(s.exit).toBe('zero');
  });

  it('endEarly with some ratings is exit partial; the unrated current card is not counted', () => {
    let s = cardsState(['a', 'b', 'c']);
    s = deckReducer(s, { type: 'rate', rating: 'known' });
    s = deckReducer(s, { type: 'endEarly' });
    expect(s.exit).toBe('partial');
    expect(s.rated.size).toBe(1);
    expect(s.rated.has('b')).toBe(false);
  });

  it('resume from partial returns to the first unrated card', () => {
    let s = cardsState(['a', 'b', 'c']);
    s = deckReducer(s, { type: 'rate', rating: 'known' });
    s = deckReducer(s, { type: 'endEarly' });
    s = deckReducer(s, { type: 'resume' });
    expect(s.phase).toBe('cards');
    expect(s.cursor).toBe(1);
  });

  it('resume from a zero-rating exit also returns to the first unrated card', () => {
    let s = cardsState(['a', 'b']);
    s = deckReducer(s, { type: 'endEarly' });
    s = deckReducer(s, { type: 'resume' });
    expect(s.phase).toBe('cards');
    expect(s.cursor).toBe(0);
  });

  it('resume is a no-op after a full exit', () => {
    let s = cardsState(['a']);
    s = deckReducer(s, { type: 'rate', rating: 'known' });
    const after = deckReducer(s, { type: 'resume' });
    expect(after).toBe(s);
  });

  it('retryAgain replays only the again-rated cards with counts reset', () => {
    let s = cardsState(['a', 'b', 'c']);
    s = deckReducer(s, { type: 'rate', rating: 'again' });
    s = deckReducer(s, { type: 'rate', rating: 'known' });
    s = deckReducer(s, { type: 'rate', rating: 'again' });
    expect(s.exit).toBe('full');

    s = deckReducer(s, { type: 'retryAgain' });
    expect(s.phase).toBe('cards');
    expect(s.cursor).toBe(0);
    expect(s.rated.size).toBe(0);
    expect(s.deck.map((c) => c.wordId)).toEqual(['a', 'c']);
  });

  it('retryAgain is a no-op when nothing was rated again', () => {
    let s = cardsState(['a']);
    s = deckReducer(s, { type: 'rate', rating: 'known' });
    const after = deckReducer(s, { type: 'retryAgain' });
    expect(after).toBe(s);
  });

  it('rate is ignored outside the cards phase', () => {
    const s = deckReducer(cardsState(['a']), { type: 'endEarly' });
    const after = deckReducer(s, { type: 'rate', rating: 'known' });
    expect(after).toBe(s);
  });
});

describe('againCards + ratingTally', () => {
  it('againCards keeps deck order', () => {
    const deck = [card('a'), card('b'), card('c')];
    const rated = new Map([
      ['c', 'again' as const],
      ['a', 'again' as const],
      ['b', 'known' as const],
    ]);
    expect(againCards(deck, rated).map((c) => c.wordId)).toEqual(['a', 'c']);
  });

  it('ratingTally counts both kinds', () => {
    const rated = new Map([
      ['a', 'known' as const],
      ['b', 'again' as const],
      ['c', 'again' as const],
    ]);
    expect(ratingTally(rated)).toEqual({ known: 1, again: 2 });
  });
});
