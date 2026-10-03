import { getSupabase } from './supabase/client';
import { getSession } from './auth/practiceAuth';

export interface LeaderboardEntry {
  rank: number;
  display_name: string;
  weekly_points: number;
  weekly_correct: number;
  is_me: boolean;
}

/**
 * CR-30: weekly leaderboard per grade via the aggregate-only
 * weekly_leaderboard rpc. Returns null for guests and on error - the
 * caller renders a lock/empty state, never throws.
 */
export async function fetchLeaderboard(gradeId: string, limit = 10): Promise<LeaderboardEntry[] | null> {
  try {
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await (await getSupabase()).rpc('weekly_leaderboard', {
      p_grade_id: gradeId,
      p_limit: limit,
    });
    if (error) return null;
    return (data ?? []) as LeaderboardEntry[];
  } catch {
    return null;
  }
}
