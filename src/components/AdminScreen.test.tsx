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

// CR-98 r6: assignments lib mocked with per-class deferred lists.
type ListRes = { rows: Array<Record<string, unknown>>; error: string | null };
const listDeferreds: Record<string, Array<{ resolve: (v: ListRes) => void }>> = {};
const deferList = (cid: string): Promise<ListRes> => {
  let resolve!: (v: ListRes) => void;
  const p = new Promise<ListRes>((r) => { resolve = r; });
  (listDeferreds[cid] ??= []).push({ resolve });
  return p;
};
const closeDeferreds: Array<{ resolve: (v: { ok: boolean }) => void }> = [];
vi.mock('../lib/assignments', () => ({
  assignmentList: vi.fn((cid: string) => deferList(cid)),
  assignmentClose: vi.fn(() => {
    let resolve!: (v: { ok: boolean }) => void;
    const p = new Promise<{ ok: boolean }>((r) => { resolve = r; });
    closeDeferreds.push({ resolve });
    return p;
  }),
  assignmentCreate: vi.fn(async () => ({ id: 'new' })),
  assignmentReport: vi.fn(async () => ({ data: null, error: null })),
  assignmentRemediate: vi.fn(async () => ({ id: 'rem' })),
}));

import AdminScreen from './AdminScreen';

const ADMIN: PracticeAccount = { id: 'adm', username: 'admin', display_name: 'Admin', role: 'admin' };
const TEACHER: PracticeAccount = { id: 't1', username: 'cogiao', display_name: 'Co Giao', role: 'teacher' };
const ok = (rows: unknown[] = []): FetchResult => ({ rows, error: null, truncated: false });
// refresh order: accounts, classes, enrollments, class_grade_scopes
const settle = async (i: number, v: FetchResult) => deferreds[i]!.resolve(v);

beforeEach(() => {
  deferreds.length = 0;
  invoke.mockClear();
  for (const k of Object.keys(listDeferreds)) delete listDeferreds[k];
  closeDeferreds.length = 0;
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

describe('AssignPanel stale-class reload guard (CR-98 r6)', () => {
  const CLS = [
    { id: 'clsA', name: 'Lop A', grade_id: 'grade-2', join_code: 'AAAAAA', created_by: 't1' },
    { id: 'clsB', name: 'Lop B', grade_id: 'grade-2', join_code: 'BBBBBB', created_by: 't1' },
  ];
  const asgRow = (id: string, title: string) => ({
    id, title, form_id: `f-${id}`, grade_id: 'grade-2', program_id: 'english',
    opens_at: new Date().toISOString(), due_at: new Date().toISOString(),
    status: 'open', submitted: 1, started: 0, roster: 10,
  });
  const resolveList = async (cid: string, rows: Array<Record<string, unknown>>) => {
    const d = listDeferreds[cid]?.shift();
    expect(d).toBeTruthy();
    d!.resolve({ rows, error: null });
    await Promise.resolve();
  };

  it('a mutation finishing after a class switch cannot blank the new class list', async () => {
    // Mount refresh for teacher: accounts, classes, enrollments, scopes.
    await act(async () => {
      render(<AdminScreen account={TEACHER} onSignOut={() => {}} />);
      await Promise.resolve();
    });
    await act(async () => {
      await settle(0, ok([]));
      await settle(1, ok(CLS));
      await settle(2, ok([]));
      await settle(3, ok([{ class_id: 'clsA', grade_id: 'grade-2' }]));
    });

    // assign tab -> pick class A -> resolve its list so 'Đóng bài' exists.
    await act(async () => {
      fireEvent.click(screen.getByText('Giao bài'));
    });
    await act(async () => {
      fireEvent.change(screen.getByTestId('assign-class-select'), { target: { value: 'clsA' } });
    });
    await act(async () => {
      await resolveList('clsA', [asgRow('asgA', 'Bai lop A')]);
    });
    expect(screen.getByText('Bai lop A')).toBeTruthy();

    // Teacher starts closing A's assignment (RPC pending)...
    await act(async () => {
      fireEvent.click(screen.getByText('Đóng bài'));
      await Promise.resolve();
    });
    expect(closeDeferreds).toHaveLength(1);

    // ...then switches to class B BEFORE the mutation resolves.
    await act(async () => {
      fireEvent.change(screen.getByTestId('assign-class-select'), { target: { value: 'clsB' } });
      await Promise.resolve();
    });
    expect(listDeferreds['clsB']).toHaveLength(1);

    // A's close RPC finishes late -> handler fires reload('clsA'), which
    // must be dropped WITHOUT bumping the generation.
    await act(async () => {
      closeDeferreds.shift()!.resolve({ ok: true });
      await Promise.resolve();
      await Promise.resolve();
    });

    // B's list resolves - it must still paint (not cancelled by the
    // stale reload) and A's row must not leak into B's view.
    await act(async () => {
      await resolveList('clsB', [asgRow('asgB', 'Bai lop B')]);
    });
    expect(screen.getByText('Bai lop B')).toBeTruthy();
    expect(screen.queryByText('Bai lop A')).toBeNull();
  });
});
