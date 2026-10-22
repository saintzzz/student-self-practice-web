/**
 * wordId -> visual lookup built once from ALL_WORDS (ADR-5, BR-05). Photos
 * resolve ONLY through this module (AC-5.6); emoji-char assets resolve by
 * emoji key (emojiAssets.ts) without word identity.
 */
import type { VocabWord } from '../../types';
import { allWords } from '../content/contentBank';

export interface WordVisual {
  emoji: string;
  /** Same-origin path like '/images/vocab/{id}.webp', only present after human approval. */
  imageUrl?: string;
  /**
   * CR-82 (M6): the word itself - the tracing exhibit and "Nghe mẫu"
   * copy need the text, not only its visual.
   */
  word: string;
}

const BASE = import.meta.env.BASE_URL ?? '/';

function withBase(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  return BASE === '/' ? url : `${BASE}${url.replace(/^\//, '')}`;
}

/* CR-103: the bank arrives via ensureContentBank(), not a static import -
 * build the map on first read and only cache it once real words exist so
 * an early lookup can never freeze an empty table. */
let WORD_VISUALS: ReadonlyMap<string, WordVisual> | null = null;
const EMPTY_VISUALS: ReadonlyMap<string, WordVisual> = new Map();

function visuals(): ReadonlyMap<string, WordVisual> {
  if (WORD_VISUALS) return WORD_VISUALS;
  const words = allWords();
  if (words.length === 0) return EMPTY_VISUALS;
  WORD_VISUALS = new Map(
    words.map((w: VocabWord) => [w.id, { emoji: w.emoji, imageUrl: withBase(w.imageUrl), word: w.word }]),
  );
  return WORD_VISUALS;
}

/** Returns undefined for ids outside the bank (e.g. test fixtures). */
export function getWordVisual(wordId: string): WordVisual | undefined {
  return visuals().get(wordId);
}
