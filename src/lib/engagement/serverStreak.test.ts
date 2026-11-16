/**
 * CR-138: server-streak client contract - parsing, guest/error fallbacks,
 * milestone gating (day 3, then every 7; only the round that earned it).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock('../supabase/client', () => ({
  getSupabase: async () => ({ rpc }),
  isSupabaseConfigured: () => true,
}));
vi.mock('../auth/practiceAuth', () => ({
  getSession: getSessionMock,
}));

import { fetchServerStreak, isStreakMilestone, type ServerStreak } from './serverStreak';

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({
    data: { streak: 4, today_done: true, rounds_today: 1, goal_done: 7, goal_target: 5 },
    error: null,
  });
  getSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } });
});

describe('fetchServerStreak', () => {
  it('parses the RPC payload into camelCase fields', async () => {
    const s = await fetchServerStreak();
    expect(rpc).toHaveBeenCalledWith('streak_status');
    expect(s).toEqual({ streak: 4, todayDone: true, roundsToday: 1, goalDone: 7, goalTarget: 5 });
  });

  it('accepts a string payload (jsonb over text)', async () => {
    rpc.mockResolvedValue({ data: '{"streak":2,"today_done":false,"rounds_today":0,"goal_done":1,"goal_target":5}', error: null });
    const s = await fetchServerStreak();
    expect(s?.streak).toBe(2);
    expect(s?.todayDone).toBe(false);
  });

  it('returns null for guests without calling the RPC', async () => {
    getSessionMock.mockResolvedValue(null);
    expect(await fetchServerStreak()).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('returns null on RPC error and on throw', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'nope' } });
    expect(await fetchServerStreak()).toBeNull();
    rpc.mockRejectedValue(new Error('down'));
    expect(await fetchServerStreak()).toBeNull();
  });
});

describe('isStreakMilestone', () => {
  const at = (streak: number, roundsToday = 1): ServerStreak =>
    ({ streak, todayDone: true, roundsToday, goalDone: 0, goalTarget: 5 });

  it('fires on day 3, 7, and every 7th day', () => {
    for (const n of [3, 7, 14, 21]) expect(isStreakMilestone(at(n))).toBe(true);
    for (const n of [1, 2, 4, 5, 6, 8, 13, 15, 22]) expect(isStreakMilestone(at(n))).toBe(false);
  });

  it('fires only on the round that earned the day (rounds_today = 1)', () => {
    expect(isStreakMilestone(at(7, 1))).toBe(true);
    expect(isStreakMilestone(at(7, 2))).toBe(false);
    expect(isStreakMilestone(at(7, 0))).toBe(false);
  });

  it('is null-safe (guests render nothing)', () => {
    expect(isStreakMilestone(null)).toBe(false);
  });
});
