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

/** In-memory remote table shared by every mocked device client.
 *  r17: rows carry an updated_at version token; writes go through
 *  insert (23505 on duplicate) or a conditional update. */
function mockRemote(rows: Record<string, unknown> = {}) {
  let version = 0;
  const store = new Map<string, { state: unknown; updated_at: string }>(
    Object.entries(rows).map(([k, v]) => [k, { state: v, updated_at: `v${version}` }]),
  );
  const upsertCalls: { account_id: string; state: unknown }[] = [];
  let pullDelayMs = 0;
  let pullFails = false;
  let upsertFails = false;
  let pullCount = 0;
  let onUpdate: (() => void) | null = null;
  const client = {
    from: () => ({
      select: () => ({
        eq: (_k: string, v: string) => ({
          maybeSingle: async () => {
            pullCount += 1;
            if (pullDelayMs) await new Promise((r) => setTimeout(r, pullDelayMs));
            if (pullFails) return { data: null, error: { message: 'down' } };
            const row = store.get(v);
            return { data: row ?? null, error: null };
          },
        }),
      }),
      insert: async (row: { account_id: string; state: unknown }) => {
        if (upsertFails) return { error: { message: 'down' } };
        if (store.has(row.account_id)) return { error: { code: '23505', message: 'duplicate' } };
        upsertCalls.push(row);
        store.set(row.account_id, { state: row.state, updated_at: `v${++version}` });
        return { error: null };
      },
      update: (vals: { state: unknown }) => ({
        eq: (_k: string, v: string) => ({
          eq: (_k2: string, expected: string) => ({
            select: async () => {
              if (upsertFails) return { data: null, error: { message: 'down' } };
              onUpdate?.();
              const row = store.get(v);
              if (!row || row.updated_at !== expected) return { data: [], error: null };
              upsertCalls.push({ account_id: v, state: vals.state });
              store.set(v, { state: vals.state, updated_at: `v${++version}` });
              return { data: [{ account_id: v }], error: null };
            },
          }),
        }),
      }),
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
    setOnUpdate: (fn: (() => void) | null) => (onUpdate = fn),
    writeRow: (accountId: string, state: unknown) =>
      store.set(accountId, { state, updated_at: `v${++version}` }),
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

  it('CR-146: trail + gameBest merge keeps the further lap and best stars', () => {
    const local = {
      ...base,
      trail: { 'grade-1': { epoch: 1, lights: [{ id: 'a1', stars: 2 }, { id: 'a2', stars: 1 }, { id: 'a3', stars: 3 }], seenIds: ['old1'] } },
      gameBest: { fish: 2, 'fish:L2': 1 },
      spends: { devA: 25 },
    };
    const remote = {
      ...base,
      trail: {
        'grade-1': { epoch: 0, lights: [{ id: 'b1', stars: 3 }, { id: 'b2', stars: 0 }], seenIds: ['old2'] },
        'grade-2': { epoch: 0, lights: [{ id: 'c1', stars: 1 }, { id: 'c2', stars: 0 }] },
      },
      gameBest: { fish: 3, pop: 1 },
      spends: { devB: 25 },
    };
    const m = mergeEngagement(local, remote);
    /* local is on lap 2 (epoch 1); remote's 2 unique lap-1 lights fold
       into the merged lap - concurrent progress is never lost. */
    expect(m.trail?.['grade-1']).toEqual({
      epoch: 1,
      lights: [{ id: 'a1', stars: 2 }, { id: 'a2', stars: 1 }, { id: 'a3', stars: 3 }, { id: 'b1', stars: 3 }, { id: 'b2', stars: 0 }],
      seenIds: ['old1', 'old2'],
    });
    expect(m.trail?.['grade-2']).toEqual({ epoch: 0, lights: [{ id: 'c1', stars: 1 }, { id: 'c2', stars: 0 }], seenIds: [] });
    expect(m.gameBest).toEqual({ fish: 3, 'fish:L2': 1, pop: 1 });
    /* r230: concurrent 25-star purchases on two devices SUM to 50. */
    expect(m.spends).toEqual({ devA: 25, devB: 25 });
  });

  it('CR-146: same-lap concurrent lights union by objective id (r229)', () => {
    const local = { ...base, trail: { 'grade-1': { epoch: 0, lights: [{ id: 'batch:x1', stars: 3 }, { id: 'batch:x2', stars: 1 }] } } };
    const remote = { ...base, trail: { 'grade-1': { epoch: 0, lights: [{ id: 'batch:x2', stars: 1 }, { id: 'batch:y1', stars: 2 }] } } };
    const m = mergeEngagement(local, remote);
    /* x2 deduped; x1+x2+y1 = 3 lit nodes - no advancement lost. */
    expect(m.trail?.['grade-1']?.lights.map((l) => l.id)).toEqual(['batch:x1', 'batch:x2', 'batch:y1']);
  });

  it('CR-146 r230: retired lap ids in seenIds never re-fold into the next epoch', () => {
    const local = {
      ...base,
      trail: { 'grade-1': { epoch: 1, lights: [{ id: 'a1', stars: 3 }], seenIds: ['b1', 'b2'] } },
    };
    const remote = {
      ...base,
      /* stale epoch-0 state whose lap-1 ids already retired locally -
         re-folding them must NOT grant free advancements. */
      trail: { 'grade-1': { epoch: 0, lights: [{ id: 'b1', stars: 3 }, { id: 'b2', stars: 2 }, { id: 'b3', stars: 1 }] } },
    };
    const m = mergeEngagement(local, remote);
    /* b1+b2 already seen -> only b3 folds. */
    expect(m.trail?.['grade-1']?.lights.map((l) => l.id)).toEqual(['a1', 'b3']);
    expect(m.trail?.['grade-1']?.epoch).toBe(1);
  });

  it('CR-146 r231: base lights retired on the other side are filtered too', () => {
    /* Equal epochs - b retired x1 in ITS lap 1 while a still carries it
       in the current lap. Counting both would double the same event. */
    const local = { ...base, trail: { 'grade-1': { epoch: 1, lights: [{ id: 'x1', stars: 3 }], seenIds: [] } } };
    const remote = { ...base, trail: { 'grade-1': { epoch: 1, lights: [{ id: 'y1', stars: 2 }], seenIds: ['x1'] } } };
    const m = mergeEngagement(local, remote);
    expect(m.trail?.['grade-1']?.lights.map((l) => l.id)).toEqual(['y1']);
    /* reversed argument order must agree (no argument-order bias). */
    const r = mergeEngagement(remote, local);
    expect(r.trail?.['grade-1']?.lights.map((l) => l.id)).toEqual(['y1']);
  });

  it('CR-146 r231: seenIds is durable - replay beyond any lap count cannot refold', () => {
    /* epoch 5 with every retired id still remembered: a stale epoch-0
       payload's 12 lights all match history -> nothing folds. */
    const retired = Array.from({ length: 60 }, (_, i) => `lap${Math.floor(i / 12)}:${i % 12}`);
    const local = { ...base, trail: { 'grade-1': { epoch: 5, lights: [], seenIds: retired } } };
    const remote = {
      ...base,
      trail: { 'grade-1': { epoch: 0, lights: retired.slice(0, 12).map((id) => ({ id, stars: 3 })) } },
    };
    const m = mergeEngagement(local, remote);
    expect(m.trail?.['grade-1']?.epoch).toBe(5);
    expect(m.trail?.['grade-1']?.lights).toEqual([]);
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
    expect(remote.store.get('acct-b')?.state).toMatchObject({ totalStars: 5 });
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
    expect((remote.store.get('acct-b')?.state as EngagementState).totalStars).toBeLessThanOrEqual(1);
  });

  it('guest-owned state merges upward on first login', async () => {
    const remote = mockRemote({});
    await wired(remote);
    /* owner null = guest state */
    writeState({ ...base, totalStars: 7, stickerIds: ['guest-badge'] });

    await bindEngagement('acct-new');

    expect(getState().totalStars).toBe(7);
    expect(remote.store.get('acct-new')?.state).toMatchObject({ totalStars: 7 });
  });

  it('B3: a push pulls first, so a second device merges instead of overwriting', async () => {
    const remote = mockRemote({ 'acct-1': { ...base, totalStars: 10 } });
    await wired(remote);
    markOwnerAccountId('acct-1');
    writeState({ ...base, totalStars: 10 });
    await bindEngagement('acct-1');

    /* Device 2 earns stars and pushes while device 1 sits idle. */
    remote.writeRow('acct-1', { ...base, totalStars: 40 });
    /* Device 1 mutates -> cycle pulls, merges to 40, pushes 40. */
    writeState({ ...base, totalStars: 11 });
    await flushEngagement();

    expect(getState().totalStars).toBe(40);
    expect((remote.store.get('acct-1')?.state as EngagementState).totalStars).toBe(40);
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
    expect(remote.store.get('acct-1')?.state).toMatchObject({ totalStars: 50 });
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
    expect((remote.store.get('acct-b')?.state as EngagementState).totalStars).toBe(5);
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
    expect(remote.store.get('acct-1')?.state).toMatchObject({ totalStars: 9 });

    remote.setUpsertFails(false);
    writeState({ ...base, totalStars: 21 });
    expect(await flushEngagement()).toBe(true);
    expect(remote.store.get('acct-1')?.state).toMatchObject({ totalStars: 21 });
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

describe('r17 device-attributed stat merge', () => {
  const day = (correct: number, total: number) => ({ '2026-02-01': { correct, total } });
  const statsWith = (devices: Record<string, unknown>, days: Record<string, { correct: number; total: number }>) => ({
    days,
    skills: {},
    devices,
  });

  it('sums independent progress across devices instead of max-ing', () => {
    /* Shared base 100 (already synced -> same 'legacy' bucket), then
       device A adds 10 and device B adds 20: merged must be 130. The
       old aggregate max returned 120 and silently dropped A's work. */
    const local = {
      ...base,
      stats: statsWith(
        { legacy: { days: day(100, 100) }, devA: { days: day(10, 10) } },
        day(110, 110),
      ),
    };
    const remote = {
      ...base,
      stats: statsWith(
        { legacy: { days: day(100, 100) }, devB: { days: day(20, 20) } },
        day(120, 120),
      ),
    };
    const m = mergeEngagement(local as never, remote as never);
    expect(m.stats?.days['2026-02-01']).toEqual({ correct: 130, total: 130 });
  });

  it('dedupes shared history via the legacy bucket - no double count', () => {
    const stats = { days: day(100, 100), skills: {} };
    const local = { ...base, stats };
    const remote = { ...base, stats };
    const m = mergeEngagement(local, remote);
    expect(m.stats?.days['2026-02-01']).toEqual({ correct: 100, total: 100 });
  });

  it('keeps correct/total consistent per device (no accuracy inflation)', () => {
    const local = {
      ...base,
      stats: statsWith({ devA: { days: day(8, 10) } }, day(8, 10)),
    };
    const remote = {
      ...base,
      stats: statsWith({ devB: { days: day(15, 20) } }, day(15, 20)),
    };
    const m = mergeEngagement(local as never, remote as never);
    expect(m.stats?.days['2026-02-01']).toEqual({ correct: 23, total: 30 });
  });

  it('carries the device map forward and stays idempotent', () => {
    const local = {
      ...base,
      stats: statsWith({ devA: { days: day(10, 10) } }, day(10, 10)),
    };
    const remote = {
      ...base,
      stats: statsWith({ devB: { days: day(20, 20) } }, day(20, 20)),
    };
    const once = mergeEngagement(local as never, remote as never);
    expect(once.stats?.devices?.devA).toBeDefined();
    expect(once.stats?.devices?.devB).toBeDefined();
    const twice = mergeEngagement(once, remote as never);
    expect(twice.stats?.days['2026-02-01']).toEqual({ correct: 30, total: 30 });
    expect(JSON.stringify(twice.stats)).toBe(JSON.stringify(once.stats));
  });

  it('still merges skills and skillDays per device', () => {
    const mk = (dev: string, n: number) => ({
      days: {},
      skills: { g: { s: { correct: n, total: n } } },
      skillDays: { '2026-02-01': { g: { s: { correct: n, total: n } } } },
      devices: { [dev]: { days: {}, skills: { g: { s: { correct: n, total: n } } }, skillDays: { '2026-02-01': { g: { s: { correct: n, total: n } } } } } },
    });
    const m = mergeEngagement(
      { ...base, stats: mk('devA', 3) },
      { ...base, stats: mk('devB', 7) },
    );
    expect(m.stats?.skills.g.s).toEqual({ correct: 10, total: 10 });
    expect(m.stats?.skillDays?.['2026-02-01'].g.s).toEqual({ correct: 10, total: 10 });
  });
});

describe('r17 CAS push - no blind overwrite', () => {
  it('a concurrent write between pull and push triggers re-merge, not clobber', async () => {
    const remote = mockRemote({ 'acct-1': { ...base, totalStars: 10 } });
    await wired(remote);
    markOwnerAccountId('acct-1');
    writeState({ ...base, totalStars: 10 });
    await bindEngagement('acct-1');

    /* Device 2 writes +5 between our pull and our conditional update. */
    remote.setOnUpdate(() => {
      remote.writeRow('acct-1', { ...base, totalStars: 15 });
      remote.setOnUpdate(null);
    });
    writeState({ ...base, totalStars: 11 });
    await flushEngagement();

    /* Our 11 merged with their 15 -> the remote must hold the union,
       and the pull count shows the conflict forced a second round. */
    expect(remote.store.get('acct-1')?.state).toMatchObject({ totalStars: 15 });
    expect(getState().totalStars).toBe(15);
    expect(remote.getPullCount()).toBeGreaterThanOrEqual(2);
  });

  it('bindEngagement conflict marks pushFailed instead of overwriting', async () => {
    const remote = mockRemote({ 'acct-1': { ...base, totalStars: 5 } });
    await wired(remote);
    writeState({ ...base, totalStars: 3 });
    /* Another device bumps the row version mid-bind: our conditional
       update sees a stale updated_at -> conflict -> pushFailed, local
       blob retained for the next mutation to re-merge. */
    remote.setOnUpdate(() => {
      remote.writeRow('acct-1', { ...base, totalStars: 9 });
      remote.setOnUpdate(null);
    });
    await bindEngagement('acct-1');

    /* Local state merged the pulled 5 before the failed push. */
    expect(getState().totalStars).toBe(5);
    writeState({ ...base, totalStars: 6 });
    await flushEngagement();
    expect(remote.store.get('acct-1')?.state).toMatchObject({ totalStars: 9 });
  });
});
