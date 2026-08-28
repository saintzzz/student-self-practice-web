import { describe, expect, it } from 'vitest';
import { ALL_WORDS, TOPICS, getWordsByTopic } from './index';

/**
 * Regression protection for a growing content set. As topics/words are added
 * by hand, these checks catch typos and copy-paste mistakes (missing emoji,
 * missing explanation, duplicate ids) that would otherwise silently corrupt
 * the generated question pool.
 */
describe('vocabulary bank (regression guard)', () => {
  it('gives every word a non-empty emoji', () => {
    for (const word of ALL_WORDS) {
      expect(word.emoji.trim().length, `word "${word.id}" has an empty emoji`).toBeGreaterThan(0);
    }
  });

  it('gives every word a non-empty Vietnamese explanation', () => {
    for (const word of ALL_WORDS) {
      expect(word.explanation.trim().length, `word "${word.id}" has an empty explanation`).toBeGreaterThan(0);
    }
  });

  it('gives every word a non-empty English word string', () => {
    for (const word of ALL_WORDS) {
      expect(word.word.trim().length, `word "${word.id}" has an empty word`).toBeGreaterThan(0);
    }
  });

  it('gives every countable word a plural form distinct from an empty string', () => {
    for (const word of ALL_WORDS) {
      if (!word.countable) continue;
      expect(word.plural?.trim().length ?? 0, `countable word "${word.id}" is missing a plural`).toBeGreaterThan(0);
    }
  });

  it('has no em-dash in any explanation (project-wide constraint)', () => {
    for (const word of ALL_WORDS) {
      expect(word.explanation, `word "${word.id}" explanation contains an em-dash`).not.toContain('—');
    }
  });

  it('has globally unique word ids across the whole bank', () => {
    const ids = ALL_WORDS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every topic at least 4 words (image-choice needs 3 distractors + the answer)', () => {
    for (const topic of TOPICS) {
      const words = getWordsByTopic(topic.id);
      expect(words.length, `topic "${topic.id}" has fewer than 4 words`).toBeGreaterThanOrEqual(4);
    }
  });

  it('has no duplicate word entries (same word text) within a single topic', () => {
    for (const topic of TOPICS) {
      const words = getWordsByTopic(topic.id).map((w) => w.word);
      expect(new Set(words).size, `topic "${topic.id}" has a duplicate word`).toBe(words.length);
    }
  });

  it('has no duplicate emoji within a single topic (image-choice options must be unambiguous)', () => {
    for (const topic of TOPICS) {
      const emojis = getWordsByTopic(topic.id).map((w) => w.emoji);
      expect(new Set(emojis).size, `topic "${topic.id}" has a duplicate emoji`).toBe(emojis.length);
    }
  });
});
