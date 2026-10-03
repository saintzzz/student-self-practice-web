import { beforeEach, describe, expect, it } from 'vitest';
import {
  getReportSnapshot,
  recordSkillAnswer,
  recordSkillAnswers,
  resetForTests,
} from './store';

const DAY = new Date('2026-10-01T09:00:00');

beforeEach(() => resetForTests());

describe('parent-report stats', () => {
  it('AC-29.4: each recorded answer increments day + skill counters', () => {
    recordSkillAnswer('grade-4', 'grammar', true, DAY);
    recordSkillAnswer('grade-4', 'grammar', false, DAY);
    recordSkillAnswer('grade-4', 'spelling', true, DAY);
    const snap = getReportSnapshot(DAY);
    const today = snap.days.find((d) => d.dateISO === '2026-10-01')!;
    expect(today).toEqual({ dateISO: '2026-10-01', correct: 2, total: 3 });
    const grammar = snap.skills['grade-4'].find((s) => s.key === 'grammar')!;
    expect(grammar).toMatchObject({ correct: 1, total: 2 });
  });

  it('AC-29.1: snapshot lists the last 7 days, empty days included', () => {
    recordSkillAnswer('grade-4', 'grammar', true, DAY);
    const snap = getReportSnapshot(new Date('2026-10-07T09:00:00'));
    expect(snap.days).toHaveLength(7);
    expect(snap.days[0].dateISO).toBe('2026-10-01');
    expect(snap.days[snap.days.length - 1].dateISO).toBe('2026-10-07');
    expect(snap.days.filter((d) => d.total > 0)).toHaveLength(1);
  });

  it('AC-29.2: skills come back weakest-first with accuracy', () => {
    recordSkillAnswers('grade-4', 'grammar', 4, 10, DAY); // 40%
    recordSkillAnswers('grade-4', 'spelling', 9, 10, DAY); // 90%
    const snap = getReportSnapshot(DAY);
    const keys = snap.skills['grade-4'].map((s) => s.key);
    expect(keys).toEqual(['grammar', 'spelling']);
    expect(snap.skills['grade-4'][0].accuracy).toBeCloseTo(0.4);
  });

  it('AC-29.3: fresh device returns empty structures, not NaN', () => {
    const snap = getReportSnapshot(DAY);
    expect(snap.days).toHaveLength(7);
    expect(snap.days.every((d) => d.correct === 0 && d.total === 0)).toBe(true);
    expect(snap.skills).toEqual({});
  });

  it('AC-29.5: day history is capped at 30 entries', async () => {
    const { getState } = await import('./store');
    for (let i = 0; i < 35; i += 1) {
      const d = new Date(DAY.getTime() + i * 86_400_000);
      recordSkillAnswer('grade-4', 'grammar', true, d);
    }
    const keys = Object.keys(getState().stats?.days ?? {});
    expect(keys).toHaveLength(30);
    expect(keys).not.toContain('2026-10-01'); // oldest dropped
    expect(keys).toContain('2026-11-04'); // newest kept
  });

  it('recordSkillAnswers aggregates round totals', () => {
    recordSkillAnswers('grade-3', 'listening', 7, 10, DAY);
    const snap = getReportSnapshot(DAY);
    expect(snap.skills['grade-3'][0]).toMatchObject({ key: 'listening', correct: 7, total: 10 });
  });
});
