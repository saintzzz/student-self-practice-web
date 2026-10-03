import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import type { ExamQuestion } from '../../types/exam';
import {
  DAY_STATS_CAP,
  REVIEW_CAP,
  REVIEW_MASTERED_CAP,
  emptyEngagement,
  getOwnerAccountId,
  getState,
  markOwnerAccountId,
  subscribe,
  writeState,
  type EngagementState,
  type PetSpecies,
  type ReviewItem,
} from './store';

/**
 * CR-45 engagement sync. localStorage stays the authoritative
 * in-session store; this module mirrors it to
 * practice.engagement_state for signed-in students. Guests and
 * unconfigured/test environments make every call a no-op - sync must
 * never throw into gameplay (same contract as savePracticeResult).
 *
 * Cycle model (review B2/B3): a push is always pull -> merge -> push.
 * Pulling before every upsert means a second signed-in device merges
 * our changes instead of being blindly overwritten, and the local
 * device picks up the other's progress on its next mutation.
 *
 * Ownership (review B1): the local blob carries an owner marker. Bind
 * merges local state only when the owner is null (guest) or the same
 * account - a different owner's state is discarded BEFORE any network
 * call, so even a failed pull can never carry it into another account.
 */

const TABLE = 'engagement_state';
const PUSH_DEBOUNCE_MS = 1000;
const FETCH_FAILED = Symbol('fetch-failed');

let boundAccountId: string | null = null;
let pullState: 'idle' | 'pending' | 'done' | 'failed' = 'idle';
/** A real local mutation is waiting for a push. */
let dirty = false;
/** The last cycle could not reach the server - retried on next mutation
 *  (never on a timer, so an offline device does not poll every second). */
let pushFailed = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let cyclePromise: Promise<void> | null = null;
/** Set while writeState(merged) runs - its notify must not look like a
 *  user mutation. Released on a later microtask because persist()
 *  defers listeners to microtasks. */
let internalWrite = false;
let lastPushedJson: string | null = null;
let subscribed = false;

const itemTs = (i: ReviewItem): string => i.updatedAtISO ?? i.addedAtISO;

/** Merge two snapshots without losing progress on either side. All
 *  counters are monotonic, so per-field max is idempotent - a state
 *  that was already merged can be re-pushed and re-merged forever
 *  without double counting. */
