import { describe, expect, it } from 'vitest';
import { COMPLETION_THRESHOLD_RATIO, getScoreStatus } from './scoreStatus';

describe('getScoreStatus (plan.md v10 "Points Scoring", AC37)', () => {
  it('marks complete at exactly the 75% threshold', () => {
    const status = getScoreStatus(75, 100);

    expect(status.isComplete).toBe(true);
  });

  it('marks complete above the threshold', () => {
    expect(getScoreStatus(100, 100).isComplete).toBe(true);
  });

  it('marks incomplete just below the threshold, with an encouraging (never "failed"/"incomplete") label', () => {
    const status = getScoreStatus(74, 100);

    expect(status.isComplete).toBe(false);
    expect(status.label).not.toMatch(/thất bại|incomplete|failed|chưa hoàn thành/i);
  });

  it('treats a maxPoints of 0 (e.g. a Round that timed out unanswered) as below-threshold, not a crash', () => {
    const status = getScoreStatus(0, 0);

    expect(status.isComplete).toBe(false);
  });

  it('the exported threshold constant matches IOE\'s 75% convention', () => {
    expect(COMPLETION_THRESHOLD_RATIO).toBe(0.75);
  });
});
