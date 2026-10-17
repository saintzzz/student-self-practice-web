/**
 * CR-82 (R-v5-11, ARCHITECTURE-v5 s6.1): flashcard self-ratings, local only.
 *
 * localStorage['ea-flash-review:<gradeId>'] holds schema v1
 * `{ v: 1, e: { "<wordId>": { r: 'k' | 'a', t: <epoch ms> } } }`
 * ('k' = Em nhớ rồi, 'a' = Ôn lại), capped at 200 word ids (oldest `t`
 * evicted first on write).
 *
 * Degradation (spec s14.5):
 * - Unreadable/corrupt JSON is NOT an error: read returns empty, the next
 *   save rewrites a clean blob.
 * - Write failure (quota, disabled storage, private mode): ratings live
 *   in a module-level Map for the rest of the visit - retry decks still
 *   work in-session, prioritization resets next visit. Silent.
 * - Not synced, not part of EngagementState, not cleared on sign-out.
 */

export type FlashRating = 'k' | 'a';
export interface FlashReviewEntry {
  r: FlashRating;
  t: number;
}
export type FlashReviewMap = ReadonlyMap<string, FlashReviewEntry>;

const KEY_PREFIX = 'ea-flash-review:';
const CAP = 200;
const SCHEMA_VERSION = 1;

function keyFor(gradeId: string): string {
  return `${KEY_PREFIX}${gradeId}`;
}

/** Session-memory spill for visits where storage writes throw. */
const sessionFallback = new Map<string, Map<string, FlashReviewEntry>>();

function isEntry(value: unknown): value is FlashReviewEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { r?: unknown; t?: unknown };
  return (v.r === 'k' || v.r === 'a') && typeof v.t === 'number' && Number.isFinite(v.t);
}

function parseBlob(raw: string | null): Map<string, FlashReviewEntry> {
  const out = new Map<string, FlashReviewEntry>();
  if (!raw) return out;
  try {
    const parsed = JSON.parse(raw) as { v?: unknown; e?: unknown };
    if (parsed.v !== SCHEMA_VERSION || typeof parsed.e !== 'object' || parsed.e === null) {
      return out; // wrong version / shape -> treat as empty, rewritten on next save
    }
    for (const [wordId, entry] of Object.entries(parsed.e as Record<string, unknown>)) {
      if (isEntry(entry)) out.set(wordId, entry);
    }
  } catch {
    /* corrupt JSON -> empty (discarded and rewritten on next save). */
  }
  return out;
}

function readStored(gradeId: string): Map<string, FlashReviewEntry> {
  try {
    return parseBlob(window.localStorage.getItem(keyFor(gradeId)));
  } catch {
    return new Map();
  }
}

/** Merged view: stored entries plus session-memory entries (session wins -
 *  it only exists when a write failed and is therefore fresher). */
export function readReviewStore(gradeId: string): Map<string, FlashReviewEntry> {
  const merged = readStored(gradeId);
  const spill = sessionFallback.get(gradeId);
  if (spill) {
    for (const [wordId, entry] of spill) merged.set(wordId, entry);
  }
  return merged;
}

function persist(gradeId: string, entries: Map<string, FlashReviewEntry>): boolean {
  /* Cap: evict the smallest timestamps until <= CAP. */
  const sorted = [...entries.entries()].sort((a, b) => b[1].t - a[1].t);
  const kept = sorted.slice(0, CAP);
  const blob = JSON.stringify({
    v: SCHEMA_VERSION,
    e: Object.fromEntries(kept),
  });
  try {
    window.localStorage.setItem(keyFor(gradeId), blob);
    return true;
  } catch {
    return false;
  }
}

/**
 * Records one rating. Never throws: on storage failure the rating lands in
 * session memory and readReviewStore keeps returning it for this visit.
 */
export function saveFlashRating(
  gradeId: string,
  wordId: string,
  rating: FlashRating,
  now: number = Date.now(),
): void {
  const entry: FlashReviewEntry = { r: rating, t: now };
  /* Merge the session spill INTO the persisted set first - without this
     the first successful write after a failure discards every rating
     that only lived in memory (external review r34-B3). */
  const entries = readStored(gradeId);
  const priorSpill = sessionFallback.get(gradeId);
  if (priorSpill) {
    for (const [id, e] of priorSpill) entries.set(id, e);
  }
  entries.set(wordId, entry);
  if (persist(gradeId, entries)) {
    /* The write landed (spill included) - the session copy is redundant. */
    sessionFallback.delete(gradeId);
  } else {
    /* Cap memory the same way storage is capped - newest CAP wins. */
    const spill = new Map<string, FlashReviewEntry>(
      [...entries.entries()].sort((a, b) => b[1].t - a[1].t).slice(0, CAP),
    );
    sessionFallback.set(gradeId, spill);
  }
}

/** Test hook - clears the module-level session spill between specs. */
export function __resetFlashReviewSession(): void {
  sessionFallback.clear();
}