export function mergeEngagement(
  local: EngagementState,
  remote: EngagementState,
): EngagementState {
  const grades: EngagementState['grades'] = { ...remote.grades };
  for (const [gid, g] of Object.entries(local.grades)) {
    const r = grades[gid];
    grades[gid] = r
      ? {
          stars: Math.max(g.stars, r.stars),
          roundsCompleted: Math.max(g.roundsCompleted, r.roundsCompleted),
          batchesCompleted: Math.max(g.batchesCompleted, r.batchesCompleted),
        }
      : { ...g };
  }

  /* M1: the streak object travels whole - count follows the side with
     the later activity day. Max-count only applies when both sides
     recorded the same day, so a legit streak reset can't inflate. */
  const lastLocal = local.streak.lastDayISO ?? '';
  const lastRemote = remote.streak.lastDayISO ?? '';
  const streak =
    lastLocal === lastRemote
      ? { lastDayISO: local.streak.lastDayISO, count: Math.max(local.streak.count, remote.streak.count) }
      : { ...(lastLocal > lastRemote ? local : remote).streak };

  const dailyQuest =
    (local.dailyQuest?.dateISO ?? '') >= (remote.dailyQuest?.dateISO ?? '')
      ? mergeDailyQuest(local.dailyQuest, remote.dailyQuest)
      : mergeDailyQuest(remote.dailyQuest, local.dailyQuest);

  /* M2: per-item merge by last-mutation time (updatedAtISO) so a
     stage-0 reset on one device beats a stale higher stage on the
     other. Tombstones carry the mastery timestamp - an item survives
     its own tombstone only when it was re-earned wrong afterwards. */
  const mastered: Record<string, string> = {};
  for (const src of [remote.reviewMastered, local.reviewMastered]) {
    for (const [id, ts] of Object.entries(src ?? {})) {
      if (typeof ts === 'string' && (!mastered[id] || ts > mastered[id])) mastered[id] = ts;
    }
  }
  /* Strict > so a re-earned-wrong item stamped at the same instant as
     its tombstone keeps its queue spot - losing a review card is worse
     than resurrecting a mastered one. */
  const isTombstoned = (it: ReviewItem): boolean =>
    typeof mastered[it.id] === 'string' && mastered[it.id]! > itemTs(it);
  const review: NonNullable<EngagementState['review']> = {};
  for (const gid of new Set([
    ...Object.keys(remote.review ?? {}),
    ...Object.keys(local.review ?? {}),
  ])) {
    const merged = new Map<string, ReviewItem>();
    for (const it of remote.review?.[gid] ?? []) if (!isTombstoned(it)) merged.set(it.id, it);
    for (const it of local.review?.[gid] ?? []) {
      if (isTombstoned(it)) continue;
      const prev = merged.get(it.id);
      if (!prev || itemTs(it) >= itemTs(prev)) merged.set(it.id, it);
    }
    if (merged.size) {
      review[gid] = [...merged.values()]
        .sort((a, b) => (a.addedAtISO < b.addedAtISO ? -1 : a.addedAtISO > b.addedAtISO ? 1 : 0))
        .slice(-REVIEW_CAP);
    }
  }
  /* Keep only the newest tombstones - the map is unbounded churn. */
  const masteredEntries = Object.entries(mastered)
    .sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))
    .slice(-REVIEW_MASTERED_CAP);

  const days: Record<string, { correct: number; total: number }> = {};
  for (const [d, c] of Object.entries(remote.stats?.days ?? {})) days[d] = { ...c };
  for (const [d, c] of Object.entries(local.stats?.days ?? {})) {
    const r = days[d];
    days[d] = r
      ? { correct: Math.max(c.correct, r.correct), total: Math.max(c.total, r.total) }
      : { ...c };
  }
  /* m1: re-apply the day cap - two 30-day maps can union to 60. */
  const dayKeys = Object.keys(days).sort();
  for (const k of dayKeys.slice(0, Math.max(0, dayKeys.length - DAY_STATS_CAP))) delete days[k];

  const skills: NonNullable<NonNullable<EngagementState['stats']>['skills']> = {};
  for (const [gid, perSkill] of Object.entries(remote.stats?.skills ?? {})) {
    skills[gid] = { ...perSkill };
  }
  for (const [gid, perSkill] of Object.entries(local.stats?.skills ?? {})) {
    const mergedSkill: Record<string, { correct: number; total: number }> = {
      ...(skills[gid] ?? {}),
    };
    for (const [sk, c] of Object.entries(perSkill)) {
      const r = mergedSkill[sk];
      mergedSkill[sk] = r
        ? { correct: Math.max(c.correct, r.correct), total: Math.max(c.total, r.total) }
        : c;
    }
    skills[gid] = mergedSkill;
  }

  const localXp = local.pet?.xp ?? 0;
  const remoteXp = remote.pet?.xp ?? 0;
  const petFrom = localXp >= remoteXp ? local.pet : remote.pet;
  const pet =
    local.pet || remote.pet
      ? {
          species: petFrom?.species ?? local.pet?.species ?? remote.pet?.species ?? null,
          xp: Math.max(localXp, remoteXp),
          seenStage: Math.max(local.pet?.seenStage ?? 0, remote.pet?.seenStage ?? 0),
        }
      : undefined;

  const badgeStats =
    local.badgeStats || remote.badgeStats
      ? {
          totalCorrect: Math.max(local.badgeStats?.totalCorrect ?? 0, remote.badgeStats?.totalCorrect ?? 0),
          reviewMastered: Math.max(local.badgeStats?.reviewMastered ?? 0, remote.badgeStats?.reviewMastered ?? 0),
          questPerfectDays: Math.max(local.badgeStats?.questPerfectDays ?? 0, remote.badgeStats?.questPerfectDays ?? 0),
          arenaPlayed: Math.max(local.badgeStats?.arenaPlayed ?? 0, remote.badgeStats?.arenaPlayed ?? 0),
          arenaWon: Math.max(local.badgeStats?.arenaWon ?? 0, remote.badgeStats?.arenaWon ?? 0),
        }
      : undefined;

  return {
    totalStars: Math.max(local.totalStars, remote.totalStars),
    grades,
    streak,
    stickerIds: [...new Set([...local.stickerIds, ...remote.stickerIds])],
    batchesCompleted: Math.max(local.batchesCompleted, remote.batchesCompleted),
    gradesPlayed: [...new Set([...local.gradesPlayed, ...remote.gradesPlayed])],
    dailyQuest,
    review: Object.keys(review).length ? review : undefined,
    stats: Object.keys(days).length || Object.keys(skills).length ? { days, skills } : undefined,
    pet,
    badgeStats,
    reviewMastered: masteredEntries.length ? Object.fromEntries(masteredEntries) : undefined,
  };
}

