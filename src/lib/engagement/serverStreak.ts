import { useEffect, useState } from 'react';
import { getSupabase } from '../supabase/client';
import { getSession } from '../auth/practiceAuth';

/**
 * CR-138 (edu-research W46/W47): server-truth streak + daily goal.
 * `practice.streak_status()` derives the streak from practice.results
 * (completed rounds) and goal progress from qb_attempt_events, so the
 * streak survives devices and is teacher/parent-visible later.
 *
 * Guests and any error fall back to the localStorage streak - callers
 * render `srv?.streak ?? getState().streak.count`. Duolingo's findings
 * baked into the RPC: streak extends on ANY 1 completed round (never
 * gated on the goal) and one missed weekend day per ISO week is
 * forgiven (amulet).
 */

export interface ServerStreak {
  streak: number;
  /** A round already completed today - the streak is safe. */
  todayDone: boolean;
  /** Rounds completed today; 1 = this session's round earned the day. */
  roundsToday: number;
  goalDone: number;
  goalTarget: number;
}

/** Streak earns its celebration moment only on the day it was extended
 *  and only at the loss-aversion milestones: day 3, then every 7 days. */
export function isStreakMilestone(s: ServerStreak | null): boolean {
  return !!s && s.roundsToday === 1 && s.streak >= 3
    && (s.streak === 3 || s.streak % 7 === 0);
}

let cache: ServerStreak | null | undefined; // undefined = not fetched yet
const listeners = new Set<() => void>();

export async function fetchServerStreak(): Promise<ServerStreak | null> {
  try {
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await (await getSupabase()).rpc('streak_status');
    if (error || !data) return null;
    const row = (typeof data === 'string' ? JSON.parse(data) : data) as Record<string, unknown>;
    return {
      streak: Number(row.streak) || 0,
      todayDone: row.today_done === true,
      roundsToday: Number(row.rounds_today) || 0,
      goalDone: Number(row.goal_done) || 0,
      goalTarget: Number(row.goal_target) || 5,
    };
  } catch {
    return null;
  }
}

/** Re-read after a completed round - the save must land first, so
 *  callers chain this off savePracticeResult/saveExamResult. */
export async function refreshServerStreak(): Promise<void> {
  cache = await fetchServerStreak();
  listeners.forEach((l) => l());
}

export function useServerStreak(): ServerStreak | null {
  const [s, setS] = useState<ServerStreak | null>(cache ?? null);
  useEffect(() => {
    const listener = () => setS(cache ?? null);
    listeners.add(listener);
    if (cache === undefined) void refreshServerStreak();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return s;
}
