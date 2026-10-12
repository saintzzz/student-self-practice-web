import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ReviewQueueCard from './ReviewQueueCard';

const queueResolvers: Array<{
  status: string;
  calls: string[];
  resolve: (v: { data: unknown[]; count: number; error: null }) => void;
}> = [];

vi.mock('../lib/supabase/client', () => {
  const builder = () => {
    const state = { filter: '' };
    const calls: string[] = [];
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.eq = (_c: string, v: string) => {
      state.filter = v;
      return b;
    };
    b.order = (col: string) => {
      calls.push(`order:${col}`);
      return b;
    };
    b.in = () => Promise.resolve({ data: [], error: null });
    b.range = () => {
      calls.push('range');
      return new Promise((resolve) => queueResolvers.push({ status: state.filter, calls, resolve }));
    };
    return b;
  };
  return {
    getSupabase: async () => ({
      from: () => builder(),
      rpc: vi.fn(async () => ({ data: [], error: null })),
    }),
    isSupabaseConfigured: () => true,
  };
});

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('ReviewQueueCard - r10 load lifecycle', () => {
  it('orders by priority in the DB before paginating', async () => {
    queueResolvers.length = 0;
    render(<ReviewQueueCard />);
    await act(flush);
    const calls = queueResolvers[0]!.calls;
    expect(calls.indexOf('order:priority')).toBeGreaterThanOrEqual(0);
    expect(calls.indexOf('order:priority')).toBeLessThan(calls.indexOf('range'));
  });

  it('ignores a superseded response resolving after a newer filter request', async () => {
    queueResolvers.length = 0;
    render(<ReviewQueueCard />);
    await act(flush);
    const pendingReq = queueResolvers.find((r) => r.status === 'pending');
    expect(pendingReq).toBeTruthy();

    fireEvent.click(screen.getByTestId('review-filter-approved'));
    await act(flush);
    const approvedReq = queueResolvers.find((r) => r.status === 'approved');
    expect(approvedReq).toBeTruthy();

    await act(async () => {
      approvedReq!.resolve({
        data: [{ question_id: 'q-approved', priority: 'P1', issues: [] }],
        count: 1,
        error: null,
      });
      await flush();
    });
    expect(screen.getByTestId('review-item-q-approved')).toBeTruthy();

    // The older pending request resolves late - it must not clobber the
    // approved view.
    await act(async () => {
      pendingReq!.resolve({
        data: [{ question_id: 'q-stale', priority: 'P0', issues: [] }],
        count: 9,
        error: null,
      });
      await flush();
    });
    expect(screen.queryByTestId('review-item-q-stale')).toBeNull();
    expect(screen.getByTestId('review-item-q-approved')).toBeTruthy();
  });
});
