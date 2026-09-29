/**
 * wordId -> visual lookup built once from ALL_WORDS (ADR-5, BR-05). Photos
 * resolve ONLY through this module (AC-5.6); emoji-char assets resolve by
 * emoji key (emojiAssets.ts) without word identity.
 */
import type { VocabWord } from '../../types';
import { ALL_WORDS } from '../../data/vocabulary';

export interface WordVisual {
  emoji: string;
  /** Same-origin path like '/images/vocab/{id}.webp', only present after human approval. */
  imageUrl?: string;
}

const BASE = import.meta.env.BASE_URL ?? '/';

function withBase(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  return BASE === '/' ? url : `${BASE}${url.replace(/^\//, '')}`;
}

const WORD_VISUALS: ReadonlyMap<string, WordVisual> = new Map(
  ALL_WORDS.map((w: VocabWord) => [w.id, { emoji: w.emoji, imageUrl: withBase(w.imageUrl) }]),
);

/** Returns undefined for ids outside the bank (e.g. test fixtures). */
export function getWordVisual(wordId: string): WordVisual | undefined {
  return WORD_VISUALS.get(wordId);
}
