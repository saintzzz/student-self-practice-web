import { describe, expect, it } from 'vitest';
import { TOPICS } from './vocabulary';
import { getPoolCounts } from './pool';

describe('getPoolCounts (AC16 - the honest generated-instance count)', () => {
  it('reports a positive count for every kind and a matching total', () => {
    const counts = getPoolCounts();

    expect(counts.imageChoice).toBeGreaterThan(0);
    expect(counts.listeningFillBlank).toBeGreaterThan(0);
    expect(counts.countingImage).toBeGreaterThan(0);
    expect(counts.extraLetter).toBeGreaterThan(0);
    expect(counts.total).toBe(
      counts.imageChoice + counts.listeningFillBlank + counts.countingImage + counts.extraLetter,
    );
    // Regression guard on pool scale (see plans/reports/engineer-260827-student-self-practice-v3.md
    // for the exact real count and how it is computed) - not a hardcoded "10000" claim.
    expect(counts.total).toBeGreaterThan(1000);
  });

  it('has at least 10 distinct topics (AC11)', () => {
    expect(TOPICS.length).toBeGreaterThanOrEqual(10);
  });

  it('has no duplicate topic ids or names', () => {
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length);
    expect(new Set(TOPICS.map((t) => t.name)).size).toBe(TOPICS.length);
  });
});
