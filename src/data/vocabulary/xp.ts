import type { VocabWord } from '../../types';

/**
 * CR-15 expansion-pack authoring helper. Each tuple is
 * [id, word, pluralOrNull, emoji, vnNoun, countable] and expands to a
 * VocabWord with the standard explanation pattern, keeping authored data
 * one line per word.
 *
 * id is passed through unchanged (words keep their canonical ids so
 * dupes fail loudly in the tests that scan ALL_WORDS).
 */
type Tuple = readonly [id: string, word: string, plural: string | null, emoji: string, vnNoun: string, countable: boolean];

export function xp(topicId: string, rows: Tuple[]): VocabWord[] {
  return rows.map(([id, word, plural, emoji, vnNoun, countable]) => ({
    id,
    topicId,
    word,
    ...(plural ? { plural } : {}),
    emoji,
    explanation: `${vnNoun} tiếng Anh là "${word}".`,
    countable,
  }));
}
