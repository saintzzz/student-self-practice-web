/**
 * kids-UX step 10 (R5 / AC-5.2): server-sourced sections of the parent
 * report ("Góc ba mẹ"). Both fetchers read `practice.results` - the table
 * every batch/exam/placement completion already writes (practiceResults.ts)
 * - under the existing `results_self_read` RLS policy, so the student can
 * only ever read their own rows and an explicit `account_id` filter is a
 * defence-in-depth second line.
 *
 * Minutes derivation: the schema has no session start/end rows - the only
 * duration signal is `results.time_used_sec` (seconds per completed
 * activity, CR-52; null on pre-CR-52 rows -> counted as 0). A day's minutes
 * are `sum(time_used_sec) / 60` bucketed by the device's LOCAL calendar
 * day (todayISO), matching the streak/day logic in engagement/store.ts.
 *
 * Mock classifier (ADR KUX-4b): `saveExamResult` writes `program` for BOTH
 * drills and mocks, so program alone cannot tell them apart. A mock row is
 * `form_id IS NULL` (fixed assessment forms replay, not mocks) AND
 * `total_questions === examConfigForGrade(gradeId).examCount` (drills write
 * their drillCount instead). Same predicate as migration 0039's
 * practice.is_mock_result - keep them in sync.
 *
 * Every export is a no-op for guests / unconfigured Supabase and never
 * throws. Errors are distinguishable from "no data" ('error' vs 'ok' with
 * empty items) so the report can show a retry state instead of pretending
 * a failed query means an inactive child (fail-closed, not fail-silent).
 */
import { getSupabase } from './supabase/client';
import { getSession } from './auth/practiceAuth';
import { todayISO } from './engagement/store';
import { examConfigForGrade } from './exam/examSession';

export interface DayMinutes {
  /** Local calendar day, ISO YYYY-MM-DD. */
  date: string;
  /** Whole minutes practiced that day (0 included - empty days render 0-height bars). */
  minutes: number;
}

export interface MockTrendPoint {
  /** ISO timestamp of the mock-exam result. */
  takenAt: string;
  /** 0..100, points / max_points. */
  scorePct: number;
}

export interface WeekMinutesResult {
  status: 'ok' | 'error';
  days: DayMinutes[];
  /** true when the 500-row scan cap was hit - the week may be partial. */
  truncated: boolean;
}

export interface MockTrendResult {
  status: 'ok' | 'error';
  points: MockTrendPoint[];
}

const WEEK_DAYS = 7;
const TREND_LIMIT = 10;
/** practice.results.program CHECK constraint: 'batch' | 'english' | 'math' | 'science'. */
const EXAM_PROGRAMS = ['english', 'math', 'science'] as const;
/** A hard ceiling on rows scanned client-side; a child doing 500+
 *  activities in a week is far outside the product envelope. */
const WEEK_ROW_CAP = 500;
/** Over-fetch for the trend: drills/forms share `program`, so the mock
 *  classifier needs a wider newest-first window to find real mocks. */
const TREND_ROW_CAP = 60;

