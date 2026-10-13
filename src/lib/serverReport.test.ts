import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMockTrend, fetchWeekMinutes } from './serverReport';
import { todayISO } from './engagement/store';

// kids-UX step 10 (AC-5.2): lib layer mocks the supabase client + session,
// same pattern as classJoin.test.ts / sync.test.ts.

const sessionMock = vi.fn();
const supabaseMock = vi.fn();

vi.mock('./supabase/client', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: () => supabaseMock(),
}));

vi.mock('./auth/practiceAuth', () => ({
  getSession: () => sessionMock(),
}));

const SESSION = { user: { id: 'stu-1' } };

/** Fluent postgrest-builder stand-in: every chained method returns the
 *  builder, and awaiting the chain resolves {data, error} so each query
 *  terminates wherever the code stops chaining (.limit, .in, .is, ...). */
function queryBuilder(result: { data: unknown[] | null; error: { message: string } | null }) {
  const calls: Array<[string, ...unknown[]]> = [];
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gte', 'in', 'is', 'order', 'limit', 'insert']) {
    builder[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (v: unknown) => void) => resolve(result);
  return { builder, calls };
}

let builders: ReturnType<typeof queryBuilder>[];

beforeEach(() => {
  sessionMock.mockReset().mockResolvedValue(SESSION);
  builders = [];
  supabaseMock.mockReset().mockResolvedValue({
    from: (table: string) => {
      const b = queryBuilder({ data: [], error: null });
      b.builder.__table = table;
      builders.push(b);
      return b.builder;
    },
  });
});

function setRows(rows: unknown[] | null, error: { message: string } | null = null) {
  supabaseMock.mockResolvedValue({
    from: () => {
      const b = queryBuilder({ data: rows, error });
      builders.push(b);
      return b.builder;
    },
  });
}

function daysAgoISO(n: number, hour = 12): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 30, 0, 0);
  return d.toISOString();
}

describe('fetchWeekMinutes', () => {
  it('returns ok/empty without a session and never queries', async () => {
    sessionMock.mockResolvedValue(null);
    expect(await fetchWeekMinutes()).toEqual({ status: 'ok', days: [], truncated: false });
    expect(supabaseMock).not.toHaveBeenCalled();
  });

  it('returns ok/empty when supabase is unconfigured (getSupabase rejects)', async () => {
    supabaseMock.mockRejectedValue(new Error('not configured'));
    expect(await fetchWeekMinutes()).toEqual({ status: 'error', days: [], truncated: false });
  });

  it('sums time_used_sec into local-day minutes over the last 7 days', async () => {
    setRows([
      { created_at: daysAgoISO(0), time_used_sec: 600 },
      { created_at: daysAgoISO(0), time_used_sec: 300 },
      { created_at: daysAgoISO(2), time_used_sec: 1800 },
      { created_at: daysAgoISO(10), time_used_sec: 9999 }, // outside window
    ]);
    const out = await fetchWeekMinutes();
    expect(out.status).toBe('ok');
    expect(out.truncated).toBe(false);
    expect(out.days).toHaveLength(7);
    expect(out.days[6]).toEqual({ date: todayISO(), minutes: 15 });
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    expect(out.days[4]).toEqual({ date: todayISO(twoDaysAgo), minutes: 30 });
    // zero-filled empty day
    expect(out.days[5].minutes).toBe(0);
  });

  it('sanitizes rows: null/negative seconds count 0, bad dates are dropped', async () => {
    setRows([
      { created_at: daysAgoISO(0), time_used_sec: null },
      { created_at: daysAgoISO(0), time_used_sec: -50 },
      { created_at: 'not-a-date', time_used_sec: 600 },
      { created_at: daysAgoISO(1), time_used_sec: 'abc' },
      {},
      { created_at: daysAgoISO(0), time_used_sec: 120 },
    ]);
    const out = await fetchWeekMinutes();
    expect(out.days[6]).toEqual({ date: todayISO(), minutes: 2 });
  });

  it('scopes the query to the caller own account', async () => {
    setRows([]);
    await fetchWeekMinutes();
    expect(builders[0].calls).toContainEqual(['eq', 'account_id', 'stu-1']);
  });

  it('honors an explicit studentId (RLS still applies server-side)', async () => {
    setRows([]);
    await fetchWeekMinutes('other-student');
    expect(builders[0].calls).toContainEqual(['eq', 'account_id', 'other-student']);
  });

  it('distinguishes a query error from "no data" and never throws', async () => {
    setRows(null, { message: 'rls denied' });
    const out = await fetchWeekMinutes();
    expect(out.status).toBe('error');
    expect(out.days).toEqual([]);
  });

  it('flags truncation when the row cap is exceeded', async () => {
    const many = Array.from({ length: 501 }, (_, i) => ({
      created_at: daysAgoISO(Math.floor(i / 80), (i % 20) + 1),
      time_used_sec: 60,
    }));
    setRows(many);
    const out = await fetchWeekMinutes();
    expect(out.status).toBe('ok');
    expect(out.truncated).toBe(true);
    // only the capped 500 rows were summed
    const total = out.days.reduce((s, d) => s + d.minutes, 0);
    expect(total).toBe(500);
  });
});

