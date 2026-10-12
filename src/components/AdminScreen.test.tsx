/**
 * r15 - async-response-staleness: a refresh started before a
 * mutation-triggered refresh must never overwrite the newer state.
 * Deterministic: fetchAllRows is deferred per call; refresh B resolves
 * first, then the stale refresh A - only B's rows may be visible.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { PracticeAccount } from '../lib/auth/practiceAuth';

type FetchResult = { rows: unknown[]; error: null; truncated: boolean };
const deferreds: Array<{ resolve: (v: FetchResult) => void }> = [];
function defer(): Promise<FetchResult> {
  let resolve!: (v: FetchResult) => void;
  const p = new Promise<FetchResult>((r) => { resolve = r; });
  deferreds.push({ resolve });
  return p;
}

vi.mock('../lib/supabase/fetch-all', () => ({ fetchAllRows: vi.fn(() => defer()) }));
vi.mock('../lib/practiceResults', () => ({ fetchRecentResults: vi.fn(async () => []) }));
vi.mock('./ReviewQueueCard', () => ({ default: () => null }));
const invoke = vi.fn(async () => ({ data: {}, error: null }));
vi.mock('../lib/supabase/client', () => ({
  getSupabase: async () => ({ functions: { invoke } }),
  isSupabaseConfigured: () => true,
}));

import AdminScreen from './AdminScreen';

const ADMIN: PracticeAccount = { id: 'adm', username: 'admin', display_name: 'Admin', role: 'admin' };
const ok = (rows: unknown[] = []): FetchResult => ({ rows, error: null, truncated: false });
// refresh order: accounts, classes, enrollments, class_grade_scopes
const settle = async (i: number, v: FetchResult) => deferreds[i]!.resolve(v);

beforeEach(() => {
  deferreds.length = 0;
  invoke.mockClear();
});

describe('AdminScreen refresh epoch guard (r15)', () => {
  it('a stale refresh never overwrites a mutation-triggered one', async () => {
    await act(async () => {
      render(<AdminScreen account={ADMIN} onSignOut={() => {}} />);
      await Promise.resolve();
    });
    // Mount fired refresh A: 4 deferred fetchAllRows calls.
    expect(deferreds).toHaveLength(4);

    // Create-account triggers refresh B after the invoke resolves.
    await act(async () => {
      fireEvent.submit(screen.getByTestId('account-create-form'));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(deferreds).toHaveLength(8);

    // Resolve refresh B first - the newer state wins the view.
    const fresh: PracticeAccount = { id: 'u2', username: 'newkid', display_name: 'New Kid', role: 'student' };
    await act(async () => {
      await settle(4, ok([fresh]));
      await settle(5, ok());
      await settle(6, ok());
      await settle(7, ok());
    });
    expect(screen.getByTestId('account-row-newkid')).toBeTruthy();

    // The stale refresh A resolves last - it must be discarded.
    const stale: PracticeAccount = { id: 'u1', username: 'oldkid', display_name: 'Old Kid', role: 'student' };
    await act(async () => {
      await settle(0, ok([stale]));
      await settle(1, ok());
      await settle(2, ok());
      await settle(3, ok());
    });
    expect(screen.queryByTestId('account-row-oldkid')).toBeNull();
    expect(screen.getByTestId('account-row-newkid')).toBeTruthy();
  });
});
