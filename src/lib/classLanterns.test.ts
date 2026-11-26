import { describe, expect, it } from 'vitest';
import { isoWeekKey } from './classLanterns';

describe('isoWeekKey', () => {
  it('returns YYYY-Www ISO week keys', () => {
    // 2026-03-30 is a Monday in ISO week 14
    expect(isoWeekKey(new Date('2026-03-30T10:00:00'))).toBe('2026-W14');
    // Sunday still belongs to the same ISO week
    expect(isoWeekKey(new Date('2026-04-05T10:00:00'))).toBe('2026-W14');
    // next Monday rolls to W15
    expect(isoWeekKey(new Date('2026-04-06T10:00:00'))).toBe('2026-W15');
    // year boundary: 2025-12-29 (Mon) is ISO week 1 of 2026
    expect(isoWeekKey(new Date('2025-12-29T10:00:00'))).toBe('2026-W01');
  });
});