describe('fetchMockTrend', () => {
  it('returns ok/empty for guests', async () => {
    sessionMock.mockResolvedValue(null);
    expect(await fetchMockTrend('grade-3')).toEqual({ status: 'ok', points: [] });
    expect(supabaseMock).not.toHaveBeenCalled();
  });

  it('queries exam programs with form_id IS NULL, returns oldest-first', async () => {
    setRows([]);
    await fetchMockTrend('grade-3');
    const calls = builders[0].calls;
    expect(calls).toContainEqual(['eq', 'account_id', 'stu-1']);
    expect(calls).toContainEqual(['eq', 'grade_id', 'grade-3']);
    expect(calls).toContainEqual(['in', 'program', ['english', 'math', 'science']]);
    expect(calls).toContainEqual(['is', 'form_id', null]);
  });

  it('KUX-4b classifier: mocks need total_questions === examCount (grade-3 = 120)', async () => {
    setRows([
      { created_at: '2026-01-10T08:00:00Z', points: 80, max_points: 100, total_questions: 120, form_id: null },
      { created_at: '2026-01-09T08:00:00Z', points: 99, max_points: 100, total_questions: 20, form_id: null }, // drill
      { created_at: '2026-01-08T08:00:00Z', points: 70, max_points: 100, total_questions: 120, form_id: 'form-9' }, // fixed form (belt)
      { created_at: '2026-01-05T08:00:00Z', points: 50, max_points: 80, total_questions: 120, form_id: null },
    ]);
    const out = await fetchMockTrend('grade-3');
    expect(out.status).toBe('ok');
    expect(out.points).toEqual([
      { takenAt: '2026-01-05T08:00:00Z', scorePct: 63 },
      { takenAt: '2026-01-10T08:00:00Z', scorePct: 80 },
    ]);
  });

  it('uses the per-grade examCount (grade-5 mock = 200 questions)', async () => {
    setRows([
      { created_at: '2026-01-10T08:00:00Z', points: 100, max_points: 160, total_questions: 200, form_id: null },
      { created_at: '2026-01-09T08:00:00Z', points: 50, max_points: 50, total_questions: 160, form_id: null }, // grade-4 shape, not g5
    ]);
    const out = await fetchMockTrend('grade-5');
    expect(out.points).toEqual([{ takenAt: '2026-01-10T08:00:00Z', scorePct: 63 }]);
  });

  it('sanitizes: drops rows with max_points <= 0 or missing fields, clamps 0..100', async () => {
    setRows([
      { created_at: '2026-01-10T08:00:00Z', points: 150, max_points: 100, total_questions: 120, form_id: null },
      { created_at: '2026-01-09T08:00:00Z', points: 10, max_points: 0, total_questions: 120, form_id: null },
      { created_at: '2026-01-08T08:00:00Z', points: null, max_points: 100, total_questions: 120, form_id: null },
      { points: 50, max_points: 100, total_questions: 120, form_id: null },
      { created_at: '2026-01-07T08:00:00Z', points: -5, max_points: 100, total_questions: 120, form_id: null },
    ]);
    const out = await fetchMockTrend('grade-3');
    expect(out.points).toEqual([
      { takenAt: '2026-01-07T08:00:00Z', scorePct: 0 },
      { takenAt: '2026-01-10T08:00:00Z', scorePct: 100 },
    ]);
  });

  it('distinguishes a query error from "no data" and never throws', async () => {
    setRows(null, { message: 'network' });
    expect(await fetchMockTrend('grade-3')).toEqual({ status: 'error', points: [] });
    supabaseMock.mockRejectedValue(new Error('down'));
    expect(await fetchMockTrend('grade-3')).toEqual({ status: 'error', points: [] });
  });
});
