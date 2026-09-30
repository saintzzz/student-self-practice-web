import { getSupabase } from './supabase/client';
import { getSession } from './auth/practiceAuth';
import type { BatchResult } from './batch/batchSession';

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
    });
  } catch {
    // Luu ket qua la nen - khong bao gio lam gian doan flow choi.
  }
}

/** Ket qua kem ten hoc sinh - admin doc duoc nho RLS results_admin_all. */
export interface ResultWithStudent extends PracticeResultRow {
  accounts: { username: string; display_name: string } | null;
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
