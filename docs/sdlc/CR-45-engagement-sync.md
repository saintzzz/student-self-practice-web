# CR-45 - Engagement state sync to Supabase

## What / why

All engagement state (stars, streak, stickers/badges, daily quest, review
queue, pet, badge stats, grade progress) lives only in `localStorage`
(`beheo-engagement-v1`). Consequences:

- Progress is lost when a student switches device or clears storage.
- Teachers/parents cannot see real engagement - only `practice.results` rows.
- Leaderboard/motivation features lack a server source of truth.

This CR syncs the full `EngagementState` blob to a new
`practice.engagement_state` table, keyed by account. Guest play stays
local-only and merges upward on first login.

## Impact assessment

| Area | Change |
|---|---|
| `supabase/migrations/0008_engagement_sync.sql` | NEW table + RLS (same default-deny pattern as every `practice.*` table) |
| `supabase/migrations/0009_engagement_state_guard.sql` | NEW CHECK constraint: `state` must be a jsonb object < 512000 bytes |
| `src/lib/engagement/store.ts` | `persist()` notifies subscribers; `subscribe()`/`writeState()`/`emptyEngagement()`/`clearEngagementLocal()`; owner key (`beheo-engagement-owner`); `ReviewItem.updatedAtISO` (full ISO timestamp); timestamped `reviewMastered` tombstones; `REVIEW_CAP`/`DAY_STATS_CAP`/`REVIEW_MASTERED_CAP` exported; `questFor` no longer persists on read |
| `src/lib/engagement/sync.ts` | NEW - owner-aware bind/unbind, pull->merge->push cycle, debounce, remote sanitize |
| `src/App.tsx` | bind after account load; logout = flush -> unbind -> signOut (try/finally) |
| `src/components/EngagementBar.tsx` | re-read state on store change (live star count) |
| Tests | merge unit tests + sync module tests incl. reviewer-mandated scenarios |

No change to `practice.results` / leaderboard flows. Guests unaffected.
Backwards compatible: old localStorage payloads still load; merge never
deletes progress.

## Sync model (post-review architecture)

- `persist()` (single write choke point) notifies subscribers; the sync
  module schedules a trailing debounced **cycle** (~1s).
- Every cycle is **pull -> merge -> push**. A device never upserts a row
  it could not read first, so two devices merge instead of overwriting
  each other (review B2/B3).
- On bind (session restore or fresh login): set binding -> pull -> merge
  (ownership-aware) -> persist -> push merged.
- **Ownership (B1):** the local blob carries `beheo-engagement-owner`.
  Bind merges local state only when the owner is `null` (guest or a
  pre-CR install) or equals the account. A different owner's blob is
  discarded - one student's progress can never leak into another's
  account on a shared classroom device.
- **Generation guard (M3):** every awaited step re-checks
  `boundAccountId`; a late pull for account A can never land after the
  app switched to account B.
- **Logout (M4):** `flushEngagement()` while the session is still valid,
  then `unbindEngagement()`, then `logout()` inside `try/finally` that
  always clears local auth state. The local blob is cleared only when
  the flush truly reached the server - an offline sign-out keeps the
  owner-marked blob so the same account can resume (B1's pre-pull
  discard still protects any different account that binds).
- Best-effort flush on `pagehide`. Failures are silent - play never
  blocks on sync; a failed cycle sets `pushFailed` and retries on the
  next mutation (never on a timer - no 1s polling when offline).
- Malformed remote payloads are sanitized to the empty state before
  merging (m3) - a corrupt row can never crash or poison sync.

## Merge strategy (idempotent)

- Monotonic counters -> `max` (`totalStars`, `batchesCompleted`,
  per-grade counters, `badgeStats.*`, `stats.*`, `pet.xp/seenStage`).
- `stickerIds`, `gradesPlayed` -> union.
- `streak` (M1) -> the object travels whole; the side with the later
  `lastDayISO` wins entirely, so a legit streak reset survives. Max
  applies only when both sides recorded the same day.
- `dailyQuest` -> newer `dateISO` wins; same-date merges OR booleans and
  max `correctToday`.
- `review[]` (M2) -> per-item by `id`, winner is the side with the newer
  `updatedAtISO` (full-precision ISO, stamped on add/reset/advance).
  `reviewMastered` tombstones (id -> mastery ISO) prevent resurrecting
  mastered items; an item re-earned wrong after mastery carries a newer
  timestamp and survives its own tombstone. `REVIEW_CAP`,
  `REVIEW_MASTERED_CAP` and `DAY_STATS_CAP` are re-applied after every
  merge.
- `pet.species` -> from whichever side has higher `xp`.

## Data trust boundary (review m4)

`state` is client-reported. The CHECK constraint bounds shape/size, but
the data must **never feed rankings, leaderboards, rewards, or
teacher-facing metrics** without a server-side recomputation step
(derive points from `practice.results` instead).

## Review round 1 -> fixes applied

| Finding | Fix |
|---|---|
| B1 state leak on shared device | owner key; bind discards foreign blobs |
| B2 push before initial pull | cycle model: every push is pull->merge->push; pullState gates subscription pushes |
| B3 whole-row stale writes | pull-first inside every cycle + `lastPushedJson` dedupe |
| M1 streak reset corruption | streak merged as a whole object by `lastDayISO` |
| M2 review resurrection | `updatedAtISO` + `reviewMasteredIds` tombstones + cap re-apply |
| M3 late pull after switch | `boundAccountId` re-check after every await |
| M4 logout data loss | flush -> unbind -> logout in `try/finally` |
| m1 unbounded day stats | `DAY_STATS_CAP` re-applied in merge |
| m3 malformed remote | deep `sanitizeRemote()` before merge + cycle try/catch |
| m4 unbounded jsonb | CHECK constraint `< 512000` bytes |

## Review round 2/3 -> fixes applied

| Finding | Fix |
|---|---|
| B1 leak when first pull failed | owner discard runs BEFORE any network call; owner marked on every exit |
| Tombstone swallowed re-earned item | timestamped `reviewMastered` record + strict `>` compare + local delete on re-add |
| Same-day mastery then re-wrong | full-precision `toISOString()` stamps replace date-only |
| Offline sign-out wiped unsynced progress | `flushEngagement` returns push status; blob cleared only on success |
| Failed pull retried every second | `pushFailed` flag; retry on next mutation only |
| Guest played on previous student's blob | owner-marked blob cleared on successful sign-out flush; KNOWN RESIDUAL: after an OFFLINE sign-out the kept blob stays visible to a later guest on that device (chosen over deleting unsynced progress - it merges only into its owner's account on next login) |
| Upsert failure marked as pushed | `lastPushedJson` set only after a confirmed upsert |
| internalWrite released too early | flag released on a later microtask than the deferred notify |
| Sign-out dropped mid-cycle mutation | bounded drain loop in `flushEngagement` |
| Non-integer review stage | `Number.isInteger` guard in sanitize |

## Acceptance criteria

- AC-45.1 A logged-in student's state round-trips under their
  `account_id`; no upsert ever carries another owner's data.
- AC-45.2 Second device merges without losing either side's progress.
- AC-45.3 Guest play never touches the API; guest progress merges upward
  on first login.
- AC-45.4 RLS: self-scoped read/write; admin read-all. CHECK constraint
  rejects non-object/oversized payloads.
- AC-45.5 Sync errors never throw into gameplay; unconfigured Supabase
  makes every call a no-op.
