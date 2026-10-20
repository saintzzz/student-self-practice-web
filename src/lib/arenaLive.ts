import { getSupabase } from './supabase/client';
import { getSession } from './auth/practiceAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

/** CR-97: Arena live race - real-time N-player duels on one seed.
 *  RPCs persist room membership + final results; the lobby roster rides
 *  Realtime presence and in-race progress rides broadcast (ephemeral -
 *  nothing per-answer hits the DB). Every wrapper returns null on
 *  error/guest so the UI falls back to the graceful offline path. */

export interface LivePlayer {
  id: string;
  name: string;
  score: number | null;
  timeMs: number | null;
  finished: boolean;
}

export interface LiveRoom {
  id: string;
  code: string;
  seed: string;
  status: 'waiting' | 'racing' | 'done';
  hostName: string;
  /** auth.users id of the host - names collide, ids do not. */
  hostId: string;
  /** Authoritative exam config - joiners race the HOST's grade/program,
   *  not whatever hub tile they happened to open the lobby from. */
  gradeId: string;
  programId: string;
}

type LiveEvent =
  | { type: 'start' }
  | { type: 'progress'; id: string; name: string; q: number; score: number }
  | { type: 'finish'; id: string; name: string; score: number; timeMs: number }
  | { type: 'leave'; id: string };

export interface LiveHandlers {
  onRoster?: (players: LivePlayer[]) => void;
  onStart?: () => void;
  onProgress?: (p: { id: string; name: string; q: number; score: number }) => void;
  onFinish?: (p: { id: string; name: string; score: number; timeMs: number }) => void;
  onLeave?: (id: string) => void;
}

export async function liveRoomCreate(gradeId: string, programId: string): Promise<LiveRoom | null> {
  try {
    if (!(await getSession())) return null;
    const { data, error } = await (await getSupabase()).rpc('arena_live_create', {
      p_grade_id: gradeId,
      p_program_id: programId,
      p_question_count: 10,
    });
    if (error || !data?.length) return null;
    // The creator IS the host - joiners get host_id from the join RPC.
    const uid = (await getSession())?.user?.id ?? '';
    return { id: data[0].room_id, code: data[0].code, seed: data[0].seed, status: 'waiting', hostName: '', hostId: uid, gradeId, programId };
  } catch {
    return null;
  }
}

export async function liveRoomJoin(code: string): Promise<LiveRoom | null> {
  try {
    if (!(await getSession())) return null;
    const { data, error } = await (await getSupabase()).rpc('arena_live_join', { p_code: code });
    if (error || !data?.length) return null;
    return {
      id: data[0].room_id,
      code: code.trim().toUpperCase(),
      seed: data[0].seed,
      status: data[0].status,
      hostName: data[0].host_name ?? '',
      hostId: data[0].host_id ?? '',
      gradeId: data[0].grade_id ?? 'grade-2',
      programId: data[0].program_id ?? 'english',
    };
  } catch {
    return null;
  }
}

export async function liveRoomStart(roomId: string): Promise<string | null> {
  try {
    if (!(await getSession())) return null;
    const { data, error } = await (await getSupabase()).rpc('arena_live_start', { p_room_id: roomId });
    if (error) return null;
    return data as string;
  } catch {
    return null;
  }
}

export async function liveRoomFinish(roomId: string, score: number): Promise<boolean> {
  try {
    if (!(await getSession())) return false;
    // Time is measured server-side from started_at - clients cannot
    // claim a faster finish, and score is capped at the room max.
    const { error } = await (await getSupabase()).rpc('arena_live_finish', {
      p_room_id: roomId,
      p_score: score,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function liveRoomLeave(roomId: string): Promise<void> {
  try {
    if (!(await getSession())) return;
    // discarded-ok: leave la fire-and-forget, loi duoc bo qua co y
    await (await getSupabase()).rpc('arena_live_leave', { p_room_id: roomId });
  } catch {
    /* best-effort */
  }
}

export async function liveRoomState(roomId: string): Promise<{ status: string; hostId: string; players: LivePlayer[] } | null> {
  try {
    if (!(await getSession())) return null;
    const { data, error } = await (await getSupabase()).rpc('arena_live_state', { p_room_id: roomId });
    if (error || !data) return null;
    return {
      status: data[0]?.status ?? 'waiting',
      hostId: data[0]?.host_id ?? '',
      players: (data as { player_id: string; player_name: string; score: number | null; time_ms: number | null; finished_at: string | null }[]).map(
        (r) => ({ id: r.player_id, name: r.player_name, score: r.score, timeMs: r.time_ms, finished: !!r.finished_at }),
      ),
    };
  } catch {
    return null;
  }
}

export interface LiveChannel {
  send: (evt: LiveEvent) => void;
  sendProgress: (q: number, score: number) => void;
  sendFinish: (score: number, timeMs: number) => void;
  unsubscribe: () => void;
}

/**
 * Joins `arena-live:<roomId>`. Presence state carries {id, name}; the
 * roster callback fires on every sync. Broadcast carries race events.
 * `me` is the caller's {id, name} for presence tracking.
 */
export async function subscribeLiveRoom(
  roomId: string,
  me: { id: string; name: string },
  handlers: LiveHandlers,
): Promise<LiveChannel | null> {
  let channel: RealtimeChannel | null = null;
  try {
    if (!(await getSession())) return null;
    const supabase = await getSupabase();
    channel = supabase.channel(`arena-live:${roomId}`, {
      config: { presence: { key: me.id }, broadcast: { self: false } },
    });
    const ch = channel;
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState() as Record<string, { id: string; name: string }[]>;
      const roster = Object.values(state)
        .flat()
        .map((p) => ({ id: p.id, name: p.name, score: null, timeMs: null, finished: false }));
      handlers.onRoster?.(roster);
    })
      .on('broadcast', { event: 'live' }, ({ payload }: { payload: LiveEvent }) => {
        if (payload.type === 'start') handlers.onStart?.();
        else if (payload.type === 'progress') handlers.onProgress?.(payload);
        else if (payload.type === 'finish') handlers.onFinish?.(payload);
        else if (payload.type === 'leave') handlers.onLeave?.(payload.id);
      });
    await new Promise<void>((resolve, reject) => {
      // realtime-js resolves a same-topic channel() call with the EXISTING
      // channel object - if a previous channel is mid-teardown, subscribe()
      // can sit without ever reaching SUBSCRIBED. TIMED_OUT/CLOSED plus a
      // hard timeout keep callers out of that limbo.
      const timer = setTimeout(() => reject(new Error('subscribe timeout')), 10_000);
      ch.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timer);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(timer);
          reject(new Error(status));
        }
      });
    });
    await ch.track({ id: me.id, name: me.name });
    const send = (evt: LiveEvent) => {
      void ch.send({ type: 'broadcast', event: 'live', payload: evt });
    };
    return {
      send,
      sendProgress: (q, score) => send({ type: 'progress', id: me.id, name: me.name, q, score }),
      sendFinish: (score, timeMs) => send({ type: 'finish', id: me.id, name: me.name, score, timeMs }),
      // removeChannel forces a full teardown+rejoin - plain unsubscribe()
      // leaves the stale channel cached under the same topic, and the next
      // subscribe on that topic would hang waiting for an ack that the
      // socket already consumed.
      unsubscribe: () => void supabase.removeChannel(ch),
    };
  } catch {
    // A failed subscribe must not leave the half-joined channel cached
    // under its topic - the next attempt would inherit its dead state.
    if (channel) void getSupabase().then((sb) => sb.removeChannel(channel!)).catch(() => {});
    return null;
  }
}
