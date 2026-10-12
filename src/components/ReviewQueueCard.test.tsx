import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ReviewQueueCard from './ReviewQueueCard';

const queueResolvers: Array<{
  status: string;
  calls: string[];
  resolve: (v: { data: unknown[]; count: number; error: null }) => void;
}> = [];
const rpcResolvers: Array<{ resolve: (v: { data: unknown; error: null }) => void }> = [];

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
      rpc: vi.fn((name: string) => {
        if (name === 'review_question')
          return new Promise((resolve) => rpcResolvers.push({ resolve }));
        return Promise.resolve({ data: [], error: null });
      }),
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

  it('a review mutation completing after a filter switch does not mutate the new view', async () => {
    queueResolvers.length = 0;
    rpcResolvers.length = 0;
    render(<ReviewQueueCard />);
    await act(flush);
    const pendingReq = queueResolvers.find((r) => r.status === 'pending');
    await act(async () => {
      pendingReq!.resolve({
        data: [{ question_id: 'q-p1', priority: 'P0', issues: [] }],
        count: 1,
        error: null,
      });
      await flush();
    });
    expect(screen.getByTestId('review-approve-q-p1')).toBeTruthy();

    fireEvent.click(screen.getByTestId('review-approve-q-p1'));
    await act(flush);
    expect(rpcResolvers).toHaveLength(1);

    // Reviewer switches to the approved view while the RPC is in flight.
    fireEvent.click(screen.getByTestId('review-filter-approved'));
    await act(flush);
    const approvedReq = queueResolvers.filter((r) => r.status === 'approved').pop();
    await act(async () => {
      approvedReq!.resolve({
        data: [{ question_id: 'q-appr', priority: 'P1', issues: [] }],
        count: 7,
        error: null,
      });
      await flush();
    });
    expect(screen.getByText(/Duyệt câu hỏi \(7\)/)).toBeTruthy();

    // The mutation resolves late - it must not decrement the approved
    // count or touch the approved rows.
    await act(async () => {
      rpcResolvers[0]!.resolve({ data: { ok: true }, error: null });
      await flush();
    });
    expect(screen.getByText(/Duyệt câu hỏi \(7\)/)).toBeTruthy();
    expect(screen.queryByTestId('review-item-q-p1')).toBeNull();
  });

  it('A->B->A filter switch still invalidates the mutation (epoch, not values)', async () => {
    queueResolvers.length = 0;
    rpcResolvers.length = 0;
    render(<ReviewQueueCard />);
    await act(flush);
    await act(async () => {
      queueResolvers.find((r) => r.status === 'pending')!.resolve({
        data: [{ question_id: 'q-p1', priority: 'P0', issues: [] }],
        count: 1,
        error: null,
      });
      await flush();
    });
    fireEvent.click(screen.getByTestId('review-approve-q-p1'));
    await act(flush);

    // A -> B -> A: leave pending, come back to identical filter values.
    fireEvent.click(screen.getByTestId('review-filter-approved'));
    await act(flush);
    fireEvent.click(screen.getByTestId('review-filter-pending'));
    await act(flush);
    await act(async () => {
      queueResolvers.filter((r) => r.status === 'pending').pop()!.resolve({
        data: [{ question_id: 'q-p1', priority: 'P0', issues: [] }],
        count: 1,
        error: null,
      });
      await flush();
    });
    expect(screen.getByTestId('review-item-q-p1')).toBeTruthy();

    // The RPC resolves: value comparison would pass (same filter), but
    // the epoch changed - the correct path reloads instead of mutating.
    await act(async () => {
      rpcResolvers[0]!.resolve({ data: { ok: true }, error: null });
      await flush();
    });
    expect(screen.getByText(/Đang tải/)).toBeTruthy();
    expect(screen.getByText(/Duyệt câu hỏi \(1\)/)).toBeTruthy();
  });

  it('unmount invalidates an in-flight load (no state write, no crash)', async () => {
    queueResolvers.length = 0;
    const { unmount } = render(<ReviewQueueCard />);
    await act(flush);
    unmount();
    await act(async () => {
      queueResolvers[0]!.resolve({ data: [{ question_id: 'q-x', priority: 'P0', issues: [] }], count: 1, error: null });
      await flush();
    });
  });
});