/** Same-date daily quests merge field-wise; different dates keep the
 *  newer day's record wholesale (the older day's counters are stale). */
function mergeDailyQuest(
  winner: EngagementState['dailyQuest'],
  loser: EngagementState['dailyQuest'],
): EngagementState['dailyQuest'] {
  if (!winner) return loser ? { ...loser } : undefined;
  if (!loser || loser.dateISO !== winner.dateISO) return { ...winner };
  return {
    dateISO: winner.dateISO,
    drillDone: winner.drillDone || loser.drillDone,
    correctToday: Math.max(winner.correctToday, loser.correctToday),
    bigDone: winner.bigDone || loser.bigDone,
    bonusClaimed: winner.bonusClaimed || loser.bonusClaimed,
  };
}

// ---- remote sanitize (m3) ------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
const counter = (v: unknown): { correct: number; total: number } | null =>
  isObj(v) ? { correct: num(v.correct), total: num(v.total) } : null;
const PET_SPECIES: readonly string[] = ['cat', 'dragon', 'bunny'];

/** Coerce an unknown remote payload into a safe EngagementState - every
 *  field is type-checked so a corrupt row can never crash the merge or
 *  poison local state. */
function sanitizeRemote(raw: unknown): EngagementState {
  const out = emptyEngagement();
  if (!isObj(raw)) return out;
  out.totalStars = num(raw.totalStars);
  out.batchesCompleted = num(raw.batchesCompleted);
  out.stickerIds = strArr(raw.stickerIds);
  out.gradesPlayed = strArr(raw.gradesPlayed);

  if (isObj(raw.grades)) {
    for (const [gid, g] of Object.entries(raw.grades)) {
      if (isObj(g)) {
        out.grades[gid] = {
          stars: num(g.stars),
          roundsCompleted: num(g.roundsCompleted),
          batchesCompleted: num(g.batchesCompleted),
        };
      }
    }
  }
  if (isObj(raw.streak)) {
    out.streak = { lastDayISO: str(raw.streak.lastDayISO), count: num(raw.streak.count) };
  }
  if (isObj(raw.dailyQuest)) {
    out.dailyQuest = {
      dateISO: str(raw.dailyQuest.dateISO) ?? '',
      drillDone: raw.dailyQuest.drillDone === true,
      correctToday: num(raw.dailyQuest.correctToday),
      bigDone: raw.dailyQuest.bigDone === true,
      bonusClaimed: raw.dailyQuest.bonusClaimed === true,
    };
  }
  if (isObj(raw.review)) {
    const review: Record<string, ReviewItem[]> = {};
    for (const [gid, list] of Object.entries(raw.review)) {
      if (!Array.isArray(list)) continue;
      const items: ReviewItem[] = [];
      for (const it of list) {
        if (!isObj(it) || typeof it.id !== 'string' || !it.id || !isObj(it.question)) continue;
        /* Integer-only stages - a fractional stage would produce a
           NaN due date and wedge the item in the queue forever. */
        const stage = Number.isInteger(it.stage) ? num(it.stage) : 0;
        items.push({
          id: it.id,
          question: it.question as unknown as ExamQuestion,
          stage: (stage >= 0 && stage <= 3 ? stage : 0) as ReviewItem['stage'],
          addedAtISO: str(it.addedAtISO) ?? '1970-01-01',
          dueISO: str(it.dueISO) ?? '1970-01-01',
          updatedAtISO: str(it.updatedAtISO) ?? undefined,
        });
      }
      if (items.length) review[gid] = items;
    }
    if (Object.keys(review).length) out.review = review;
  }
  if (isObj(raw.stats)) {
    const days: Record<string, { correct: number; total: number }> = {};
    if (isObj(raw.stats.days)) {
      for (const [d, c] of Object.entries(raw.stats.days)) {
        const cc = counter(c);
        if (cc) days[d] = cc;
      }
    }
    const skills: Record<string, Record<string, { correct: number; total: number }>> = {};
    if (isObj(raw.stats.skills)) {
      for (const [gid, perSkill] of Object.entries(raw.stats.skills)) {
        if (!isObj(perSkill)) continue;
        const inner: Record<string, { correct: number; total: number }> = {};
        for (const [sk, c] of Object.entries(perSkill)) {
          const cc = counter(c);
          if (cc) inner[sk] = cc;
        }
        if (Object.keys(inner).length) skills[gid] = inner;
      }
    }
    if (Object.keys(days).length || Object.keys(skills).length) out.stats = { days, skills };
  }
  if (isObj(raw.pet)) {
    const species = str(raw.pet.species);
    out.pet = {
      species: species && PET_SPECIES.includes(species) ? (species as PetSpecies) : null,
      xp: num(raw.pet.xp),
      seenStage: num(raw.pet.seenStage),
    };
  }
  if (isObj(raw.badgeStats)) {
    out.badgeStats = {
      totalCorrect: num(raw.badgeStats.totalCorrect),
      reviewMastered: num(raw.badgeStats.reviewMastered),
      questPerfectDays: num(raw.badgeStats.questPerfectDays),
      arenaPlayed: num(raw.badgeStats.arenaPlayed),
      arenaWon: num(raw.badgeStats.arenaWon),
    };
  }
  if (isObj(raw.reviewMastered)) {
    const mastered: Record<string, string> = {};
    for (const [id, ts] of Object.entries(raw.reviewMastered)) {
      if (typeof ts === 'string') mastered[id] = ts;
    }
    if (Object.keys(mastered).length) out.reviewMastered = mastered;
  }
  return out;
}

