import { getSupabase } from './supabase/client';
import { getSession } from './auth/practiceAuth';

export interface ClassLanterns {
  className: string;
  members: number;
  lanterns: number;
  goal: number;
  met: boolean;
  /** Server-side ISO week key - scopes the once-per-week sticker grant
   *  so it can never drift from the aggregate's week boundary (r250). */
  isoWeek: string;
}

/**
 * CR-149 (P1-8): class co-op weekly lantern total via the aggregate-only
 * class_week_lanterns rpc (migration 0083). Returns null for guests,
 * students with no class, and on error - the caller renders nothing.
 */
export async function fetchClassLanterns(): Promise<ClassLanterns | null> {
  try {
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await (await getSupabase()).rpc('class_week_lanterns');
    if (error || !data?.length) return null;
    const row = data[0] as { class_name: string; members: number; lanterns: number; goal: number; met: boolean; iso_week: string };
    return { className: row.class_name, members: row.members, lanterns: row.lanterns, goal: row.goal, met: row.met, isoWeek: row.iso_week };
  } catch {
    return null;
  }
}
