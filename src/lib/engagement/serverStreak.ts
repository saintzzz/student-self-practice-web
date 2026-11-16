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

/* r204-1: the cache is keyed by the signed-in uid - an account switch
   must never show the previous user's streak, even for one paint.
   `cacheUid` stays undefined until the first session check. */
let cacheUid: string | null | undefined;
let cache: ServerStreak | null | undefined; // undefined = not fetched yet
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

async function ensureFresh(): Promise<void> {
  const session = await getSession().catch(() => null);
  const uid = session?.user?.id ?? null;
  if (cacheUid === uid && cache !== undefined) {
    notify(); // a new mount starts at null - serve the verified cache.
    return;
  }
  // Clear BEFORE the fetch so the other user's streak never renders
  // while the new one is in flight.
  cacheUid = uid;
  cache = null;
  notify();
  const value = uid ? await fetchForUid(uid) : null;
  // r206-3: a session change during the fetch must not let the late
  // response repopulate the cache under the OLD uid.
  if (cacheUid === uid) cache = value;
  notify();
}

/* r207-1: the caller captured the uid BEFORE this fetch; re-verify the
   session still belongs to that uid right before the rpc so a mid-flight
   account switch can never cache the new user's streak under the old uid. */
async function fetchForUid(uid: string): Promise<ServerStreak | null> {
  try {
    const session = await getSession();
    if (session?.user?.id !== uid) return null;
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

export async function fetchServerStreak(): Promise<ServerStreak | null> {
  const session = await getSession().catch(() => null);
  const uid = session?.user?.id;
  return uid ? fetchForUid(uid) : null;
}

/** Re-read after a completed round - the save must land first, so
 *  callers chain this off savePracticeResult/saveExamResult. */
export async function refreshServerStreak(): Promise<void> {
  const session = await getSession().catch(() => null);
  const uid = session?.user?.id ?? null;
  cacheUid = uid;
  const value = uid ? await fetchForUid(uid) : null;
  // r206-3: apply only if the uid captured before the fetch still holds.
  if (cacheUid === uid) {
    cache = value;
    notify();
  }
}

export function useServerStreak(): ServerStreak | null {
  /* r206-1: start null - the global cache is only served AFTER the
     session uid is verified, so a remount can never paint the previous
     user's streak for even one frame. */
  const [s, setS] = useState<ServerStreak | null>(null);
  useEffect(() => {
    const listener = () => setS(cache ?? null);
    listeners.add(listener);
    void ensureFresh();
    /* r206-2: a mounted hook must survive live account switches - re-run
       the uid check on every auth event. Subscribes through the client
       (not practiceAuth.onAuthChange) so partial test mocks degrade to
       no subscription instead of a TypeError. */
    let sub: { unsubscribe: () => void } | undefined;
    let mounted = true;
    try {
      Promise.resolve(getSupabase())
        .then((supa) => supa?.auth?.onAuthStateChange?.(() => void ensureFresh()))
        .then((res) => {
          /* r207-2: cleanup may run before the client resolves - drop a
             subscription that arrives after unmount instead of leaking it. */
          if (mounted) sub = res?.data?.subscription;
          else res?.data?.subscription?.unsubscribe?.();
        })
        .catch(() => { /* guest-only/test env: no session, no switches */ });
    } catch {
      /* fully-mocked modules can throw synchronously too */
    }
    return () => {
      mounted = false;
      listeners.delete(listener);
      sub?.unsubscribe();
    };
  }, []);
  return s;
}