// ---- network -------------------------------------------------------------

async function fetchRemote(accountId: string): Promise<EngagementState | null | typeof FETCH_FAILED> {
  try {
    const { data, error } = await (await getSupabase())
      .from(TABLE)
      .select('state')
      .eq('account_id', accountId)
      .maybeSingle();
    if (error) throw error;
    return data?.state ? sanitizeRemote(data.state) : null;
  } catch {
    return FETCH_FAILED;
  }
}

async function upsertState(accountId: string, state: EngagementState): Promise<boolean> {
  try {
    const { error } = await (await getSupabase())
      .from(TABLE)
      .upsert({ account_id: accountId, state });
    return !error;
  } catch {
    return false;
  }
}

/** Run fn() while suppressing the subscription callback its persist()
 *  will emit. persist() defers listeners to microtasks, so the flag is
 *  released on a LATER microtask - ordering guarantees the notify is
 *  still filtered. */
function writeStateSilently(state: EngagementState): void {
  internalWrite = true;
  try {
    writeState(state);
  } finally {
    queueMicrotask(() => {
      internalWrite = false;
    });
  }
}

/** One pull -> merge -> push cycle. Reentrant-safe: a second caller
 *  while a cycle is in flight shares the current run. Never rejects -
 *  failures set pushFailed so the next mutation retries. */
function runCycle(): Promise<void> {
  if (cyclePromise) return cyclePromise;
  cyclePromise = (async () => {
    try {
      const accountId = boundAccountId;
      if (!accountId) return;
      dirty = false;
      const remote = await fetchRemote(accountId);
      /* M3: the account may have changed or unbound during the await -
         never write a stale account's data into the new binding. */
      if (boundAccountId !== accountId) return;
      if (remote === FETCH_FAILED) {
        /* Never blind-overwrite a row we couldn't read (B2). Wait for
           the next mutation instead of polling on a timer. */
        pullState = 'failed';
        pushFailed = true;
        return;
      }
      if (remote) {
        const merged = mergeEngagement(getState(), remote);
        if (JSON.stringify(merged) !== JSON.stringify(getState())) {
          writeStateSilently(merged);
        }
      }
      if (boundAccountId !== accountId) return;
      const mergedJson = JSON.stringify(getState());
      if (mergedJson !== lastPushedJson) {
        const ok = await upsertState(accountId, getState());
        if (boundAccountId !== accountId) return;
        if (!ok) {
          pushFailed = true;
          return;
        }
        lastPushedJson = mergedJson;
      }
      pushFailed = false;
      pullState = 'done';
    } catch {
      /* m3: sanitize should make this unreachable, but a corrupt merge
         must still never propagate - retry on the next mutation. */
      pushFailed = true;
    } finally {
      cyclePromise = null;
      /* Only mutations that landed mid-cycle earn a follow-up; failures
         wait for the next mutation (no 1s retry storm when offline). */
      if (dirty && boundAccountId && pullState !== 'pending') schedulePush();
    }
  })();
  return cyclePromise;
}

