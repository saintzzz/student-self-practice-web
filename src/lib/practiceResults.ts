import { getSupabase } from './supabase/client';
import { getSession } from './auth/practiceAuth';
import type { BatchResult } from './batch/batchSession';
import type { ExamProgramId } from '../types/exam';
import { EXAM_POINTS_PER_QUESTION } from './exam/examSession';

export interface PracticeResultRow {
  id: string;
  account_id: string;
  grade_id: string;
  points: number;
  max_points: number;
  correct_count: number;
  total_questions: number;
  rounds_completed: number;
  created_at: string;
}

/** Luu ket qua batch vao practice.results - no-op cho guest (chua login). */
export async function savePracticeResult(gradeId: string, result: BatchResult): Promise<void> {
  try {
    const session = await getSession();
    if (!session) return;
    await (await getSupabase()).from('results').insert({
      account_id: session.user.id,
      grade_id: gradeId,
      points: result.points,
      max_points: result.maxPoints,
      correct_count: result.totalCorrect,
      total_questions: result.totalQuestions,
      rounds_completed: result.rounds.length,
      program: 'batch',
    });
  } catch {
    // Luu ket qua la nen - khong bao gio lam gian doan flow choi.
  }
}

/** CR-30: luu ket qua Luyen de / Thi thu - leaderboard counts these too. */
export async function saveExamResult(
  gradeId: string,
  programId: ExamProgramId,
  result: { points: number; totalCount: number; correctCount: number },
): Promise<void> {
  try {
    const session = await getSession();
    if (!session) return;
    await (await getSupabase()).from('results').insert({
      account_id: session.user.id,
      grade_id: gradeId,
      points: result.points,
      max_points: result.totalCount * EXAM_POINTS_PER_QUESTION,
      correct_count: result.correctCount,
      total_questions: result.totalCount,
      rounds_completed: 1,
      program: programId,
    });
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
    if (!session) return;
    const supa = await getSupabase();
    await supa.rpc('set_my_placement', { g: gradeId });
    await supa.from('results').insert({
      account_id: session.user.id,
      grade_id: gradeId,
      points: 0,
      max_points: 1,
      correct_count: correctCount,
      total_questions: totalQuestions,
      rounds_completed: 1,
    });
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
