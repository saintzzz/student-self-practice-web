import { beforeEach, describe, expect, it } from 'vitest';
import {
  BREAK_RESET_MINUTES,
  restReminderEnabled,
  setRestReminderEnabled,
  tickStretch,
} from './restReminder';

/* CR-148 (P2-6): pin the stretch math + the parent-toggle flag. */

beforeEach(() => localStorage.removeItem('ea-rest-reminder'));

describe('rest reminder toggle', () => {
  it('defaults ON - the nudge ships enabled, parents opt out', () => {
    expect(restReminderEnabled()).toBe(true);
  });

  it('honors the parent toggle', () => {
    setRestReminderEnabled(false);
    expect(restReminderEnabled()).toBe(false);
    setRestReminderEnabled(true);
    expect(restReminderEnabled()).toBe(true);
  });
});

describe('tickStretch', () => {
  it('accrues only while visible', () => {
    expect(tickStretch(0, 5_000, true, 0)).toBe(5_000);
    expect(tickStretch(5_000, 5_000, false, 60_000)).toBe(5_000);
  });

  it('a short hidden pause keeps the stretch - continuous play', () => {
    const underBreak = (BREAK_RESET_MINUTES - 1) * 60_000;
    expect(tickStretch(10 * 60_000, 5_000, false, underBreak)).toBe(10 * 60_000);
  });

  it('a real break (>= reset window) clears the stretch', () => {
    const breakMs = BREAK_RESET_MINUTES * 60_000;
    expect(tickStretch(25 * 60_000, 5_000, false, breakMs)).toBe(0);
  });
});