function onStoreChange(): void {
  if (!boundAccountId || pullState === 'pending' || internalWrite) return;
  dirty = true;
  schedulePush();
}

function schedulePush(): void {
  if (!boundAccountId) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void runCycle();
  }, PUSH_DEBOUNCE_MS);
}

function ensureSubscribed(): void {
  if (subscribed) return;
  subscribed = true;
  subscribe(onStoreChange);
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => void flushEngagement());
  }
}

/** Bind the store to an account: discard any foreign-owned blob (B1),
 *  pull remote -> merge -> persist -> push merged. One path covers
 *  new-device download and guest-to-login uplift. */
export async function bindEngagement(accountId: string): Promise<void> {
  boundAccountId = accountId;
  pullState = 'pending';
  dirty = false;
  pushFailed = false;
  lastPushedJson = null;
  ensureSubscribed();
  /* B1: discard a foreign owner's blob BEFORE any network call - a
     failed pull must still leave nothing of the previous student's
     data in memory for this account to pick up. */
  const owner = getOwnerAccountId();
  if (owner !== null && owner !== accountId) {
    writeStateSilently(emptyEngagement());
  }
  markOwnerAccountId(accountId);
  if (!isSupabaseConfigured()) {
    pullState = 'done';
    return;
  }
  try {
    const remote = await fetchRemote(accountId);
    if (boundAccountId !== accountId) return; // M3
    if (remote === FETCH_FAILED) {
      pullState = 'failed';
      pushFailed = true;
      return;
    }
    if (remote) {
      const merged = mergeEngagement(getState(), remote);
      if (JSON.stringify(merged) !== JSON.stringify(getState())) {
        writeStateSilently(merged);
      }
    }
    pullState = 'done';
    /* Push merged state back so the server reflects the union even when
       nothing local changed (remote JSON order differs from merged). */
    const mergedJson = JSON.stringify(getState());
    if (remote === null || mergedJson !== JSON.stringify(remote)) {
      const ok = await upsertState(accountId, getState());
      if (boundAccountId !== accountId) return;
      if (!ok) {
        pushFailed = true;
        return;
      }
    }
    lastPushedJson = mergedJson;
  } catch {
    pullState = 'failed';
    pushFailed = true;
  }
}

/** Stop pushing (logout). The local blob keeps its owner marker; the
 *  caller decides whether to clear it (shared-device sign-out) or keep
 *  it for the same account to resume. */
export function unbindEngagement(): void {
  boundAccountId = null;
  pullState = 'idle';
  dirty = false;
  pushFailed = false;
  lastPushedJson = null;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

/** False when the last cycle could not reach the server - lets UI show
 *  an offline/syncing badge without coupling to sync internals. */
export function engagementSyncHealthy(): boolean {
  return !pushFailed;
}

/** Drain pending pushes immediately (pagehide, sign-out, tests). Loops
 *  while mutations landed mid-cycle so the tail is never dropped before
 *  unbind (bounded - continuous play cannot starve sign-out). Returns
 *  true when local state fully reached the server - callers use it to
 *  decide whether the local blob may be cleared (offline sign-out must
 *  keep it so the same account can resume later). */
export async function flushEngagement(): Promise<boolean> {
  /* Unbound means nothing was (or can be) pushed - the blob may still
     hold an unsynced tail, so "fully synced" is the wrong answer.
     Callers clear the blob only on true. */
  if (!boundAccountId) return false;
  for (let i = 0; i < 4 && boundAccountId; i++) {
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
    await runCycle();
    if (!dirty && !pushTimer) break;
  }
  return !pushFailed && !dirty;
}
