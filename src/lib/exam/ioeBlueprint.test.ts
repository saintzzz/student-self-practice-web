import { describe, expect, it } from 'vitest';
import { IOE_AWARD_TIERS, IOE_ROUNDS, ioeAwardForPercent, ioeRoundById } from './ioeBlueprint';

describe('IOE_ROUNDS (CR-129)', () => {
  it('has 3 rounds in escalating order', () => {
    expect(IOE_ROUNDS.map((r) => r.id)).toEqual(['truong', 'huyen', 'tinh']);
    const counts = IOE_ROUNDS.map((r) => r.sections.reduce((n, s) => n + s.count, 0));
    const times = IOE_ROUNDS.map((r) => r.timeSec);
    expect(counts[0]).toBeLessThan(counts[1]!);
    expect(counts[1]).toBeLessThan(counts[2]!);
    expect(times[0]).toBeLessThan(times[2]!);
  });

  it('every round keeps the 4-section IOE shape', () => {
    for (const r of IOE_ROUNDS) {
      expect(r.sections).toHaveLength(4);
      expect(r.sections[0]!.skills).toEqual(['listening']);
      expect(r.sections[2]!.skills).toEqual(['reading']);
      expect(r.sections.every((s) => s.count > 0 && s.label.length > 0)).toBe(true);
    }
  });

  it('round escalation adds difficulty floors', () => {
    expect(ioeRoundById('truong')?.minDifficulty).toBeUndefined();
    expect(ioeRoundById('huyen')?.minDifficulty).toBe(2);
    expect(ioeRoundById('tinh')?.minDifficulty).toBe(3);
  });

  it('award tiers descend and resolve by percent', () => {
    for (let i = 1; i < IOE_AWARD_TIERS.length; i++) {
      expect(IOE_AWARD_TIERS[i]!.min).toBeLessThan(IOE_AWARD_TIERS[i - 1]!.min);
    }
    expect(ioeAwardForPercent(95)?.label).toBe('Giải Nhất');
    expect(ioeAwardForPercent(80)?.label).toBe('Giải Nhì');
    expect(ioeAwardForPercent(65)?.label).toBe('Giải Ba');
    expect(ioeAwardForPercent(50)?.label).toBe('Khuyến khích');
    expect(ioeAwardForPercent(20)).toBeUndefined();
  });

  it('ioeRoundById ignores unknown ids', () => {
    expect(ioeRoundById('bogus')).toBeUndefined();
    expect(ioeRoundById(undefined)).toBeUndefined();
  });
});
