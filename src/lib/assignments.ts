/** CR-98: class assignments - typed RPC wrappers (arenaLive pattern).
 *  Server re-checks role/enrollment/ownership in every RPC. */

import { getSupabase } from './supabase/client';

export type AssignmentState = 'upcoming' | 'open' | 'in_progress' | 'done' | 'late-open' | 'closed';

export interface InboxItem {
  assignmentId: string;
  title: string;
  className: string;
  formId: string;
  gradeId: string;
  programId: string;
  opensAt: string;
  dueAt: string;
  state: AssignmentState;
  score: number | null;
  total: number | null;
  late: boolean | null;
  submittedAt: string | null;
}

export interface TakeResult {
  formId: string;
  gradeId: string;
  programId: string;
  questionCount: number;
  state: 'open' | 'done';
}

export interface ListRow {
  id: string;
  title: string;
  formId: string;
  gradeId: string;
  programId: string;
  opensAt: string;
  dueAt: string;
  status: string;
  submitted: number;
  started: number;
  roster: number;
}

export interface ReportRosterRow {
  student_name: string;
  student_id: string;
  started_at: string | null;
  submitted_at: string | null;
  score: number | null;
  total: number | null;
  time_sec: number | null;
  late: boolean | null;
}

export interface ReportQuestionRow {
  q_id: string;
  skill: string | null;
  topic_key: string | null;
  accuracy: number;
  attempts: number;
}

export interface AssignmentReport {
  assignment: { id: string; title: string; due_at: string; status: string };
  roster: ReportRosterRow[];
  questions: ReportQuestionRow[];
}

const msg = (e: unknown): string =>
  e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : 'unknown';

export async function assignmentCreate(
  classId: string,
  title: string,
  gradeId: string,
  programId: string,
  questionCount: number,
  dueAt: string,
): Promise<{ id: string } | { error: string }> {
  try {
    const { data, error } = await (await getSupabase()).rpc('assignment_create', {
      p_class_id: classId,
      p_title: title,
      p_grade_id: gradeId,
      p_program_id: programId,
      p_question_count: questionCount,
      p_due_at: dueAt,
    });
    if (error) return { error: msg(error) };
    return { id: String(data) };
  } catch (e) {
    return { error: msg(e) };
  }
}

/** Resolve the client; null = unconfigured/guest (a legitimate empty
 *  result, not an error). The `rpc` typeof check also keeps older test
 *  mocks that return a bare undefined client safe. */
async function tryClient(): Promise<{ rpc: (fn: string, args?: Record<string, unknown>) => Promise<unknown> } | null> {
  try {
    const supa = (await getSupabase()) as { rpc?: unknown } | null | undefined;
    return supa && typeof supa.rpc === 'function' ? (supa as never) : null;
  } catch {
    return null;
  }
}

/** Fail-closed list reads: RPC errors surface as `error`, while
 *  unconfigured/guest returns empty with error null. */
export async function assignmentList(classId: string): Promise<{ rows: ListRow[]; error: string | null }> {
  const supa = await tryClient();
  if (!supa) return { rows: [], error: null };
  try {
    const { data, error } = (await supa.rpc('assignment_list', { p_class_id: classId })) as { data: unknown; error: { message?: string } | null };
    if (error) return { rows: [], error: msg(error) };
    return {
      rows: ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        id: String(r.id),
        title: String(r.title),
        formId: String(r.form_id),
        gradeId: String(r.grade_id),
        programId: String(r.program_id),
        opensAt: String(r.opens_at),
        dueAt: String(r.due_at),
        status: String(r.status),
        submitted: Number(r.submitted),
        started: Number(r.started),
        roster: Number(r.roster),
      })),
      error: null,
    };
  } catch (e) {
    return { rows: [], error: msg(e) };
  }
}

export async function assignmentInbox(): Promise<{ items: InboxItem[]; error: string | null }> {
  const supa = await tryClient();
  if (!supa) return { items: [], error: null };
  try {
    const { data, error } = (await supa.rpc('assignment_inbox')) as { data: unknown; error: { message?: string } | null };
    if (error) return { items: [], error: msg(error) };
    return {
      items: ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        assignmentId: String(r.assignment_id),
        title: String(r.title),
        className: String(r.class_name),
        formId: String(r.form_id),
        gradeId: String(r.grade_id),
        programId: String(r.program_id),
        opensAt: String(r.opens_at),
        dueAt: String(r.due_at),
        state: String(r.state) as AssignmentState,
        score: r.score === null ? null : Number(r.score),
        total: r.total === null ? null : Number(r.total),
        late: r.late === null ? null : Boolean(r.late),
        submittedAt: r.submitted_at === null ? null : String(r.submitted_at),
      })),
      error: null,
    };
  } catch (e) {
    return { items: [], error: msg(e) };
  }
}

export async function assignmentTake(assignmentId: string): Promise<TakeResult | { error: string }> {
  let data: unknown, error: unknown;
  try {
    ({ data, error } = await (await getSupabase()).rpc('assignment_take', {
      p_assignment_id: assignmentId,
    }));
  } catch (e) {
    return { error: msg(e) };
  }
  if (error) return { error: msg(error) };
  const row = (data as Record<string, unknown>[])?.[0];
  if (!row) return { error: 'empty' };
  return {
    formId: String(row.form_id),
    gradeId: String(row.grade_id),
    programId: String(row.program_id),
    questionCount: Number(row.question_count),
    state: row.state === 'done' ? 'done' : 'open',
  };
}

export async function assignmentSubmit(
  assignmentId: string,
  payload: { score: number; total: number; timeSec: number; answers: { q_id: string; correct: boolean }[]; snapshot?: unknown },
): Promise<{ id: string } | { error: string }> {
  try {
    const { data, error } = await (await getSupabase()).rpc('assignment_submit', {
      p_assignment_id: assignmentId,
      p_score: payload.score,
      p_total: payload.total,
      p_time_sec: payload.timeSec,
      p_answers: payload.answers,
      p_snapshot: payload.snapshot ?? null,
    });
    if (error) return { error: msg(error) };
    return { id: String(data) };
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function assignmentReport(assignmentId: string): Promise<{ data: AssignmentReport | null; error: string | null }> {
  const supa = await tryClient();
  if (!supa) return { data: null, error: null };
  try {
    const { data, error } = (await supa.rpc('assignment_report', {
      p_assignment_id: assignmentId,
    })) as { data: unknown; error: { message?: string } | null };
    if (error) return { data: null, error: msg(error) };
    return { data: (data ?? null) as AssignmentReport | null, error: null };
  } catch (e) {
    return { data: null, error: msg(e) };
  }
}

export async function assignmentClose(assignmentId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await (await getSupabase()).rpc('assignment_close', {
      p_assignment_id: assignmentId,
    });
    return error ? { ok: false, error: msg(error) } : { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export async function assignmentRemediate(assignmentId: string, dueAt: string): Promise<{ id: string } | { error: string }> {
  try {
    const { data, error } = await (await getSupabase()).rpc('assignment_remediate', {
      p_assignment_id: assignmentId,
      p_due_at: dueAt,
    });
    if (error) return { error: msg(error) };
    return { id: String(data) };
  } catch (e) {
    return { error: msg(e) };
  }
}
