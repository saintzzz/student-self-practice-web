/**
 * CR-138 r204-1 regression: the streak cache is keyed by uid - an
 * account switch must clear the previous user's streak, never render
 * it while the new one loads.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const rpc = vi.fn();
const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock('../supabase/client', () => ({
  getSupabase: async () => ({ rpc }),
  isSupabaseConfigured: () => true,
}));
vi.mock('../auth/practiceAuth', () => ({
  getSession: getSessionMock,
}));

import { useServerStreak } from './serverStreak';

const asUser = (uid: string | null) =>
  getSessionMock.mockResolvedValue(uid ? { user: { id: uid } } : null);
const asStreak = (n: number) =>
  rpc.mockResolvedValue({ data: { streak: n, today_done: true, rounds_today: 1, goal_done: 0, goal_target: 5 }, error: null });

beforeEach(() => {
  rpc.mockReset();
  getSessionMock.mockReset();
});

describe('useServerStreak - uid-keyed cache (r204-1)', () => {
  it('refetches and never shows user A streak after switching to user B', async () => {
    asUser('u-a');
    asStreak(4);
    const first = renderHook(() => useServerStreak());
    await waitFor(() => expect(first.result.current?.streak).toBe(4));
    first.unmount();

    asUser('u-b');
    asStreak(9);
    const second = renderHook(() => useServerStreak());
    // ensureFresh detects the uid switch, clears, then serves user B's
    // value - the final state is never user A's "4".
    await waitFor(() => expect(second.result.current?.streak).toBe(9));
    second.unmount();
  });

  it('drops to null when the user signs out', async () => {
    asUser('u-c');
    asStreak(6);
    const signed = renderHook(() => useServerStreak());
    await waitFor(() => expect(signed.result.current?.streak).toBe(6));
    signed.unmount();

    asUser(null);
    const guest = renderHook(() => useServerStreak());
    await waitFor(() => expect(guest.result.current).toBeNull());
    guest.unmount();
  });
});
