import type { VocabWord } from '../../types';
import { seededShuffleIndices } from '../prng';
import type { FlashReviewMap } from './reviewStore';

/**
 * CR-82 (spec s14.2 deck rules): pure deck building + session reducer for
 * the unscored flashcard mode. No points, no feedback sheet - ratings are
 * the only state (reviewStore persists them separately).
 */

export interface DeckCard {
  wordId: string;
  word: string;
  emoji: string;
  imageUrl?: string;
  ipa?: string;
  explanation: string;
}

export const DECK_MAX = 10;

/**
 * Builds one deck: "Ôn lại" entries first (most recently rated first),
 * then a seeded shuffle of the remaining eligible words. Eligible = has a
 * usable visual (emoji or an approved imageUrl) and a non-empty word.
 * `N = min(DECK_MAX, eligibleCount)`; `eligibleCount = 0` returns [].
 */
export function buildDeck(
  words: readonly VocabWord[],
  ratings: FlashReviewMap,
  seed: string,
): DeckCard[] {
  const eligible = words.filter(
    (w) => w.word.trim().length > 0 && (w.emoji.trim().length > 0 || !!w.imageUrl),
  );

  const toCard = (w: VocabWord): DeckCard => ({
    wordId: w.id,
    word: w.word,
    emoji: w.emoji,
    imageUrl: w.imageUrl,
    explanation: w.explanation,
  });

  const byId = new Map(eligible.map((w) => [w.id, w]));
  const againIds = [...ratings.entries()]
    .filter(([wordId, entry]) => entry.r === 'a' && byId.has(wordId))
    .sort((a, b) => b[1].t - a[1].t)
    .map(([wordId]) => wordId);

  const rest = eligible.filter((w) => !againIds.includes(w.id));
  const shuffledRest = seededShuffleIndices(rest.length, `${seed}-flash`).map((i) => rest[i]!);

  const ordered = [...againIds.map((id) => byId.get(id)!), ...shuffledRest];
  return ordered.slice(0, DECK_MAX).map(toCard);
}

/** Cards rated 'a' in the finished deck, in deck order (spec: "Ôn lại k
 *  thẻ" replays exactly those, counts reset). */
export function againCards(deck: readonly DeckCard[], rated: ReadonlyMap<string, DeckRating>): DeckCard[] {
  return deck.filter((card) => rated.get(card.wordId) === 'again');
}

export type DeckRating = 'known' | 'again';
export type DeckPhase = 'loading' | 'cards' | 'summary' | 'empty';
export type DeckExit = 'full' | 'partial' | 'zero' | null;

export interface DeckState {
  deck: DeckCard[];
  cursor: number;
  /** wordId -> rating, one entry per decided card. */
  rated: Map<string, DeckRating>;
  phase: DeckPhase;
  /** Set on phase 'summary': how the deck ended. */
  exit: DeckExit;
}

export const INITIAL_DECK_STATE: DeckState = {
  deck: [],
  cursor: 0,
  rated: new Map(),
  phase: 'loading',
  exit: null,
};

export type DeckAction =
  | { type: 'load'; deck: DeckCard[] }
  | { type: 'rate'; rating: DeckRating }
  | { type: 'endEarly' }
  | { type: 'resume' }
  | { type: 'retryAgain' }
  | { type: 'reset' };

function exitKind(rated: number, total: number): Exclude<DeckExit, null> {
  if (rated >= total) return 'full';
  return rated === 0 ? 'zero' : 'partial';
}

/** First unrated index (counting rules: an unrated card is never counted
 *  or saved; resume starts there). */
function firstUnrated(deck: readonly DeckCard[], rated: ReadonlyMap<string, DeckRating>): number {
  const idx = deck.findIndex((card) => !rated.has(card.wordId));
  return idx === -1 ? deck.length : idx;
}

export function deckReducer(state: DeckState, action: DeckAction): DeckState {
  switch (action.type) {
    case 'load': {
      return {
        deck: action.deck,
        cursor: 0,
        rated: new Map(),
        phase: action.deck.length === 0 ? 'empty' : 'cards',
        exit: null,
      };
    }
    case 'rate': {
      if (state.phase !== 'cards') return state;
      const card = state.deck[state.cursor];
      if (!card) return state;
      const rated = new Map(state.rated);
      rated.set(card.wordId, action.rating);
      const next = state.cursor + 1;
      if (next >= state.deck.length) {
        return { ...state, rated, cursor: next, phase: 'summary', exit: 'full' };
      }
      return { ...state, rated, cursor: next };
    }
    case 'endEarly': {
      if (state.phase !== 'cards') return state;
      /* The current card is unrated - never counted, never saved. */
      return {
        ...state,
        phase: 'summary',
        exit: exitKind(state.rated.size, state.deck.length),
      };
    }
    case 'resume': {
      if (state.phase !== 'summary' || (state.exit !== 'partial' && state.exit !== 'zero')) return state;
      return { ...state, phase: 'cards', exit: null, cursor: firstUnrated(state.deck, state.rated) };
    }
    case 'retryAgain': {
      if (state.phase !== 'summary') return state;
      const retry = againCards(state.deck, state.rated);
      if (retry.length === 0) return state;
      return {
        ...state,
        deck: retry,
        cursor: 0,
        rated: new Map(),
        phase: 'cards',
        exit: null,
      };
    }
    case 'reset': {
      return INITIAL_DECK_STATE;
    }
    default:
      return state;
  }
}

/** "Nhớ: k / Ôn lại: a" chip counts for the summary panels. */
export function ratingTally(rated: ReadonlyMap<string, DeckRating>): { known: number; again: number } {
  let known = 0;
  let again = 0;
  for (const rating of rated.values()) {
    if (rating === 'known') known += 1;
    else again += 1;
  }
  return { known, again };
}
