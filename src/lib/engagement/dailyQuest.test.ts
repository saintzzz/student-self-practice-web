import { beforeEach, describe, expect, it } from 'vitest';
import {
  claimDailyBonus,
  getDailyQuests,
  getState,
  recordBigModeComplete,
  recordCorrectAnswers,
  recordDrillComplete,
  resetForTests,
  todayISO,
} from './store';

const DAY = new Date('2026-10-01T09:00:00');
const NEXT_DAY = new Date('2026-10-02T09:00:00');

beforeEach(() => resetForTests());

describe('daily quest state', () => {
  it('AC-27.1: fresh device shows 3 quests at 0 progress', () => {
    const q = getDailyQuests(DAY);
    expect(q.quests).toHaveLength(3);
    expect(q.quests.every((item) => !item.done && item.progress === 0)).toBe(true);
    expect(q.allDone).toBe(false);
    expect(q.bonusClaimed).toBe(false);
    expect(q.dateISO).toBe(todayISO(DAY));
  });

  it('AC-27.2: completing a drill marks the drill quest done', () => {
    recordDrillComplete(DAY);
    const q = getDailyQuests(DAY);
    const drill = q.quests.find((item) => item.id === 'drill')!;
    expect(drill.done).toBe(true);
    expect(q.quests.filter((item) => item.done)).toHaveLength(1);
  });

  it('AC-27.3: correct answers accumulate toward the 10-answer quest', () => {
    recordCorrectAnswers(4, DAY);
    recordCorrectAnswers(6, DAY);
    const q = getDailyQuests(DAY);
    const correct = q.quests.find((item) => item.id === 'correct')!;
    expect(correct.done).toBe(true);
    expect(correct.progress).toBe(10);
    expect(correct.target).toBe(10);
  });

  it('correct-answer progress clamps at target', () => {
    recordCorrectAnswers(99, DAY);
    const correct = getDailyQuests(DAY).quests.find((item) => item.id === 'correct')!;
    expect(correct.progress).toBe(10);
  });

  it('AC-27.3: exam counts as big mode, not drill', () => {
    recordBigModeComplete(DAY);
    const q = getDailyQuests(DAY);
    expect(q.quests.find((item) => item.id === 'big')!.done).toBe(true);
    expect(q.quests.find((item) => item.id === 'drill')!.done).toBe(false);
  });

  it('AC-27.4: quests reset on a new calendar day', () => {
    recordDrillComplete(DAY);
    recordCorrectAnswers(10, DAY);
    recordBigModeComplete(DAY);
    claimDailyBonus(DAY);
    const q = getDailyQuests(NEXT_DAY);
    expect(q.quests.every((item) => !item.done && item.progress === 0)).toBe(true);
    expect(q.bonusClaimed).toBe(false);
    expect(q.dateISO).toBe(todayISO(NEXT_DAY));
  });

  it('AC-27.5: claiming the bonus grants 3 stars exactly once', () => {
    recordDrillComplete(DAY);
    recordCorrectAnswers(10, DAY);
    recordBigModeComplete(DAY);
    const first = claimDailyBonus(DAY);
    const second = claimDailyBonus(DAY);
    expect(first).toEqual({ granted: true, stars: 3 });
    expect(second.granted).toBe(false);
    expect(getState().totalStars).toBe(3);
  });

  it('bonus cannot be claimed before all quests are done', () => {
    recordDrillComplete(DAY);
    expect(claimDailyBonus(DAY).granted).toBe(false);
    expect(getState().totalStars).toBe(0);
  });

  it('AC-27.6: claiming the bonus records the day streak', () => {
    recordDrillComplete(DAY);
    recordCorrectAnswers(10, DAY);
    recordBigModeComplete(DAY);
    claimDailyBonus(DAY);
    expect(getState().streak).toEqual({ lastDayISO: todayISO(DAY), count: 1 });
  });

  it('AC-27.7: guest mode works on localStorage-only state', () => {
    // store has no Supabase dependency - full flow without a session
    recordDrillComplete(DAY);
    recordCorrectAnswers(10, DAY);
    recordBigModeComplete(DAY);
    expect(getDailyQuests(DAY).allDone).toBe(true);
    expect(claimDailyBonus(DAY).granted).toBe(true);
  });
});
