import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';

// r17 cross-tab-stale-session: once the app bound a real account uid,
// a session change delivered from another tab (switch or sign-out)
// must reload to a clean slate - this tab would otherwise keep
// displaying the old student while new requests authenticate as the
// new one.

type Session = { user: { id: string } };
const sessionRef = { current: { user: { id: 'user-a' } } as Session | null };
let authCb: ((session: Session | null) => void) | null = null;

vi.mock('./lib/supabase/client', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: vi.fn(),
}));

vi.mock('./lib/auth/practiceAuth', () => ({
  getSession: vi.fn(async () => sessionRef.current),
  fetchMyAccount: vi.fn(async () => ({
    id: 'user-a',
    role: 'student',
    display_name: 'An A',
    parent_email: null,
    parent_verified: false,
  })),
  fetchMyAllowedGrades: vi.fn(async () => ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5']),
  logout: vi.fn(async () => undefined),
  onAuthChange: vi.fn(async (cb: (s: Session | null) => void) => {
    authCb = cb;
    return { unsubscribe: () => undefined };
  }),
}));

const reloadSpy = vi.fn();
vi.mock('./lib/reload', () => ({ reloadPage: () => reloadSpy() }));

vi.mock('./lib/engagement/sync', () => ({
  bindEngagement: vi.fn(async () => undefined),
  flushEngagement: vi.fn(async () => true),
  unbindEngagement: vi.fn(),
}));

vi.mock('./lib/practiceResults', () => ({
  bindActivityOwner: vi.fn(async () => undefined),
}));

import App from './App';

afterEach(() => {
  reloadSpy.mockClear();
  authCb = null;
  sessionRef.current = { user: { id: 'user-a' } };
});

describe('App cross-tab auth change (r17)', () => {
  it('reloads when the session changes to a different account', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('grade-card-grade-1')).toBeVisible());
    expect(authCb).not.toBeNull();

    act(() => authCb!({ user: { id: 'user-b' } }));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('reloads when the session is dropped from another tab', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('grade-card-grade-1')).toBeVisible());

    act(() => authCb!(null));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores same-uid events (token refresh, re-validation)', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('grade-card-grade-1')).toBeVisible());

    act(() => authCb!({ user: { id: 'user-a' } }));
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
