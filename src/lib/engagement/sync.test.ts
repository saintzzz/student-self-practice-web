import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeEngagement, bindEngagement, unbindEngagement, flushEngagement } from './sync';
import {
  getState,
  markOwnerAccountId,
  resetForTests,
  writeState,
  type EngagementState,
} from './store';

// CR-45 acceptance criteria.

const base: EngagementState = {
  totalStars: 0,
  grades: {},
  streak: { lastDayISO: null, count: 0 },
  stickerIds: [],
  batchesCompleted: 0,
  gradesPlayed: [],
};

const item = (id: string, stage: 0 | 1 | 2 | 3, updatedAtISO: string) => ({
  id,
  question: { id, kind: 'multiple-choice', prompt: 'p', options: ['a'], correctIndex: 0 } as never,
  stage,
  addedAtISO: '2026-01-01',
  dueISO: '2026-01-02',
  updatedAtISO,
});

const lastUpsert = (remote: ReturnType<typeof mockRemote>) =>
  remote.upsertCalls[remote.upsertCalls.length - 1];

/** In-memory remote table shared by every mocked device client. */
function mockRemote(rows: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(rows));
  const upsertCalls: { account_id: string; state: unknown }[] = [];
  let pullDelayMs = 0;
  let pullFails = false;
  let upsertFails = false;
  let pullCount = 0;
  const client = {
    from: () => ({
      select: () => ({
        eq: (_k: string, v: string) => ({
          maybeSingle: async () => {
            pullCount += 1;
            if (pullDelayMs) await new Promise((r) => setTimeout(r, pullDelayMs));
            if (pullFails) return { data: null, error: { message: 'down' } };
            const row = store.get(v);
            return { data: row ? { state: row } : null, error: null };
          },
        }),
      }),
      upsert: async (row: { account_id: string; state: unknown }) => {
        if (upsertFails) return { error: { message: 'down' } };
        upsertCalls.push(row);
        store.set(row.account_id, row.state);
        return { error: null };
      },
    }),
  };
  return {
    store,
    upsertCalls,
    client,
    setPullDelay: (ms: number) => (pullDelayMs = ms),
    setPullFails: (f: boolean) => (pullFails = f),
    setUpsertFails: (f: boolean) => (upsertFails = f),
    getPullCount: () => pullCount,
  };
}

vi.mock('../supabase/client', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: vi.fn(),
}));

async function wired(remote: ReturnType<typeof mockRemote>) {
  const { getSupabase } = await import('../supabase/client');
  vi.mocked(getSupabase).mockResolvedValue(remote.client as never);
}

beforeEach(() => {
  resetForTests();
  unbindEngagement();
});

