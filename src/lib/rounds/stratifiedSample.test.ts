import { describe, expect, it } from 'vitest';
import { stratifiedSample } from './stratifiedSample';

interface Item {
  id: string;
  topicId: string;
}

function makeTopicPool(topicCounts: Record<string, number>): Item[] {
  const items: Item[] = [];
  for (const [topicId, count] of Object.entries(topicCounts)) {
    for (let i = 0; i < count; i++) {
      items.push({ id: `${topicId}-${i}`, topicId });
    }
  }
  return items;
}

function countByTopic(items: readonly Item[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.topicId, (counts.get(item.topicId) ?? 0) + 1);
  }
  return counts;
}

describe('stratifiedSample', () => {
  it('spreads across most/all eligible topics instead of being dominated by one huge topic', () => {
    // 1 huge topic (50 items) + 5 small topics (3 items each) = 6 eligible topics.
    const pool = makeTopicPool({ huge: 50, a: 3, b: 3, c: 3, d: 3, e: 3 });

    const sample = stratifiedSample(pool, 10, 'lopsided-seed');
    const counts = countByTopic(sample);

    expect(sample).toHaveLength(10);
    // All 6 eligible topics must be represented (10 > 6, but round-robin
    // guarantees every topic gets its 1st item before any gets a 2nd).
    expect(counts.size).toBe(6);
    // The huge topic must not dominate: with 6 topics and 10 slots, the
    // fair share is ceil(10/6) = 2 - no topic should exceed that.
    expect(counts.get('huge')!).toBeLessThanOrEqual(2);
    for (const topicId of ['a', 'b', 'c', 'd', 'e']) {
      expect(counts.get(topicId)).toBeGreaterThanOrEqual(1);
    }
  });

  it('is deterministic for the same seed', () => {
    const pool = makeTopicPool({ huge: 50, a: 3, b: 3, c: 3, d: 3, e: 3 });

    const first = stratifiedSample(pool, 10, 'fixed-seed').map((item) => item.id);
    const second = stratifiedSample(pool, 10, 'fixed-seed').map((item) => item.id);

    expect(first).toEqual(second);
  });

  it('varies its selection across different seeds', () => {
    const pool = makeTopicPool({ huge: 50, a: 3, b: 3, c: 3, d: 3, e: 3 });

    const a = stratifiedSample(pool, 10, 'seed-a').map((item) => item.id);
    const b = stratifiedSample(pool, 10, 'seed-b').map((item) => item.id);

    expect(a).not.toEqual(b);
  });

  it('falls back to over-drawing only when there are genuinely fewer eligible topics than requested slots', () => {
    // Only 3 topics, each with plenty of items, target 10 questions.
    const pool = makeTopicPool({ a: 5, b: 5, c: 5 });

    const sample = stratifiedSample(pool, 10, 'few-topics-seed');
    const counts = countByTopic(sample);

    expect(sample).toHaveLength(10);
    expect(counts.size).toBe(3);
    // 10 spread across 3 topics as evenly as possible: 4/3/3 in some order.
    const values = [...counts.values()].sort((x, y) => x - y);
    expect(values).toEqual([3, 3, 4]);
  });

  it('returns an empty array for an empty pool', () => {
    expect(stratifiedSample<Item>([], 10, 'seed')).toEqual([]);
  });

  it('returns an empty array when count is 0 or negative', () => {
    const pool = makeTopicPool({ a: 5 });
    expect(stratifiedSample(pool, 0, 'seed')).toEqual([]);
    expect(stratifiedSample(pool, -1, 'seed')).toEqual([]);
  });

  it('returns the whole pool when the target count exceeds the pool size', () => {
    const pool = makeTopicPool({ a: 2, b: 2, c: 1 });

    const sample = stratifiedSample(pool, 100, 'seed');

    expect(sample).toHaveLength(pool.length);
    expect(new Set(sample.map((item) => item.id))).toEqual(new Set(pool.map((item) => item.id)));
  });

  it('supports a custom key-extraction function for pools without a topicId field', () => {
    interface CategorizedItem {
      id: string;
      category: string;
    }
    const pool: CategorizedItem[] = [
      { id: 'x1', category: 'x' },
      { id: 'x2', category: 'x' },
      { id: 'x3', category: 'x' },
      { id: 'y1', category: 'y' },
      { id: 'z1', category: 'z' },
    ];

    const sample = stratifiedSample(pool, 3, 'custom-key-seed', (item) => item.category);
    const categories = new Set(sample.map((item) => item.category));

    expect(sample).toHaveLength(3);
    expect(categories).toEqual(new Set(['x', 'y', 'z']));
  });

  it('never draws a 2nd item from a topic before every eligible topic has 1 (fairness invariant, checked across many seeds)', () => {
    const pool = makeTopicPool({ huge: 30, a: 2, b: 2, c: 2 });

    for (const seed of ['s1', 's2', 's3', 's4', 's5', 's6']) {
      const sample = stratifiedSample(pool, 5, seed);
      const counts = countByTopic(sample);
      // 5 slots, 4 topics: fair distribution is 1/1/1/2 - no topic besides
      // the single "2nd round" winner should ever reach 2 before all 4 have 1.
      expect(counts.size).toBe(4);
      const values = [...counts.values()].sort((x, y) => x - y);
      expect(values).toEqual([1, 1, 1, 2]);
    }
  });
});
