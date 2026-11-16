/**
 * CR-138 r204-1 regression: the streak cache is keyed by uid - an
 * account switch must clear the previous user's streak, never render
 * it while the new one loads.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const rpc = vi.fn();
const { getSessionMock, getSupabaseMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  getSupabaseMock: vi.fn(),
}));
vi.mock('../supabase/client', () => ({
  getSupabase: getSupabaseMock,
  isSupabaseConfigured: () => true,
}));
vi.mock('../auth/practiceAuth', () => ({
  getSession: getSessionMock,
}));

import { useServerStreak } from './serverStreak';

const asUser = (uid: string | null) =>
  getSessionMock.mockResolvedValue(uid ? { user: { id: uid } } : null);
const asStreak = (uid: string, n: number) =>
  rpc.mockResolvedValue({ data: { uid, streak: n, today_done: true, rounds_today: 1, goal_done: 0, goal_target: 5 }, error: null });

beforeEach(() => {
  rpc.mockReset();
  getSessionMock.mockReset();
  getSupabaseMock.mockReset();
  getSupabaseMock.mockResolvedValue({ rpc });
});

describe('useServerStreak - uid-keyed cache (r204-1)', () => {
  it('refetches and never shows user A streak after switching to user B', async () => {
    asUser('u-a');
    asStreak('u-a', 4);
    const first = renderHook(() => useServerStreak());
    await waitFor(() => expect(first.result.current?.streak).toBe(4));
    first.unmount();

    asUser('u-b');
    asStreak('u-b', 9);
    const second = renderHook(() => useServerStreak());
    // ensureFresh detects the uid switch, clears, then serves user B's
    // value - the final state is never user A's "4".
    await waitFor(() => expect(second.result.current?.streak).toBe(9));
    second.unmount();
  });

  it('drops to null when the user signs out', async () => {
    asUser('u-c');
    asStreak('u-c', 6);
    const signed = renderHook(() => useServerStreak());
    await waitFor(() => expect(signed.result.current?.streak).toBe(6));
    signed.unmount();

    asUser(null);
    const guest = renderHook(() => useServerStreak());
    await waitFor(() => expect(guest.result.current).toBeNull());
    guest.unmount();
  });

  it('r207-1: aborts the fetch when the session uid changes mid-flight', async () => {
    // ensureFresh captures u-a, then the account switches before the
    // inner session re-check - the rpc must not even fire for u-b's data.
    getSessionMock
      .mockResolvedValueOnce({ user: { id: 'u-a' } })
      .mockResolvedValue({ user: { id: 'u-b' } });
    asStreak('u-b', 9);
    const h = renderHook(() => useServerStreak());
    await waitFor(() => expect(getSessionMock.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(rpc).not.toHaveBeenCalled();
    expect(h.result.current).toBeNull();
    h.unmount();
  });

  it('r208-1: rechecks uid after getSupabase resolves - a switch during that await aborts', async () => {
    // Session stays u-x through ensureFresh's capture AND any pre-client
    // session read; hold every getSupabase call on a shared gate, flip
    // to u-y, then release. Under the old order (uid check before
    // getSupabase) the rpc would still fire - now it must not. Fresh
    // uids keep this independent of earlier tests' module cache.
    getSessionMock.mockResolvedValue({ user: { id: 'u-x' } });
    let release: (() => void) | undefined;
    const gate = new Promise<void>((res) => { release = res; });
    getSupabaseMock.mockImplementation(async () => { await gate; return { rpc }; });
    asStreak('u-y', 9);
    const h = renderHook(() => useServerStreak());
    await waitFor(() => expect(getSessionMock).toHaveBeenCalledTimes(1));
    getSessionMock.mockResolvedValue({ user: { id: 'u-y' } });
    release?.();
    await waitFor(() => expect(getSessionMock.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(rpc).not.toHaveBeenCalled();
    expect(h.result.current).toBeNull();
    h.unmount();
  });

  it('r209-1: discards an rpc payload the server ran under a different uid', async () => {
    // Both session reads agree on u-z, but the response echoes u-y -
    // credentials swapped inside the rpc; the payload must be dropped.
    getSessionMock.mockResolvedValue({ user: { id: 'u-z' } });
    let finish!: () => void;
    rpc.mockImplementation(async () => {
      await new Promise<void>((r) => { finish = r; });
      return { data: { uid: 'u-y', streak: 9, today_done: true, rounds_today: 1, goal_done: 0, goal_target: 5 }, error: null };
    });
    const h = renderHook(() => useServerStreak());
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    await act(async () => finish());
    expect(h.result.current).toBeNull();
    h.unmount();
  });
});
