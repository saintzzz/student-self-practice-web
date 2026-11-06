import { describe, expect, it } from 'vitest';
import { CUP_AWARD_TIERS, CUP_ROUNDS, cupAwardForPercent, cupRoundById } from './cupBlueprint';

describe('CUP_ROUNDS (CR-129/CR-130)', () => {
  it('has 3 rounds in escalating order', () => {
    expect(CUP_ROUNDS.map((r) => r.id)).toEqual(['dong', 'bac', 'vang']);
    const counts = CUP_ROUNDS.map((r) => r.sections.reduce((n, s) => n + s.count, 0));
    const times = CUP_ROUNDS.map((r) => r.timeSec);
    expect(counts[0]).toBeLessThan(counts[1]!);
    expect(counts[1]).toBeLessThan(counts[2]!);
    expect(times[0]).toBeLessThan(times[2]!);
  });

  it('every round keeps the 4-section competition shape', () => {
    for (const r of CUP_ROUNDS) {
      expect(r.sections).toHaveLength(4);
      expect(r.sections[0]!.skills).toEqual(['listening']);
      expect(r.sections[2]!.skills).toEqual(['reading']);
      expect(r.sections.every((s) => s.count > 0 && s.label.length > 0)).toBe(true);
    }
  });

  it('round escalation adds difficulty floors', () => {
    expect(cupRoundById('dong')?.minDifficulty).toBeUndefined();
    expect(cupRoundById('bac')?.minDifficulty).toBe(2);
    expect(cupRoundById('vang')?.minDifficulty).toBe(3);
  });

  it('award tiers descend and resolve by percent', () => {
    for (let i = 1; i < CUP_AWARD_TIERS.length; i++) {
      expect(CUP_AWARD_TIERS[i]!.min).toBeLessThan(CUP_AWARD_TIERS[i - 1]!.min);
    }
    expect(cupAwardForPercent(95)?.label).toBe('Giải Nhất');
    expect(cupAwardForPercent(80)?.label).toBe('Giải Nhì');
    expect(cupAwardForPercent(65)?.label).toBe('Giải Ba');
    expect(cupAwardForPercent(50)?.label).toBe('Khuyến khích');
    expect(cupAwardForPercent(20)).toBeUndefined();
  });

  it('cupRoundById ignores unknown ids', () => {
    expect(cupRoundById('bogus')).toBeUndefined();
    expect(cupRoundById(undefined)).toBeUndefined();
  });
});