describe('mergeEngagement - no progress is ever lost', () => {
  it('takes the max of monotonic counters and unions ids', () => {
    const local = { ...base, totalStars: 12, batchesCompleted: 3, stickerIds: ['a', 'b'] };
    const remote = { ...base, totalStars: 7, batchesCompleted: 5, stickerIds: ['b', 'c'] };
    const m = mergeEngagement(local, remote);
    expect(m.totalStars).toBe(12);
    expect(m.batchesCompleted).toBe(5);
    expect(m.stickerIds.sort()).toEqual(['a', 'b', 'c']);
  });

  it('M1: a legit streak reset survives - newer day keeps its own count', () => {
    const local = { ...base, streak: { lastDayISO: '2026-02-01', count: 1 } };
    const remote = { ...base, streak: { lastDayISO: '2026-01-01', count: 10 } };
    expect(mergeEngagement(local, remote).streak).toEqual({ lastDayISO: '2026-02-01', count: 1 });
  });

  it('M1: same day still maxes the count', () => {
    const local = { ...base, streak: { lastDayISO: '2026-02-01', count: 3 } };
    const remote = { ...base, streak: { lastDayISO: '2026-02-01', count: 10 } };
    expect(mergeEngagement(local, remote).streak.count).toBe(10);
  });

  it('M2: a stage-0 reset on one device beats a stale higher stage', () => {
    const local = { ...base, review: { g: [item('q1', 0, '2026-01-10')] } };
    const remote = { ...base, review: { g: [item('q1', 2, '2026-01-05')] } };
    expect(mergeEngagement(local, remote).review?.g?.[0]?.stage).toBe(0);
  });

  it('M2: tombstoned mastered items are not resurrected', () => {
    const local = { ...base, reviewMastered: { q1: '2026-01-10' }, review: {} };
    const remote = { ...base, review: { g: [item('q1', 2, '2026-01-05')] } };
    const m = mergeEngagement(local, remote);
    expect(m.review?.g ?? []).toEqual([]);
    expect(m.reviewMastered?.q1).toBe('2026-01-10');
  });

  it('M2: an item re-earned wrong after mastery survives a REMOTE tombstone', () => {
    /* The server still holds q1's tombstone from a synced review
       session; locally the same question was answered wrong again and
       re-queued with a newer timestamp. Merge must keep the item. */
    const local = { ...base, review: { g: [item('q1', 0, '2026-01-20T15:00:00.000Z')] } };
    const remote = { ...base, reviewMastered: { q1: '2026-01-20T08:00:00.000Z' } };
    const m = mergeEngagement(local, remote);
    expect(m.review?.g?.[0]?.id).toBe('q1');
    expect(m.review?.g?.[0]?.stage).toBe(0);
  });

  it('M2: same-day mastery then re-wrong still keeps the item', () => {
    /* Tombstone and item share the calendar day but carry full
       timestamps - date-only stamps used to compare equal and drop
       the item. */
    const local = {
      ...base,
      reviewMastered: { q1: '2026-01-20T08:00:00.000Z' },
      review: { g: [item('q1', 0, '2026-01-20T16:30:00.000Z')] },
    };
    const remote = { ...base, reviewMastered: { q1: '2026-01-20T08:00:00.000Z' } };
    const m = mergeEngagement(local, remote);
    expect(m.review?.g?.[0]?.id).toBe('q1');
  });

  it('same-day daily quests OR the booleans and max the counter', () => {
    const local = { ...base, dailyQuest: { dateISO: '2026-01-07', drillDone: true, correctToday: 4, bigDone: false, bonusClaimed: false } };
    const remote = { ...base, dailyQuest: { dateISO: '2026-01-07', drillDone: false, correctToday: 9, bigDone: true, bonusClaimed: true } };
    expect(mergeEngagement(local, remote).dailyQuest).toEqual({
      dateISO: '2026-01-07',
      drillDone: true,
      correctToday: 9,
      bigDone: true,
      bonusClaimed: true,
    });
  });

  it('m1: day stats stay inside the 30-day cap after union', () => {
    const mk = (from: number) =>
      Object.fromEntries(
        Array.from({ length: 30 }, (_, i) => [`2026-01-${String(i + from).padStart(2, '0')}`, { correct: 1, total: 1 }]),
      );
    const m = mergeEngagement(
      { ...base, stats: { days: mk(1), skills: {} } },
      { ...base, stats: { days: mk(20), skills: {} } },
    );
    expect(Object.keys(m.stats!.days).length).toBeLessThanOrEqual(30);
  });

  it('is idempotent - merging twice changes nothing', () => {
    const local = {
      ...base,
      totalStars: 20,
      stickerIds: ['a'],
      review: { g: [item('q1', 1, '2026-01-10T10:00:00.000Z')] },
      reviewMastered: { q2: '2026-01-09T09:00:00.000Z' },
    };
    const remote = {
      ...base,
      totalStars: 9,
      stickerIds: ['b'],
      review: { g: [item('q3', 0, '2026-01-11T10:00:00.000Z')] },
      reviewMastered: { q4: '2026-01-08T09:00:00.000Z' },
    };
    const once = mergeEngagement(local, remote);
    expect(mergeEngagement(once, remote)).toEqual(once);
    expect(once.review?.g).toHaveLength(2);
    expect(Object.keys(once.reviewMastered ?? {}).sort()).toEqual(['q2', 'q4']);
  });
});

