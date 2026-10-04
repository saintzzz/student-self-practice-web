import { getSupabase } from './supabase/client';
import { getSession } from './auth/practiceAuth';
import { hashString } from './prng';

/** CR-34: Arena 1v1 - async same-seed challenges.
 *  Every wrapper returns null on error/guest so the UI renders a
 *  graceful empty state and never throws into the play flow. */

export interface ArenaOpenChallenge {
  id: string;
  creator_name: string;
  creator_score: number;
  creator_time_ms: number;
  program_id: string;
  seed: string;
  created_at: string;
  /** CR-56: true when the viewer posted this challenge - render "waiting"
   *  instead of an accept button (you cannot accept your own). */
  i_created: boolean;
}

export interface ArenaDuelResult {
  my_score: number;
  my_time_ms: number;
  opp_name: string;
  opp_score: number;
  opp_time_ms: number;
  i_won: boolean;
  is_draw: boolean;
}

export interface ArenaRecentRow {
  id: string;
  creator_name: string;
  creator_score: number;
  creator_time_ms: number;
  opponent_name: string;
  opponent_score: number;
  opponent_time_ms: number;
  i_created: boolean;
  i_won: boolean;
  is_draw: boolean;
  finished_at: string;
}

export async function arenaCreate(
  seed: string,
  gradeId: string,
  programId: string,
  score: number,
  timeMs: number,
): Promise<string | null> {
  try {
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await (await getSupabase()).rpc('arena_create', {
      p_seed: seed,
      p_grade_id: gradeId,
      p_program_id: programId,
      p_score: score,
      p_time_ms: timeMs,
    });
    if (error) return null;
    return data as string;
  } catch {
    return null;
  }
}

export async function arenaOpen(gradeId: string): Promise<ArenaOpenChallenge[] | null> {
  try {
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await (await getSupabase()).rpc('arena_open', {
      p_grade_id: gradeId,
    });
    if (error) return null;
    return (data ?? []) as ArenaOpenChallenge[];
  } catch {
    return null;
  }
}

export async function arenaAccept(
  id: string,
  score: number,
  timeMs: number,
): Promise<ArenaDuelResult | null> {
  try {
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await (await getSupabase()).rpc('arena_accept', {
      p_id: id,
      p_score: score,
      p_time_ms: timeMs,
    });
    if (error || !data?.length) return null;
    return data[0] as ArenaDuelResult;
  } catch {
    return null;
  }
}

export async function arenaRecent(gradeId: string): Promise<ArenaRecentRow[] | null> {
  try {
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await (await getSupabase()).rpc('arena_recent', {
      p_grade_id: gradeId,
    });
    if (error) return null;
    return (data ?? []) as ArenaRecentRow[];
  } catch {
    return null;
  }
}

/** Guest "Đấu với máy": deterministic bot ghost derived from the seed so a
 *  replayed seed always races the same bot. Score/time stay inside a
 *  plausible grade-school band - hard enough to feel real, never impossible. */
export function botGhost(seed: string, maxScore: number): { name: string; score: number; timeMs: number } {
  const BOT_NAMES = ['Tí Hon', 'Mèo Mun', 'Sóc Nâu', 'Thỏ Trắng', 'Cá Voi Xanh'];
  const name = BOT_NAMES[hashString(`${seed}-name`) % BOT_NAMES.length];
  const score = Math.round((0.45 + (hashString(`${seed}-score`) % 45) / 100) * maxScore);
  const timeMs = 90_000 + (hashString(`${seed}-time`) % 150_000);
  return { name, score, timeMs };
}
