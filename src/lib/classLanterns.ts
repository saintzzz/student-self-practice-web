import { getSupabase } from './supabase/client';
import { getSession } from './auth/practiceAuth';

export interface ClassLanterns {
  className: string;
  members: number;
  lanterns: number;
  goal: number;
  met: boolean;
}

/** ISO week key `YYYY-Www` - scopes the once-per-week sticker grant. */
export function isoWeekKey(d = new Date()): string {
  const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = (day.getUTCDay() + 6) % 7; // Mon=0
  day.setUTCDate(day.getUTCDate() - dow + 3); // Thursday of this week
  const firstThu = new Date(Date.UTC(day.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round((day.getTime() - firstThu.getTime()) / (7 * 86400_000));
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
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
    const row = data[0] as { class_name: string; members: number; lanterns: number; goal: number; met: boolean };
    return { className: row.class_name, members: row.members, lanterns: row.lanterns, goal: row.goal, met: row.met };
  } catch {
    return null;
  }
}