describe('bindEngagement - AC-45.1/45.2/45.3', () => {
  it('pulls remote, merges into local, pushes the merged state', async () => {
    const remote = mockRemote({ 'acct-1': { ...base, totalStars: 30, stickerIds: ['r'] } });
    await wired(remote);
    markOwnerAccountId('acct-1');
    writeState({ ...base, totalStars: 10, stickerIds: ['l'] });

    await bindEngagement('acct-1');

    expect(getState().totalStars).toBe(30);
    expect(getState().stickerIds.sort()).toEqual(['l', 'r']);
    expect(lastUpsert(remote)?.account_id).toBe('acct-1');
    expect((lastUpsert(remote)?.state as EngagementState).totalStars).toBe(30);
  });

  it('B1: a different owner\'s local state is discarded, never merged', async () => {
    const remote = mockRemote({ 'acct-b': { ...base, totalStars: 5 } });
    await wired(remote);
    /* acct-a's blob lingers on the shared device after logout. */
    markOwnerAccountId('acct-a');
    writeState({ ...base, totalStars: 99, stickerIds: ['a-only'] });

    await bindEngagement('acct-b');

    expect(getState().totalStars).toBe(5);
    expect(getState().stickerIds).not.toContain('a-only');
    /* Whatever (if anything) was pushed must carry no trace of
       acct-a's blob - and remote keeps acct-b's own data. */
    for (const call of remote.upsertCalls) {
      expect(JSON.stringify(call.state)).not.toContain('a-only');
      expect((call.state as EngagementState).totalStars).toBeLessThanOrEqual(5);
    }
    expect(remote.store.get('acct-b')).toMatchObject({ totalStars: 5 });
  });

  it('B1-offline: the foreign blob is discarded even when the pull fails', async () => {
    const remote = mockRemote({});
    remote.setPullFails(true);
    await wired(remote);
    markOwnerAccountId('acct-a');
    writeState({ ...base, totalStars: 99, stickerIds: ['a-only'] });

    await bindEngagement('acct-b');
    expect(getState().totalStars).toBe(0); // foreign blob already gone

    /* Connectivity returns; the next mutation pushes only clean data. */
    remote.setPullFails(false);
    writeState({ ...base, totalStars: 1 });
    await flushEngagement();
    for (const call of remote.upsertCalls) {
      expect(JSON.stringify(call.state)).not.toContain('a-only');
    }
    expect((remote.store.get('acct-b') as EngagementState).totalStars).toBeLessThanOrEqual(1);
  });

  it('guest-owned state merges upward on first login', async () => {
    const remote = mockRemote({});
    await wired(remote);
    /* owner null = guest state */
    writeState({ ...base, totalStars: 7, stickerIds: ['guest-badge'] });

    await bindEngagement('acct-new');

    expect(getState().totalStars).toBe(7);
    expect(remote.store.get('acct-new')).toMatchObject({ totalStars: 7 });
  });

  it('B3: a push pulls first, so a second device merges instead of overwriting', async () => {
    const remote = mockRemote({ 'acct-1': { ...base, totalStars: 10 } });
    await wired(remote);
    markOwnerAccountId('acct-1');
    writeState({ ...base, totalStars: 10 });
    await bindEngagement('acct-1');

    /* Device 2 earns stars and pushes while device 1 sits idle. */
    remote.store.set('acct-1', { ...base, totalStars: 40 });
    /* Device 1 mutates -> cycle pulls, merges to 40, pushes 40. */
    writeState({ ...base, totalStars: 11 });
    await flushEngagement();

    expect(getState().totalStars).toBe(40);
    expect((remote.store.get('acct-1') as EngagementState).totalStars).toBe(40);
  });

  it('B2: no push can land before the initial pull resolves', async () => {
    const remote = mockRemote({ 'acct-1': { ...base, totalStars: 50 } });
    remote.setPullDelay(60);
    await wired(remote);
    writeState({ ...base, totalStars: 3 });
    const pending = bindEngagement('acct-1');
    /* Mutations during the slow pull must not upsert local-only state. */
    writeState({ ...base, totalStars: 4 });
    await pending;

    /* Local merged remote in; and any upsert that ever ran carried the
       merged state - never the un-pulled local 3/4 stars. */
    expect(getState().totalStars).toBe(50);
    for (const call of remote.upsertCalls) {
      expect((call.state as EngagementState).totalStars).toBe(50);
    }
    expect(remote.store.get('acct-1')).toMatchObject({ totalStars: 50 });
  });

  it('M3: a late pull cannot land after the binding changed', async () => {
    const remote = mockRemote({
      'acct-a': { ...base, totalStars: 100 },
      'acct-b': { ...base, totalStars: 5 },
    });
    remote.setPullDelay(60);
    await wired(remote);
    writeState({ ...base, totalStars: 1 });

    const bindA = bindEngagement('acct-a');
    /* User switches account mid-pull. */
    remote.setPullDelay(0);
    await bindEngagement('acct-b');
    await bindA;

    /* A's 100 stars must not have merged into the active binding. */
    expect(getState().totalStars).toBeLessThan(100);
    expect((remote.store.get('acct-b') as EngagementState).totalStars).toBe(5);
  });

  it('m3: a corrupt remote row is sanitized instead of crashing sync', async () => {
    const remote = mockRemote({
      'acct-1': {
        totalStars: 'x',
        reviewMastered: 5,
        review: { g: 7 },
        stats: 'nope',
        streak: null,
        stickerIds: 'not-an-array',
      },
    });
    await wired(remote);
    writeState({ ...base, totalStars: 3 });

    await bindEngagement('acct-1'); // must not throw

    expect(getState().totalStars).toBe(3);
    await flushEngagement(); // and the cycle must not throw either
    for (const call of remote.upsertCalls) {
      expect(typeof (call.state as EngagementState).totalStars).toBe('number');
    }
  });

  it('a failed pull does not retry on a timer - it waits for a mutation', async () => {
    const remote = mockRemote({ 'acct-1': { ...base, totalStars: 9 } });
    remote.setPullFails(true);
    await wired(remote);
    markOwnerAccountId('acct-1');
    writeState({ ...base, totalStars: 2 });
    await bindEngagement('acct-1');
    const afterBind = remote.getPullCount();

    /* A mutation while pulls fail schedules one cycle that fails and
       must NOT reschedule itself. */
    writeState({ ...base, totalStars: 3 });
    await flushEngagement();
    const afterFail = remote.getPullCount();
    await new Promise((r) => setTimeout(r, 1200));
    expect(remote.getPullCount()).toBe(afterFail);
    expect(afterFail).toBeGreaterThanOrEqual(afterBind);
  });

  it('a failed upsert is retried on the next mutation - flush reports it', async () => {
    const remote = mockRemote({ 'acct-1': { ...base, totalStars: 9 } });
    await wired(remote);
    markOwnerAccountId('acct-1');
    writeState({ ...base, totalStars: 9 });
    await bindEngagement('acct-1');

    remote.setUpsertFails(true);
    writeState({ ...base, totalStars: 20 });
    expect(await flushEngagement()).toBe(false); // reports the failure
    expect(remote.store.get('acct-1')).toMatchObject({ totalStars: 9 });

    remote.setUpsertFails(false);
    writeState({ ...base, totalStars: 21 });
    expect(await flushEngagement()).toBe(true);
    expect(remote.store.get('acct-1')).toMatchObject({ totalStars: 21 });
  });

  it('unbound flush reports not-synced - sign-out must keep the blob', async () => {
    /* An owner-marked blob (e.g. kept after an offline sign-out) must
       not be cleared by a later sign-out that never bound - the admin
       path binds nothing, so flush must answer "not synced". */
    const remote = mockRemote({});
    await wired(remote);
    markOwnerAccountId('acct-a');
    writeState({ ...base, totalStars: 42 });
    unbindEngagement(); // nothing bound

    expect(await flushEngagement()).toBe(false);
    expect(getState().totalStars).toBe(42); // blob untouched
  });
});
