import type { VocabWord } from '../../types';

/**
 * CR-07 cross-grade shared vocabulary (PRD s17 R-G2). A word taught in an
 * earlier grade is THE SAME object when a later grade's topic lists it
 * again for review: one canonical id, one emoji, one explanation. Grade
 * pools dedupe by id (getWordsByGrade/ALL_WORDS), so the same object
 * appearing under two topic arrays is intentional, never a duplicate.
 *
 * Note the shared word's `topicId` still names its canonical (earliest)
 * topic - the field only feeds stratified topic-spreading, so a G3
 * question built from a shared word may carry a `g2-*`/`g1-*` topicId;
 * that is expected and harmless (topics are not displayed).
 */

/** Pick `ids` out of a topic's word array; throws on a typo'd id so authoring mistakes fail loudly in tests/dev. */
export function pick(words: readonly VocabWord[], ...ids: string[]): VocabWord[] {
  return ids.map((id) => {
    const found = words.find((w) => w.id === id);
    if (!found) {
      throw new Error(`shared.ts pick: word id "${id}" not found in source topic`);
    }
    return found;
  });
}
