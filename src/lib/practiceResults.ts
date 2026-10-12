import { getSupabase } from './supabase/client';
import { getSession } from './auth/practiceAuth';
import type { BatchResult } from './batch/batchSession';
import type { ExamProgramId } from '../types/exam';
import { EXAM_POINTS_PER_QUESTION } from './exam/examSession';

// r16 result-owner-binding: a completed run belongs to the identity
// that STARTED the activity. A mid-activity identity change (second-tab
// login, account switch, or a login during a guest run) must never
// attribute the result to a different account. Callers bind the owner
// once at activity start (exam mount, batch create, placement mount).
// undefined = no bind happened (legacy call site) -> save-time session
// decides, as before.
let activityOwner: string | null | undefined;

export async function bindActivityOwner(): Promise<void> {
  activityOwner = (await getSession().catch(() => null))?.user?.id ?? null;
}

export function clearActivityOwner(): void {
  activityOwner = undefined;
}

function ownerMismatch(session: { user?: { id?: string } | null } | null): boolean {
  return activityOwner !== undefined && (session?.user?.id ?? null) !== activityOwner;
}

export interface PracticeResultRow {
  id: string;
  account_id: string;
  grade_id: string;
  points: number;
  max_points: number;
  correct_count: number;
  total_questions: number;
  rounds_completed: number;
  /** CR-52: giay lam bai - null cho cac row truoc CR-52. */
  time_used_sec: number | null;
  created_at: string;
}

/** Luu ket qua batch vao practice.results - no-op cho guest (chua login). */
export async function savePracticeResult(gradeId: string, result: BatchResult): Promise<void> {
  try {
    const session = await getSession();
    if (!session || ownerMismatch(session)) return;
    const { error: rErr } = await (await getSupabase()).from('results').insert({
      account_id: session.user.id,
      grade_id: gradeId,
      points: result.points,
      max_points: result.maxPoints,
      correct_count: result.totalCorrect,
      total_questions: result.totalQuestions,
      rounds_completed: result.rounds.length,
      time_used_sec: result.timeUsedSec,
      program: 'batch',
    });
    // Supabase insert resolve {error} chu khong throw - phai bind de khoi
    // im lang mat ket qua; van best-effort (warn, khong break flow).
    if (rErr) console.warn('[practice] save result:', rErr.message);
  } catch {
    // Luu ket qua la nen - khong bao gio lam gian doan flow choi.
  }
}

/** CR-30: luu ket qua Luyen de / Thi thu - leaderboard counts these too. */
export async function saveExamResult(
  gradeId: string,
  programId: ExamProgramId,
  result: { points: number; totalCount: number; correctCount: number; timeUsedSec: number },
  /** CR-49: V6 form snapshot - replay/re-grade dung bo cau da thi. */
  snapshot?: { formId?: string; questionIds?: string[] },
): Promise<void> {
  try {
    const session = await getSession();
    if (!session || ownerMismatch(session)) return;
    const { error: rErr } = await (await getSupabase()).from('results').insert({
      account_id: session.user.id,
      grade_id: gradeId,
      points: result.points,
      max_points: result.totalCount * EXAM_POINTS_PER_QUESTION,
      correct_count: result.correctCount,
      total_questions: result.totalCount,
      rounds_completed: 1,
      time_used_sec: result.timeUsedSec,
      program: programId,
      form_id: snapshot?.formId ?? null,
      question_snapshot: snapshot?.questionIds?.length
        ? { questionIds: snapshot.questionIds }
        : null,
    });
    if (rErr) console.warn('[practice] save exam result:', rErr.message);
  } catch {
    // Best-effort - never break the exam flow over a stats insert.
  }
}

/** Ket qua kem ten hoc sinh - admin doc duoc nho RLS results_admin_all. */
export interface ResultWithStudent extends PracticeResultRow {
  accounts: { username: string; display_name: string } | null;
}

/** Luu ket qua bai placement: cap nhat accounts.placement_grade + 1 row results. */
export async function savePlacementResult(
  gradeId: string,
  correctCount: number,
  totalQuestions: number,
): Promise<void> {
  try {
    const session = await getSession();
    if (!session || ownerMismatch(session)) return;
    const supa = await getSupabase();
    const { error: plErr } = await supa.rpc('set_my_placement', { g: gradeId });
    if (plErr) console.warn('[practice] set placement:', plErr.message);
    const { error: rErr } = await supa.from('results').insert({
      account_id: session.user.id,
      grade_id: gradeId,
      points: 0,
      max_points: 1,
      correct_count: correctCount,
      total_questions: totalQuestions,
      rounds_completed: 1,
    });
    if (rErr) console.warn('[practice] placement result:', rErr.message);
  } catch {
    // Placement save la nen - khong lam gian doan flow.
  }
}

export async function fetchRecentResults(limit = 300): Promise<ResultWithStudent[]> {
  const { data, error } = await (await getSupabase())
    .from('results')
    .select('*, accounts(username, display_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as ResultWithStudent[];
}