function toFiniteSeconds(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Last `WEEK_DAYS` local calendar days ending today, oldest first. */
function lastWeekDays(now: Date): string[] {
  const days: string[] = [];
  for (let i = WEEK_DAYS - 1; i >= 0; i -= 1) {
    days.push(todayISO(new Date(now.getTime() - i * 86_400_000)));
  }
  return days;
}

/**
 * Minutes practiced per local day for the last 7 days (oldest first,
 * zero-filled). `studentId` defaults to the signed-in user; passing an
 * explicit id lets a future parent-of-child view reuse the fetcher, while
 * RLS keeps the rows scoped to what the caller may see.
 */
export async function fetchWeekMinutes(studentId?: string, now: Date = new Date()): Promise<WeekMinutesResult> {
  const empty: WeekMinutesResult = { status: 'ok', days: [], truncated: false };
  try {
    const session = await getSession();
    const uid = studentId ?? session?.user?.id;
    if (!uid) return empty;
    const days = lastWeekDays(now);
    const oldest = days[0];
    // Query lower bound: local-midnight of the oldest day, widened by 12h
    // so the UTC cutoff never clips an early-morning local day in any
    // timezone we ship to.
    const since = new Date(`${oldest}T00:00:00`);
    since.setHours(since.getHours() - 12);
    const { data, error } = await (await getSupabase())
      .from('results')
      .select('created_at, time_used_sec')
      .eq('account_id', uid)
      .gte('created_at', since.toISOString())
      /* dev-review r2 #4: newest-first keeps the most RECENT 500 rows -
         the truncated notice ("phần gần nhất") then tells the truth. */
      .order('created_at', { ascending: false })
      .limit(WEEK_ROW_CAP + 1);
    if (error) return { status: 'error', days: [], truncated: false };

    const rows = data ?? [];
    const truncated = rows.length > WEEK_ROW_CAP;
    const secondsByDay = new Map<string, number>();
    for (const row of rows.slice(0, WEEK_ROW_CAP)) {
      const stamp = typeof row?.created_at === 'string' ? row.created_at : '';
      const ms = Date.parse(stamp);
      if (!Number.isFinite(ms)) continue; // sanitize: drop unparseable rows
      const day = todayISO(new Date(ms));
      secondsByDay.set(day, (secondsByDay.get(day) ?? 0) + toFiniteSeconds(row.time_used_sec));
    }
    return {
      status: 'ok',
      truncated,
      days: days.map((date) => ({
        date,
        minutes: Math.round((secondsByDay.get(date) ?? 0) / 60),
      })),
    };
  } catch {
    return { status: 'error', days: [], truncated: false };
  }
}

/**
 * Last `limit` mock-exam results for a grade, oldest first so the caller
 * can draw a left-to-right trend. Drills and fixed assessment forms are
 * filtered out by the KUX-4b classifier (see file header). Guests and
 * unconfigured Supabase resolve to an empty ok result; query failures
 * resolve status 'error' so the UI can offer a retry instead of silently
 * showing "no data".
 */
export async function fetchMockTrend(gradeId: string, limit = TREND_LIMIT): Promise<MockTrendResult> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { status: 'ok', points: [] };
    const examCount = examConfigForGrade(gradeId).examCount;
    const { data, error } = await (await getSupabase())
      .from('results')
      .select('created_at, points, max_points, total_questions, form_id')
      .eq('account_id', session.user.id)
      .eq('grade_id', gradeId)
      .in('program', [...EXAM_PROGRAMS])
      .is('form_id', null)
      .order('created_at', { ascending: false })
      .limit(TREND_ROW_CAP);
    if (error) return { status: 'error', points: [] };

    const points: MockTrendPoint[] = [];
    for (const row of data ?? []) {
      // KUX-4b classifier: only true mocks - full-length exams, not drills
      // (drillCount) and not fixed assessment forms. The form_id check
      // repeats the .is('form_id', null) filter client-side so a null-ish
      // serialisation quirk can never mix a belt form into the trend.
      if (row?.form_id !== null && row?.form_id !== undefined) continue;
      if (Number(row?.total_questions) !== examCount) continue;
      const takenAt = typeof row?.created_at === 'string' ? row.created_at : '';
      // null/undefined are "no data", not a 0 score - Number(null) === 0
      // would silently inject fake 0% dips into the trend.
      if (row?.points === null || row?.points === undefined || row?.max_points === null || row?.max_points === undefined) continue;
      const points_ = Number(row.points);
      const max = Number(row.max_points);
      if (!takenAt || !Number.isFinite(points_) || !Number.isFinite(max) || max <= 0) continue;
      points.push({ takenAt, scorePct: Math.min(100, Math.max(0, Math.round((points_ / max) * 100))) });
      if (points.length >= limit) break;
    }
    // newest-first -> chronological for the chart.
    return { status: 'ok', points: points.reverse() };
  } catch {
    return { status: 'error', points: [] };
  }
}
