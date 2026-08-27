import { describe, expect, it } from 'vitest';
import { TOPICS, getWordsByTopic } from '../../data/vocabulary';
import { buildTopicSession } from './buildTopicSession';

function kindsOf(topicId: string): Set<string> {
  return new Set(buildTopicSession(topicId).map((q) => q.kind));
}

describe('buildTopicSession (AC15)', () => {
  it('gives every countable topic all 4 kinds, including both counting-image directions', () => {
    for (const topic of TOPICS) {
      const words = getWordsByTopic(topic.id);
      const isCountable = words.some((w) => w.countable);
      if (!isCountable) continue;

      const session = buildTopicSession(topic.id);
      const kinds = new Set(session.map((q) => q.kind));

      expect(kinds).toEqual(
        new Set(['image-choice', 'listening-fill-blank', 'counting-image', 'extra-letter']),
      );

      const directions = new Set(
        session
          .filter((q) => q.kind === 'counting-image')
          .map((q) => (q.kind === 'counting-image' ? q.direction : null)),
      );
      expect(directions).toEqual(new Set(['count-to-image', 'image-to-count']));
    }
  });

  it('gives every non-countable topic exactly 3 kinds, never counting-image', () => {
    for (const topic of TOPICS) {
      const words = getWordsByTopic(topic.id);
      const isCountable = words.some((w) => w.countable);
      if (isCountable) continue;

      const kinds = kindsOf(topic.id);

      expect(kinds).toEqual(new Set(['image-choice', 'listening-fill-blank', 'extra-letter']));
    }
  });

  it('every topic produces a non-empty session', () => {
    for (const topic of TOPICS) {
      expect(buildTopicSession(topic.id).length).toBeGreaterThan(0);
    }
  });

  it('is deterministic across repeated calls for the same topic', () => {
    const first = buildTopicSession('g2-animals').map((q) => q.id);
    const second = buildTopicSession('g2-animals').map((q) => q.id);

    expect(first).toEqual(second);
  });
});
