# Architecture - Kids-UX Redesign + Parent Conversion (WP-11, WP-12)

Status: r1 draft -> Tech Lead review (cross-model) -> HUMAN GATE (M3).
Upstream (binding): `prd-kids-ux.md` (R1-R10, rulings OM-1=B, OM-2=A, OM-3=C,
OM-4=C, OM-5=B), `design-kids-ux.md` (§3-§14 incl. §11 handoff, §14 human
rulings), `plan-kids-ux.md` (privacy plan, release contract, rollback),
`docs/MEMORY.md`, `docs/sdlc/constitution.md`, `docs/sdlc/architecture.md`
(ADR-1..13 + CR addenda - this file does not renumber them; IDs here are
`KUX-n`).
Class: brownfield. Fidelity: token-faithful. All Vietnamese copy in this file
uses the plain hyphen `-` only.

Method (deterministic before LLM): every code claim below was checked against
the working tree at `edfa87d` (file:line cited). Blast radius was sized by
targeted import/selector tracing (`grep`), not by file names - no code-graph
tool is installed in this repo.

---

## 0. Findings that change the upstream picture (read first)

| # | Finding (verified) | Evidence | Consequence |
|---|---|---|---|
| F-1 | The sync layer **drops unknown keys** on every pull and every merge. `sanitizeRemote` builds a fresh object from a fixed field list, and `mergeEngagement` returns only known fields. A new store field (`homeItems`, `grantedObjectives`) is silently erased on the next sync cycle unless both are extended. | `src/lib/engagement/sync.ts:393-489` (sanitize), `:167-188` (merge return), `:595-597` (merged state is written back locally) | KUX-4 makes sanitize + merge changes mandatory and adds a class-gate test (FF-9). It also creates a **rollback data-loss hazard**: a reverted (old) client strips the new keys from the server row. Mitigated by release R0 (§5). |
| F-2 | `practice.results` has **no mode column**. Luyện đề (drill) and Thi thử (mock) both insert `program = programId`. | `supabase/migrations/0004_leaderboard.sql:9-11` (`program in ('batch','english','math','science')`), `src/components/ExamScreen.tsx:163-173`, `src/lib/practiceResults.ts:75-100` | The design's "mode exam" filter for the mock trend (design §3.7 B) is not queryable. KUX-4b uses a deterministic classifier over `total_questions` vs `examConfigForGrade` (drill max 30 < exam min 50, `src/lib/exam/examSession.ts:35-48`), guarded by FF-12. No schema change. |
| F-3 | The weekly digest is **not an edge function**. It is the pg_cron SQL function `practice.send_weekly_reports()`, last redefined in `0037_external_review_r7.sql:323-438`, sending via `practice.send_email`. `supabase/functions/` holds only `practice-admin` and `practice-transcribe`. | `0005_parent_reports.sql:47,133-142` (cron), `0037:323-438` | KUX-12 extends the SQL function via a new migration. |
| F-4 | Parent email capture uses `save_parent_contact` + `request_parent_verify`; `confirm_parent_email` is the link target, not part of capture. PRD AC-6.1 names only the last two. | `src/lib/parentContact.ts:36-71`, `src/App.tsx:81-98` | Doc correction only; the extracted `ParentEmailForm` keeps the real 2-RPC flow. |
| F-5 | `recordRoundResult` adds the full star count on **every** call (its doc comment says "replays only add the star DELTA" - the code does not). Rewards are guarded only by a per-mount `useRef` in the summary components. | `src/lib/engagement/store.ts:348-368`, `src/components/RoundSummary.tsx:55-72`, `src/components/BatchSummary.tsx:44-62` | KUX-4a moves the guard into the store (AC-4.4). |
| F-6 | Batches have no stable "definition id"; every batch gets a random `seed`. | `src/lib/batch/batchSession.ts:42-57,130-132` | AC-4.4 objective identity = the batch `seed` (per run). See Objection OBJ-1. |
| F-7 | `practice.results` grants `results_admin_all` for admins. A report query that relies on RLS alone returns **every student's rows** when an admin session opens it. | `0002_practice_results.sql:27-36` | Report queries must add an explicit `.eq('account_id', uid)` (KUX-4b, threat T-2, FF-6). |
| F-8 | No analytics/event infrastructure exists in `src/` (no tracker, no network beacon). | `grep -ri "analytics\|trackEvent\|gtag\|posthog"` -> only unrelated data files | Design funnel events become a client-only event bus (KUX-13). Server ingestion would be new data collection -> CR. |
| F-9 | `docs/sdlc/constitution.md` text is **not yet amended**: still "học sinh lớp 2" (#1), license list CC0/CC-BY/OFL/MIT (#3), C3 lists three dirs. The amendment was approved at the design gate (design §14 O-4). | `constitution.md:7,13-16,42` | Escalation E-1: the text edit must be committed before any WP touches `public/mascot/`, `public/payment/`, `public/fonts/andika/`. |
| F-10 | Speech: `speak()` always tries a pre-rendered mp3 keyed by `sha1(text)` on Supabase Storage before Web Speech. There are no vi-VN mp3s (AC-1.2: no vi asset generation this run). | `src/lib/speech.ts:134-153,330-343` | `speakInstruction` must skip the file path, or every instruction costs one 404 round trip before speaking (KUX-1). |

---

## 1. Architecture Decision Records

Format per ADR: Status / Context / Options / Decision + why / Consequences /
Canonical reference. Options Matrices are given where 2+ viable paths exist;
the recommended option carries a `Ruling:` line for the human gate.

### KUX-1 - TTS architecture: `speakInstruction` in `speech.ts`

**Status:** proposed.

**Context.** AC-1.2/1.3/1.4. `speech.ts` today: en-US only (`synthesize` hard-sets
`utterance.lang = 'en-US'`, `:237`), voice picked by `pickEnglishVoice` (`:64-73`),
status union `'unsupported' | 'error' | 'started'` (`:84`), one module-level
`activeUtterance` / `activeAudio` slot (`:8,96`), watchdog 2500ms + one retry
(`:261-290`), mp3-first chain (`:330-343`). `utterance.onend` only clears the slot
(`:269-271`); there is no end signal to callers, so the speaker pulse cannot sync.

**Options (signature + transport).**

| Option | Strengths | Weaknesses | Risk |
|---|---|---|---|
| A. Generalize `speak(text, onStatus, speed)` with a `lang` param, keep mp3-first | one code path | vi texts always 404 on the mp3 lookup first (F-10), +1 network hop on every instruction; mp3 cache (20 slots, `:104`) gets polluted by instruction misses | perf + console noise |
| **B. New `speakInstruction(text, opts)` that reuses `synthesize` internals (lang/voice/rate parameterized) and skips the mp3 path behind a seam constant** | no 404s; English paths byte-identical; seam ready for O-6 CR (pre-rendered vi clips) | one more exported function | low |
| C. Separate `instructionSpeech.ts` module with its own utterance slot | full isolation | two modules fighting one `speechSynthesis` queue -> the GC/cancel bugs `speech.ts` already solved (`:1-8,297-314`) come back | high |

`Ruling:` **B.** The `speechSynthesis` queue is a process-wide singleton; one
module must own it.

**Decision (API, implementable as written).**

```ts
// speech.ts - additions only; speakWord/speakSentence signatures unchanged
export type SpeechPlaybackStatus = 'unsupported' | 'error' | 'started' | 'ended';
export type InstructionStatus = SpeechPlaybackStatus | 'blocked' | 'unavailable';

export interface SpeakInstructionOptions {
  lang?: 'vi-VN';                 // only supported value this run (default)
  onStatus?: (s: InstructionStatus) => void;
  /** true = tap (user gesture); false = autoplay attempt */
  userInitiated: boolean;
  /** autoplay only: no 'started' within this window -> 'blocked' (default 1500) */
  blockedAfterMs?: number;
}
/** Returns a cancel fn (used on unmount / replay). Never throws. */
export function speakInstruction(text: string, opts: SpeakInstructionOptions): () => void;
/** true while content audio (mp3 or en-US utterance) is in flight. */
export function isContentAudioBusy(): boolean;
/** Resolves once voices are loaded (voiceschanged) or after 1000ms. */
export function voicesReady(): Promise<void>;
export function hasVietnameseVoice(): boolean;
```

Rules:
1. **Voice selection.** `pickVoice(lang)` generalizes `pickEnglishVoice`:
   filter `voice.lang` starting with `vi`, then a preferred-name list (candidate
   substrings, to be confirmed on the WP-21 device matrix, not asserted here:
   Edge "HoaiMy"/"NamMinh" Online Natural, Windows "An", Apple "Linh", Android
   Google TTS vi-VN), then exact `vi-VN`, then any `vi*`. **If no vi voice exists,
   do not speak** - a Vietnamese string read by an English voice is worse than
   silence. Emit `'unavailable'` (design state `unavailable`, R-18).
2. **Rate.** vi-VN uses its own rate constant (`INSTRUCTION_RATE`, start at 0.9,
   tuned in WP-21); the kid-paced 0.7 (`:167`) is for English decoding.
3. **End signal.** `'ended'` is emitted from `utterance.onend` and from the mp3
   `ended` event, through a second guard flag (the existing `statusSent` guard,
   `:255-260`, is single-shot for the start/error race and must not swallow
   `'ended'`). Per-replay listeners settle + clean up, and eviction only happens
   if `audioCache.get(text) === audio` (MEMORY lesson, `:200-205`).
   `useAudioPlayback` (`src/hooks/useAudioPlayback.ts:44-48`) only reacts to
   `unsupported|error`, so widening the union is backward compatible.
4. **Autoplay-blocked detection** (AC-1.3). Autoplay = `userInitiated:false`.
   `'blocked'` fires on whichever comes first: (a) `onerror` with
   `event.error === 'not-allowed'` (Chromium rejects `speak()` without user
   activation), (b) no `onstart` within `blockedAfterMs` (iOS Safari drops it
   silently). On `'blocked'` the pending utterance is cancelled so a late start
   cannot contradict the "Bấm để nghe" cue. The existing 2500ms watchdog + retry
   stays for taps (`userInitiated:true`).
5. **Channel priority.** Content audio wins (design §3.2 rule 1): an autoplay
   attempt returns immediately with no status if `isContentAudioBusy()`; a
   content `speak()` cancels any instruction (it already cancels the queue,
   `:302-311`). A tapped instruction may interrupt content (explicit intent).
6. **mp3 seam.** `const INSTRUCTION_AUDIO_FILES = false` - when the O-6 CR ships
   vi clips, flipping it routes instructions through `tryPlayAudioFile` with a
   `vi:` hash namespace. No `gen-audio.py` change this run (it renders only
   `en-US-AnaNeural` / `en-US-AndrewNeural`, `scripts/gen-audio.py:16-17`).
7. Tests: `MODE==='test'` already forces the TTS-only path (`:137-139`);
   new unit tests stub `speechSynthesis` for each branch (start/end, not-allowed,
   silent drop, no vi voice, content busy). JSDOM `play()` throws are expected
   noise (MEMORY).

**Consequences.** English behaviour unchanged (FF-14 snapshot of the
`speakWord`/`speakSentence` call path). vi-VN quality is device-dependent (O-6,
D1 capped at 4 in the design rubric). Devices without a vi voice get the
visual-only path, which AC-1.4 already requires.

**Canonical references.** MDN SpeechSynthesis + `SpeechSynthesisErrorEvent.error`
(`not-allowed`): https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisErrorEvent/error ;
Chrome autoplay policy: https://developer.chrome.com/blog/autoplay ;
MDN User activation: https://developer.mozilla.org/en-US/docs/Web/Security/User_activation

---

### KUX-2 - `InstructionSpeaker` component pattern

**Status:** proposed.

**Context.** Design §3.2 state machine (idle / playing / blocked / unavailable),
API `<InstructionSpeaker textVi spokenVi? autoPlay playKey />`, 76px both bands
(R-27), autoplay G1-2 only (R-15), 400ms delay, pulse fallback timeout
`textVi.length * 90ms + 1500ms`.

**Decision.** Split logic from view:

- `src/hooks/useInstructionSpeaker.ts` - owns the state machine, calls
  `speakInstruction`, returns `{ state, play }`. Autoplay is scheduled with
  `setTimeout(400)` inside an effect whose **cleanup clears the timer and calls
  the cancel fn**; the "already autoplayed for this playKey" ref is set **when the
  timer fires**, not when the effect runs. Reason: React StrictMode mounts,
  unmounts and re-mounts in dev - a ref set on first run plus a cancelling cleanup
  would silence autoplay in dev and hide bugs in prod. Pulse fallback timer stops
  `playing` if no `'ended'` arrives. `unavailable` is computed after
  `voicesReady()`.
- `src/components/InstructionSpeaker.tsx` - pure view: `SPEAKER_BTN` token,
  `speaker-pulse` ring (reduced-motion: static `ring-8` + "Đang đọc"), blocked
  chip `CHIP_VOICE` "👆 Bấm để nghe", `aria-pressed` while playing, accessible
  names per design §3.2. `data-testid="instruction-speaker"`,
  `data-speaker-state={state}` (e2e hook for WP-21).
- `unavailable` tap -> calls an optional `onUnavailableTap` prop; the launchpad
  passes a handler that applies `trail-glow` to the primary CTA for 2s.
- Band: `autoPlay` defaults to `useBand() === 'g12'` (KUX-5) so call sites do not
  repeat the rule; GradeSelect overrides per R-29.

**Consequences.** One hook, one view, reused at every surface in design §3.2
"Where" (≈10 call sites). Not used on parent surfaces or the exam interior.

**Canonical reference.** React StrictMode effect double-invoke:
https://react.dev/reference/react/StrictMode

---

### KUX-3 - Parent gate: one-shot challenge + in-memory pass token

**Status:** proposed (adjusts design R-13 scope - see Ruling).

**Context.** Design §3.6: arithmetic in Vietnamese words (a,b in 6-9), keypad,
3-miss 10s cooldown, `role="dialog"` + focus trap + Esc + focus restore; pass
token in memory 5 minutes, cleared on sign-out, grade change, reload. The repo
reference for modal a11y is `ConfirmEndDialog` (`src/components/ConfirmEndDialog.tsx:32-63`,
MEMORY lesson).

**Decision.**
1. **Shared modal hook.** Extract `useModalA11y({ containerRef, initialFocusRef,
   onCancel })` from `ConfirmEndDialog` (focus capture, initial focus, Tab trap,
   Esc, restore). `ConfirmEndDialog` is refactored onto it with **no prop or DOM
   change** (its tests stay untouched as the regression proof). `ParentGate`,
   `ExploreSheet` and the share preview sheet use the same hook.
2. **Token module** `src/lib/parentGate.ts` (no React, no storage):
   `markGatePassed(now)`, `isGatePassed(now): boolean`, `clearGate()`. State is a
   single module-level `passedAtMs: number | null`. Not persisted (reload clears).
   It is a UX friction control, not a security credential (threat T-1).
3. **Consumer hook** `useParentGate()` -> `{ requireParent(surface, action), gateElement }`:
   runs `action` immediately when `isGatePassed`, else renders `ParentGate` and
   runs `action` on pass. Emits funnel events `parent_gate_shown` /
   `parent_gate_passed` `{ surface, gradeBand }` (KUX-13).
4. **Defense in depth.** `ParentReportScreen` checks `isGatePassed()` on mount and
   renders the gate itself if not passed - so no future navigation path can reach
   the report ungated. Same for the share sheet and `SendToParentCard` form.
5. **External links** go through one component `GatedLink` (`href` validated by
   **origin whitelist** `https://vieschool.com`, `https://zalo.me` - CONVENTIONS
   "whitelist + origin", resolved with `new URL()`), which calls `requireParent`
   then `window.open(url, '_blank', 'noopener')`.

**Consuming surfaces (exhaustive, matches design §3.0 gated list):**

| Surface | File | Mechanism |
|---|---|---|
| "🔒 Góc ba mẹ" pill (`open-parent-report`) | `GradeSelect.tsx` -> `onReport` | `requireParent('report', onReport)` + mount check in report |
| Footer "English Arena - sản phẩm của VieSchool" | `GradeSelect.tsx:200` (today a raw `href="https://vieschool.com"`) | `GatedLink` |
| Pricing / payment views | inside `ParentReportScreen` (`view` state) | covered by report gate (token still valid) |
| Zalo buttons (only if configured, R-12) | pricing + payment views | `GatedLink` |
| "Chia sẻ thành tích" (BatchSummary, RoundSummary, ExamResult, report F) | KUX-9 | `requireParent('share', openSheet)` + sheet mount check |
| "Gửi kết quả cho ba mẹ" -> "Nhờ ba mẹ" | `SendToParentCard` | `requireParent('send', showForm)` |
| Report email section (E) | inside report | covered by report gate |

**TTL options.**

| Option | Strengths | Weaknesses | Risk |
|---|---|---|---|
| A. 5 min absolute, cleared on sign-out / grade change / reload (design R-13 as written) | report -> pricing -> payment in ≤2 steps without re-gating | parent hands the phone back to the kid inside 5 min -> kid can reach pricing / external link | medium for G1-2 |
| **B. A + cleared when the parent leaves Góc ba mẹ back to a kid screen (`report-back`), non-sliding** | closes the hand-back window on the main path; all multi-step parent flows live inside the report screen (`view` state) so AC-9.1 is unaffected; share + email on one summary screen still share one pass | a parent who gates on BatchSummary, then opens Góc ba mẹ within 5 min, is not re-gated (acceptable: same adult, same minute) | low |
| C. Re-gate every action | strongest | breaks AC-9.1 step budget (gate counts as a screen) | blocking |

`Ruling:` **B** (5 minutes kept, absolute and non-sliding; exit from Góc ba mẹ
clears it). Human may keep A.

**Consequences.** No storage, no server state, no PII. Bypass via devtools is
out of scope (adult-level effort, and there is no in-app purchase - payment
needs a parent's bank app).

**Canonical references.** WAI-ARIA APG Modal Dialog:
https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ ; Apple Kids apps -
parental gates: https://developer.apple.com/app-store/kids-apps/

---

### KUX-4 - Engagement store additions, reward idempotency, report data sourcing

**Status:** proposed.

#### KUX-4a `homeItems` + `grantedObjectives` (local store, synced inside `engagement_state`)

**Context.** `EngagementState` (`store.ts:35-58`) is persisted as one JSON blob
(`STORAGE_KEY`, `:101`) and synced whole into `practice.engagement_state.state jsonb`
(`0008_engagement_sync.sql:7-11`) with a 512 KB size check
(`0009_engagement_state_guard.sql:12-14`). The 0009 header states the blob is
self-reported and must never feed rankings/rewards/teacher metrics without
server recomputation. Leaderboard is computed from `results.points`
(`0004_leaderboard.sql:31-38`), not from stars.

**Options (where the idempotency guard lives).**

| Option | Strengths | Weaknesses | Risk | Fit |
|---|---|---|---|---|
| A. DB table `reward_grants(account_id, objective_id unique)` + RPC | server-enforced uniqueness | guards a **self-reported** star bank - the client can still write any `totalStars` into its own row, so the DB guard buys no integrity; guests have no account; new table + migration + rollback surface | medium | poor |
| **B. `grantedObjectives` inside the local store, synced in the JSON blob** | same trust level as the stars it guards; works for guests; no schema change (jsonb, size-bounded); union-merge is naturally idempotent | not tamper-proof (neither are stars) | low | strong |
| C. UI-only `useRef` (today) | none | fails AC-4.4 on remount; design §3.5.b demands a store-level guard | high | none |

`Ruling:` **B.** Integrity of cosmetic rewards is bounded by the self-reported
blob; anything leaderboard-relevant already derives from `results`.

**Decision.**
```ts
// store.ts - EngagementState additions (both optional: old blobs stay valid)
homeItems?: string[];                        // ids from src/data/homeItems.ts pool, cap 64
giftGrants?: Record<string, string>;         // stickerId -> granted itemId (AC-4.4 replay)
grantedObjectives?: Record<string, string>;  // objectiveId -> ISO time; NO cap - the keyspace is bounded by replayable content objectives (rounds/batches/stickers ~ few hundred), so dedup must survive indefinitely per AC-4.4
```
- Objective ids (F-6): `round:<seed>:<roundNumber>`, `batch:<seed>`,
  `gift:<stickerId>`. Pattern `^(round|batch|gift):[A-Za-z0-9:_-]{1,80}$`.
- API preserved: `recordRoundResult(gradeId, roundIndex, points, maxPoints, objectiveId?)`
  and `recordBatchResult(gradeId, objectiveId?)`. When `objectiveId` is present
  and already granted, return `{ stars: 0 | chestStars: 0, newStickers: [],
  alreadyGranted: true }` and **do not** touch `totalStars`, grades, stickers
  or streak; the summary renders "Đã nhận thưởng rồi". Existing callers without
  the param keep today's behaviour (existing `store.test.ts` stays green).
  `RoundSummary`/`BatchSummary` receive the batch `seed` via a new optional
  prop from `BatchScreen` (which holds `batch`).
- New `grantHomeItem(stickerId, boxIndex)`: first call computes
  `pool[hash(stickerId + ':' + boxIndex) % notOwned.length]`, then persists
  `giftGrants[stickerId] = itemId` + `homeItems` + `gift:<stickerId>`
  atomically in one `persist()`; subsequent calls return `giftGrants[stickerId]`
  directly (recompute cannot recover it - the item already left the pool).
  New field `giftGrants?: Record<string, string>` (stickerId -> itemId, both
  pattern-checked) rides the same sanitize/merge union; FF-8 tests replay
  after reload and after a remote-merge round trip.
- **Sync (F-1, mandatory):** `sanitizeRemote` accepts `homeItems` (string array
  filtered to known pool ids, cap 64) and `grantedObjectives` (pattern-checked
  keys, string values, no cap - eviction would break AC-4.4); `mergeEngagement`
  unions both (homeItems: local order then remote extras; grantedObjectives:
  key union, newer timestamp kept). Both remain idempotent under re-merge,
  matching the module's "monotonic, re-mergeable forever" contract (`sync.ts:60-63`).
  Export `sanitizeRemote` as `/** @internal test */` so FF-9 can exercise it.
- Size: 300 ids × ~40 bytes ≈ 12 KB worst case, far below 512 KB.

#### KUX-4b Report data sourcing (AC-5.2, AC-5.3)

**Context.** `ParentReportScreen` reads only the local store (`ParentReportScreen.tsx:33-34`)
and shows "Số liệu được lưu trên thiết bị này - chưa đồng bộ" (`:124-126`).
`results` has `time_used_sec` (`0021`), `program` (`0004`), `form_id`
(`0017:194-196`), self-read RLS (`0002:30-32`) and admin-all RLS (F-7).
Index `results_account_idx (account_id, created_at desc)` exists (`0002:17`).

**Decision.** New module `src/lib/parentReport/serverReport.ts` (lazy chunk with
the report):
- `fetchWeekMinutes(now)`: `from('results').select('created_at,time_used_sec')
  .eq('account_id', uid).gte('created_at', now-7d).order('created_at',{ascending:false}).limit(500)`;
  bucket by `Asia/Ho_Chi_Minh` calendar day via one shared helper `vnDayISO()`
  (fixed timezone per CONVENTIONS). Truncation at the limit is reported as an
  error, not as a short week (CONVENTIONS "bounded reads").
- `fetchMockTrend(programId)`: keyset-paginate
  `select('created_at,points,max_points,total_questions,grade_id,form_id,program')
  .eq('account_id', uid).eq('program', programId).is('form_id', null)
  .order('created_at',{ascending:false})` in pages of 100, filtering each page
  via `isMockExamRow(row)` = `total_questions >= examConfigForGrade(row.grade_id).examCount`,
  stopping when 8 qualifying mocks are collected or history is exhausted
  (a page returning <100 rows = exhausted). A fixed `limit(50)` BEFORE
  filtering was rejected: 50 newer drills could hide all older mocks.
  Scan is bounded by a hard cap of 5 pages (500 rows); hitting the cap with
  <8 mocks surfaces a "đang tải thêm" truncation note, never silent-empty. Classifier lives in `src/lib/exam/resultKind.ts`, shared
  with the SQL helper in KUX-12 (parity enforced by FF-12).
- **Fail-closed:** query errors return `{ error }` -> section error state with
  "Thử lại"; never rendered as empty data (CONVENTIONS "fail-closed source reads").
- **Owner binding:** `uid` from `getSession()`; explicit `.eq('account_id', uid)`
  on every query (F-7). Guest (no session) never queries -> teaser state.
- Section C (weakest 3) and D (achievements) read the local store, which for a
  logged-in student **is** the merged `engagement_state` mirror after
  `bindEngagement` (`sync.ts:663-705`). `sync.ts` gains `engagementBound():
  Promise<void>` (resolves when the bind cycle settles or fails) and the report
  awaits it before rendering C/D for logged-in users; the "chưa đồng bộ" note
  shows only for guests (design §3.7 D).

`Ruling:` mock trend = IOE mock rows only (forms excluded via `form_id is null`;
telemetry already distinguishes forms as their own mode,
`ExamScreen.tsx:222`). Adding a `results.mode` column was rejected: schema
change for one chart, history would stay unclassified anyway, and it widens the
rollback surface. Revisit if CR-46 ever makes drill ≥ exam counts (FF-12 fails
first).

#### KUX-4c Minutes-today accumulator (design §3.10 wellbeing swap - "should")

`Ruling:` build it as a **separate local key** `beheo-wellbeing-v1`
(`{ dateISO, seconds }`), not inside `EngagementState`, not synced: it is a
per-device nudge, and putting it in the blob would require merge semantics
for a value that is wrong to max-merge. Bumped from `BatchSummary`
(`result.timeUsedSec`) and exam results (`result.timeUsedSec`). Cleared in
`clearEngagementLocal` / `parkOwnerBlob` paths so a shared device does not carry
one child's minutes to the next. Non-PII.

**Consequences (KUX-4 overall).** No migration. Two optional fields. FF-8/FF-9
pin idempotency and sync round-trip. Rollback hazard handled in §5 (R0).

**Canonical references.** Supabase RLS:
https://supabase.com/docs/guides/database/postgres/row-level-security ;
PostgREST row limits: https://postgrest.org/en/stable/references/api/pagination_count.html

---

### KUX-5 - Grade-band detection and where the band flag lives

**Context.** Design §1.2/§4.4: `bandForGrade(gradeId)` -> `'g12'` for
`grade-1|grade-2`, else `'g35'`; `BAND` descriptor map. The grade is known in
`App.tsx` as `selectedGradeId` (`:62`) and `batch.gradeId` (`:501`); question
components sit 3-4 levels below `BatchScreen`.

**Options.**

| Option | Strengths | Weaknesses | Risk |
|---|---|---|---|
| A. Prop-drill `band` | explicit | touches the props of ~20 question/summary components (API churn, constraint "preserve component APIs") | medium |
| B. Module helper only (`bandForGrade` called where `gradeId` is available) | pure | most leaf components do not receive `gradeId` today | medium |
| **C. Pure helper in `theme.ts` + `ViewerContext` provided once in `App.tsx`** | zero prop changes; default value reproduces today's behaviour for every existing unit test that renders a component without the provider | context indirection | low |

`Ruling:` **C.**

**Decision.**
- `theme.ts`: `export type Band = 'g12' | 'g35'`, `bandForGrade(gradeId?)`,
  `BAND` map exactly as design §4.4 (pure, unit-tested next to `getLand`).
- `src/lib/ui/viewer.tsx`: `ViewerContext` value
  `{ band: Band; auth: 'off'|'guest'|'student'|'admin'; displayName?: string }`,
  hooks `useBand()`, `useViewer()`. **Default** `{ band: 'g35', auth: 'off' }`:
  no autoplay, logged-in-only cards hidden - so existing component tests keep
  passing without wrappers.
- `App.tsx` wraps the `shell(...)` output **and** the `ExamScreen` return
  (which renders outside `LandShell`, `:464-477`) with the provider:
  band from `batch?.gradeId ?? selectedGradeId`; auth from `authMode`;
  `displayName` from `myAccount?.display_name`.
- GradeSelect (no grade picked yet) computes its own autoplay per R-29:
  `allowedGrades.length > 0 && allowedGrades.every(g => bandForGrade(g) === 'g12')`.

---

### KUX-6 - Asset pipeline: mascot set, gift art, Andika, payment QR

**Status:** proposed; **blocked on E-1** (constitution text edit) for any file
under the new dirs.

**Context.** Design §3.3.c: Tier 1 SVG required (5 files, ≤12 KB gzip each),
Tier 2 dotLottie optional, emoji fallback until art lands; provenance record
per file with license `LicenseRef-VieSchool-Owned`. Installed:
`@lottiefiles/dotlottie-react@0.19.16`, `@lottiefiles/dotlottie-web@0.80.0`
(`package.json`). `EmojiLottiePlayer.tsx` is "the ONLY importer of
@lottiefiles/*" and self-hosts the WASM via `?url` (`:1-14`);
`check-bundle-budget.mjs` fails the build if lottie refs leak into the entry
chunk (`:83`). `check-attribution.mjs` checks dirs under
`images/ emoji/ fonts/ sfx/` only (`:138-155`) and requires a license file in
every `public/fonts/<dir>/` (`:157-162`). A `proprietary` collection already
exists for VieSchool-original assets (`/images/v6/`, `/sfx/`).

**Mascot format options.**

| Option | Strengths | Weaknesses | Risk | Fit |
|---|---|---|---|---|
| **A. SVG per state (Tier 1) + optional Lottie JSON (Tier 2) through the existing lazy player** | tiny, crisp at 48-360px, drawable into Canvas for the share card, static = reduced-motion + poster for free, CSS keyframes already exist (`mascot-float/pop/celebrate`, `tailwind.config.js`) | Tier 2 needs animator effort | low | strong (constitution #5: ≤1 player pre-answer - SVG mascot uses 0) |
| B. Lottie only | richest motion | every mascot render needs the WASM chunk; breaks the "mascot static before answer" rule; no Canvas path | high | weak |
| C. PNG sequence / sprite | simple tooling | heavy (5 states × frames × DPR), blurry when scaled, many requests | medium | poor |

`Ruling:` **A.** Tier 2 Lottie uses **JSON** (same fetch-then-`data` path the
emoji player already has), not `.lottie` as design §3.3.c wrote - this keeps
one loader and one inventory rule. Deviation noted for the Design Lead.

**Decision.**
- `src/lib/mascot/assets.ts`: `MASCOT_ART_READY = false` until the SVGs are
  committed; `mascotSvgUrl(state)` -> `/mascot/svg/be-heo-<state>.svg`.
  While `false`, `Mascot` renders today's 🐷 `EmojiVisual` (no 404 traffic).
- `Mascot.tsx` v2: new prop `state: 'idle'|'celebrate'|'encourage'|'think'`,
  `size: 'hero'|'block'|'inline'`; legacy `mood` accepted and mapped
  (`greeting->idle`, `happy->celebrate`, `celebrating->celebrate`,
  `encouraging->encourage`) so un-migrated call sites keep compiling; DOM attr
  `data-mascot-state` replaces `data-mascot-mood` (R-19; 5 test files updated
  deliberately). SVG via `<img src width height alt="" aria-hidden>` inside the
  existing `role="img"` wrapper - never a static import (constitution #4 /
  architecture.md ADR-7). `onError` -> emoji fallback for the session.
- Tier 2: `EmojiLottiePlayer` gains optional `src?: string` (overrides
  `lottieUrl(lottieKey)`); still the single `@lottiefiles` importer; same
  session circuit breaker. Mascot player only after an answer (2-player budget).
- **Inventory** (`check-attribution.mjs`): add `mascot` and `payment` to the
  top-level dir scan; new collections `vieschool-mascot` (paths `/mascot/`,
  license `LicenseRef-VieSchool-Owned`) and `vieschool-payment` (paths
  `/payment/`, license `proprietary`); new `files[]` array in
  `attribution.json` with the per-file provenance record from design §3.3.c
  (`file, title, source, generator, promptRef, humanEditedBy, date, license,
  toolTermsUrl, reviewStatus, reviewChecklist`), checked **bidirectionally**
  for `/mascot/**` (file without record, record without file, `reviewStatus
  === 'approved'`, checklist contains "no sad/guilt affect"). When
  `MASCOT_ART_READY` is true, all 5 Tier 1 files must exist.
- **Payment QR** `public/payment/vietqr-tpbank.png`: provenance record +
  **sha256 pinned** in the record and verified by the script (T-4 tamper guard).
- **Gift art:** Tier 1 = 🎁 via `EmojiVisual` (already Twemoji-licensed); Tier 2
  optional `public/mascot/svg/gift-{closed|open}.svg` under the same records.
  The 24 decoration emojis in design §3.5.b must each resolve in
  `public/emoji/svg/` - WP-18 adds a unit test over the pool.
- **Andika** (R-01 confirmed): one-time maintainer copy of the OFL woff2
  subsets (latin + vietnamese, 400 + 700) into `public/fonts/andika/` with
  `OFL.txt`; collection `andika` (`OFL-1.1`). No npm dependency (the
  `@fontsource/baloo-2` devDependency pattern was considered and rejected - a
  one-time copy needs no manifest change). `@font-face` blocks in
  `src/index.css` with `unicode-range` + `font-display: swap`; Tailwind
  `fontFamily.reading = ['Andika', '"Be Vietnam Pro"', 'ui-sans-serif',
  'sans-serif']`. Browsers fetch a face only when text using it renders, so
  G3-5 never downloads Andika; no `<link rel=preload>`. Measured file sizes go
  into the WP-24 perf report.

**Canonical references.** dotLottie web: https://github.com/LottieFiles/dotlottie-web ;
SIL Andika + OFL: https://software.sil.org/andika/ , https://openfontlicense.org ;
MDN `font-display`: https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display

---

### KUX-7 - `VITE_UX_V2` feature flag

**Status:** proposed - **no global flag**.

**Context.** Plan: a flag is required only if risk is high; otherwise
`git revert` + redeploy (<10 min, rehearsed in WP-26). Design §11.7 recommended
a flag around launchpad + feedback (largest e2e churn). Vite inlines
`import.meta.env.VITE_*` at **build time**.

| Option | Strengths | Weaknesses | Risk |
|---|---|---|---|
| A. Global `VITE_UX_V2` over all kid surfaces | old UI kept in the bundle | flipping it = env change **+ rebuild + redeploy** - the same latency as a revert; two render paths for ~15 components; e2e must run both or the off-path rots; bundle grows past the 121 kB entry budget risk (`check-bundle-budget.mjs:40`) | high (complexity) |
| B. Narrow flag (launchpad + feedback only) | smaller dual path | same build-time latency; the store/sync changes cannot be flagged anyway (data format) | medium |
| **C. No flag; release units = separate merge commits (R0, Drop-1, Drop-2, migration) + Vercel Instant Rollback as fast path + `git revert` as durable path** | rollback in seconds without a build (Instant Rollback), durable fix in <10 min; one code path; e2e updated once per contract change #8 | Hobby plan limits Instant Rollback to the immediately previous production deployment -> main freeze during observation windows (§5) | low |
| D. Runtime remote kill-switch (config fetched at boot) | instant flip | new runtime dependency + boot latency for a one-off; out of scope | medium |

`Ruling:` **C.** CONVENTIONS (Deployer) asks for a documented kill-switch on
risky paths; here the kill-switch is the Instant Rollback + revert pair, proven
in WP-26 (§5). If the human wants a flag anyway, B is the only sane variant.

**Canonical references.** Vite env vars are statically replaced:
https://vite.dev/guide/env-and-mode ; Vercel Instant Rollback:
https://vercel.com/docs/instant-rollback

---

### KUX-8 - Pricing card data + transfer format

**Context.** AC-9.1: prices only from `docs/sales/01-pricing.md` (DRAFT v1,
03/10/2026): Mùa thi 249.000đ / 6 tháng, Năm học 399.000đ / 12 tháng, Founding
299.000đ/năm (300 gia đình đầu hoặc đến 31/12/2026), anh chị em -50% từ con thứ
2, "Giá chưa bao gồm VAT" (`01-pricing.md:3-4,32-35`). Bank details and transfer
note `VS <sdt> <goi>` from CR-60 (`CR-60-landing-pricing-payment.md:19-20,42-43`),
human ruling O-3. Plan codes MUATHI/NAMHOC/FOUNDING (R-11, ops to confirm).

**Decision.** `src/lib/pricing/pricingFamily.ts` (static, typed, `as const`):
`PRICING_SOURCE` (doc path + version string), `PRICING_FAMILY[]`
(`{ code, nameVi, priceVnd, termVi, notesVi? }` in source-doc order),
`SIBLING_NOTE_VI`, `VAT_NOTE_VI`, `PAYMENT_ACCOUNT` (`bank, accountNo, holder,
qrSrc: '/payment/vietqr-tpbank.png'`), `transferNoteTemplate(code)` ->
`VS <SĐT ba mẹ> ${code}`, `formatVnd(n)` -> `399.000đ`, `ZALO_URL` from optional
`import.meta.env.VITE_ZALO_URL` accepted only if its origin is `https://zalo.me`
(else `null` -> buttons hidden, R-12/O-5).
- The app **never collects** the phone number: the template is copied with
  the placeholder; the parent types it in their bank app. No input field
  (no-new-PII, FF-11).
- No entitlement flag, no "paid" state in the client (honest manual
  activation copy, design `pay.manual`).
- FF-13 parses `01-pricing.md` and fails if any price/term in the constant
  drifts from the doc.

---

### KUX-9 - Share image: Canvas 2D + Web Share API

**Context.** AC-9.2, design §3.8.b: 1080×1080 PNG, client-side, no new
dependency, logged-in only (R-16), first name + grade only, native share if
`canShare({files})`, else download + copy text, no third-party SDK/URL.

**Decision.**
- `src/lib/share/achievementCard.ts` (pure, unit-tested):
  `type AchievementPayload = { firstName: string; gradeLabel: string;
  headline: string; statLine: string; dateText: string }` - **the only input the
  renderer accepts**. `buildPayload(event, displayName, gradeLabel, now)` builds
  headline/statLine from fixed Vietnamese templates + numbers;
  `firstNameOf(displayName)` = trim, strip leading `bé ` (same rule as
  `GradeSelect.tsx:102`), last whitespace token, letters/diacritics only, max 20
  chars; `dateText` via `Intl.DateTimeFormat('vi-VN', { timeZone:
  'Asia/Ho_Chi_Minh' })`. `drawAchievementCard(ctx, payload, mascotImg)` draws
  per design layout.
- `src/lib/share/shareImage.ts`: `await document.fonts.load(...)` for Baloo 2
  800 / Be Vietnam Pro 700 with a 2s cap; mascot `Image` from
  `/mascot/svg/be-heo-celebrate.svg` (fallback Twemoji 🐷 svg) - same-origin, so
  the canvas is never tainted and `toBlob('image/png')` works; `toBlob` null ->
  error state. Share: `navigator.canShare?.({ files: [file] })` ->
  `navigator.share({ files, text })`; `AbortError` = user cancelled (not an
  error); fallback `<a download="english-arena-thanh-tich.png">` on an object URL
  (revoked after click) + clipboard copy of the text.
- `src/components/parent/ShareAchievementSheet.tsx` - `React.lazy` chunk,
  `useModalA11y`, states generating/ready/error/shared.
- Entry points gated (KUX-3) and hidden unless `useViewer().auth === 'student'`.

**No-PII guarantee (executable).** Unit test wraps a fake 2D context and asserts
every `fillText` string is in `{firstName + ' - ' + gradeLabel, headline,
statLine, dateText, 'English Arena - ea.vieschool.com'}`; file name contains no
name; payload type has no id/email/avatar fields (FF-11 scans it).

**Canonical references.** MDN `Navigator.canShare`:
https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare ; MDN
`HTMLCanvasElement.toBlob`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob ;
tainted canvas rules: https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image

---

### KUX-10 - Exam header hybrid: minimal-touch injection

**Context.** AC-7.1, design §3.9: header only (`#132433` -> `EXAM_HEADER_BRAND`,
gold line, inline static mascot), `END_SESSION` token on NỘP BÀI/KẾT THÚC,
interior unchanged, results = brand celebration + fork + send/share cards.
`ExamScreen.tsx` is 1234 lines; header JSX at `:368-402`; `ExamResult` is a local
function at `:906-1014`; arena result separate (`:1063+`, out of scope).

**Decision.**
1. **Preparatory pure move** (own commit, zero behaviour change): `ExamResult`
   -> `src/components/exam/ExamResult.tsx`, same props, same testids
   (`exam-result`, `exam-score`, `exam-review-toggle`, `exam-retry`). Existing
   `ExamScreen.*.test.tsx` suites must pass unchanged on that commit.
2. Header: replace two class strings with `EXAM_HEADER_BRAND` / `END_SESSION`
   tokens and insert `<Mascot state={headerState} size="inline" />` before the
   title block. `headerState` = `'idle'` in `exam` mode always (no reaction, IOE
   fidelity); in `practice`/`review` derived from the existing `verdict` state
   (`:96`) -> `celebrate`/`encourage`, static pose swap.
3. Results restyle happens in the moved file only. Interior (`:404-505`),
   `ExamIntro`, `ArenaResult`, scoring and save paths untouched.
4. The exam interior keeps 44px controls; e2e target scanner (FF-2) exempts
   elements under `data-target-exempt="ioe-fidelity"` set on the interior
   `<main>` only.

---

### KUX-11 - Feedback retry/demo without touching scoring

**Context.** AC-3.2, R-06 (retry ungraded), R-07 (batch + exam practice/review,
not exam). Answers reduce through `practiceSession` reducers dispatched from
`App.tsx:285-308`; `FeedbackPanel` plays the verdict sfx on mount
(`FeedbackPanel.tsx:57-60`).

**Decision.** Retry and "Nghe mẫu" are **local presentational state** inside the
question/feedback components. A retry never calls `onSubmit*` and never touches
`practiceSession`, `batchSession`, the store, telemetry or `results`. The
correct answer is already available to the card (it renders it in the panel).
FF-10 asserts identical `RoundOutcome` for a scripted round with and without a
retry.

---

### KUX-12 - Weekly digest email: new sections

**Context.** F-3. Current body (`0037:323-438`): 7-day totals + per-program
table from `results`, minutes from `time_used_sec`, `email_esc` on the display
name, `practice.send_email`, send log in `parent_report_sends`; revoked from all
API roles (`:438`).

**Decision.** Migration `0039_kids_ux_weekly_digest.sql`:
- `practice.is_mock_result(p_grade text, p_program text, p_total int,
  p_form_id text) returns boolean immutable` - thresholds 50/80/120/160/200 by
  grade, `program in ('english','math','science')`, `form_id is null`. Mirrors
  `resultKind.ts` (FF-12 parity test reads both).
- `practice.skill_label_vi(p_key text) returns text immutable` - **whitelist**
  CASE over the keys of `SKILL_LABELS` + `QB_SKILL_LABELS`
  (`src/lib/engagement/skills.ts:7-20,114+`); unknown key -> `null` (row
  skipped). Never interpolates a raw key (T-6).
- `practice.weekly_report_html(p_account_id uuid) returns text` (security
  definer, `search_path = ''`, revoked from `public, anon, authenticated`) -
  renders the full email; `send_weekly_reports()` becomes the loop that calls
  it and sends. Splitting render from send makes the digest testable on the
  demo account without emailing anyone.
- New sections (design §3.8.c0): **Tuần này** - sessions, minutes, distinct
  active days (`count(distinct (created_at at time zone 'Asia/Ho_Chi_Minh')::date)`);
  **Thi thử** - latest mock percentage + delta vs previous, via
  `is_mock_result`; **Nên luyện** - top 3 weakest skills over the last 7 days
  from `engagement_state.state -> 'stats' -> 'skillDays'` (≥10 answers), plus
  one suggestion sentence. Empty states per section ("Chưa có dữ liệu tuần
  này").
- **Defensive JSON:** every jsonb hop checks `jsonb_typeof` and the per-contact
  section block runs inside `begin ... exception when others then ... end` so
  one malformed self-reported blob degrades that section, never aborts the run
  for every parent.
- Prepared (not auto-applied) down file `supabase/rollback/0039_down.sql`
  re-creating the 0037 body and dropping the three helpers.

`Ruling:` reading self-reported `engagement_state` skill stats for the
**parent's own child's** email is allowed: 0009 forbids feeding rankings,
leaderboards, rewards or teacher metrics, none of which this is; the same data
already renders in-app section C. Recorded so the next reviewer does not flag
it blind.

**Canonical reference.** pg_cron: https://github.com/citusdata/pg_cron

---

### KUX-13 - Funnel step events (privacy-matrix compliant)

**Context.** F-8; plan metric "funnel step events present"; design event names
(`parent_gate_shown`, `parent_gate_passed`, `pricing_opened`, `plan_selected`,
`payment_info_viewed`, `copy_clicked`, `zalo_clicked`); privacy matrix forbids
user_id, display name, email, device-bound id.

| Option | Strengths | Weaknesses | Risk |
|---|---|---|---|
| A. Third-party analytics | dashboards | constitution #4 (no runtime third-party), new data processor, child data | blocking |
| B. New server table + RPC | real funnel data | new data collection about children -> formal CR + privacy review per plan | high |
| **C. Client-only event bus `src/lib/funnel.ts`** (`emitFunnel(name, payload)` dispatches `CustomEvent('ea-funnel')`; dev builds also push to a bounded `window.__EA_FUNNEL__` array for e2e) | proves step events in WP-22; zero data leaves the device | no production metrics | low |

`Ruling:` **C**; server ingestion -> CR backlog (needs privacy review).
Payload type is a closed union `{ surface?, gradeBand?, plan?, field? }`
(FF-11).

---

## 2. Fitness functions (fail the build or the review)

Run order: `npm test` (vitest scanners) -> `npm run code:reliability` ->
`npm run audit:attribution` -> `npm run build && node scripts/check-bundle-budget.mjs`
-> `npm run test:e2e`. Each row names the file Dev creates or extends.

| ID | Dimension | Check (executable) | Where | Fails when |
|---|---|---|---|---|
| FF-1 | Safety (AC-5.1) | Source scanner over `src/**/*.tsx`: any `href=` with an absolute `http(s)` URL, `window.open(`, `navigator.share(`, `location.href =` outside the allowlist (`GatedLink.tsx`, `shareImage.ts`) | `src/lib/gateGuard.test.ts` (new, same style as `colorPairingGuard.test.ts`) | an ungated external/purchase/share call appears |
| FF-1e | Safety (AC-5.1) | E2E: on every kid route, click each external anchor and each share/send/report entry -> `role=dialog` named "Dành cho ba mẹ" must appear before any navigation/popup | `e2e/parent-gate.spec.ts` | destination reached without the gate |
| FF-2 | A11y (AC-8.2) | E2E DOM box scan at 375 and 768: on G1-2 routes (launchpad, sheet index + each detail, each round type, summaries, fork, gift) every visible `button, a, input, [role=button], [tabindex="0"]` has width and height ≥ 76; G3-5: option tiles ≥76, others ≥44; elements inside `[data-target-exempt="ioe-fidelity"]` ≥44 | `e2e/kids-targets.spec.ts` | any element below its band floor |
| FF-2s | A11y | Scanner: `data-target-exempt` appears only on the ExamScreen interior `<main>` (exact count 1) | `gateGuard.test.ts` | new exemptions sneak in |
| FF-3 | Contrast | Extend `colorPairingGuard.test.ts`: (a) existing same-shade rule; (b) light text (`text-white`, `text-slate-100..300`, `text-amber-100..200`, `text-sky-100..200`) on the same line as a light surface (`bg-white`, `bg-sky-50`, `bg-amber-50..300`, `from-amber-300`); (c) dark text (`text-slate-700..950`) on the same line as a navy surface (`bg-[#0E1F42]`, `bg-[#162C55]`, `bg-[#101a36]`) | `src/lib/colorPairingGuard.test.ts` | a cross-surface pairing is written |
| FF-3t | Contrast | Token table test: every new token in `tokens.ts` with a text/surface pair is listed in `TOKEN_PAIRS` and its WCAG ratio, computed from `tailwindcss/colors` hex values (alpha-composited on the navy surface), meets the floor declared in design §4.1 | `src/lib/ui/tokens.contrast.test.ts` | token edited below its declared ratio, or a new token without a pair entry |
| FF-4 | Copy (AC-3.1, AC-4.3) | Forbidden-string scanner over kid-surface copy: `mất chuỗi`, `sắp mất`, `đừng để`, `kẻo`, `chỉ còn .* giờ`, `Heo buồn`, `bỏ lỡ`, `buồn`, `khóc`, `thất vọng`, `nhớ em`, `bỏ rơi`, `giận`, `tiếc quá` (sticker names `N ngày liên tiếp` allowlisted) | `src/lib/copyGuard.test.ts` | loss-threat or guilt copy ships |
| FF-5 | Dash rule | Extend `dashGuard.test.ts` scope to `supabase/migrations/00(39|[4-9]\d)*.sql` (email HTML copy) | `src/lib/dashGuard.test.ts` | en/em dash in new email copy |
| FF-6 | Authz (AC-5.3) | Scanner: every `.from('results')` / `.from('engagement_state')` / `.from('parent_contacts')` chain in `src/lib/**` (non-admin modules) contains `.eq('account_id'` | `gateGuard.test.ts` | a report query relies on RLS alone (F-7) |
| FF-6e | Authz (AC-5.3) | Live denial test: session A selects B's `results`/`engagement_state`/`parent_contacts` rows -> 0 rows; anon -> 0 rows; `weekly_report_html` not executable by `authenticated` | WP-22 `e2e/parent-authz.spec.ts` (demo accounts, `docs/demo-accounts.md`) | any cross-account row returned |
| FF-7 | Gold budget | E2E: per kid route, count visible interactive elements whose computed background uses the amber-300 gradient stop -> ≤1 | `e2e/kids-tokens.spec.ts` | two competing gold primaries |
| FF-8 | Idempotency (AC-4.4) | Unit: same `objectiveId` twice -> second call returns `alreadyGranted`, `totalStars`/grades/stickers/streak unchanged; `grantHomeItem` twice -> same item, `homeItems` length +1 only; summary remount (render twice) -> one grant | `store.test.ts`, `RoundSummary.test.tsx`, `BatchSummary.test.tsx` | double grant |
| FF-9 | Sync class gate (F-1) | Unit: a fully populated `EngagementState` fixture (every optional key set) survives `sanitizeRemote(JSON round-trip)` and `mergeEngagement(x, empty)` / `mergeEngagement(empty, x)` with deep equality per key; plus merge idempotency `merge(merge(a,b),b) == merge(a,b)` | `sync.test.ts` | any store field is dropped by sync - including future ones |
| FF-10 | Scoring invariance (R-06) | Unit: scripted round with a wrong answer + retry + demo yields a `RoundOutcome` deep-equal to the same round without retry; no `onSubmit*` call during retry | `QuestionCard.retry.test.tsx` | retry changes score/stats |
| FF-11 | No-new-PII | `scripts/check-no-new-pii.mjs` (wired into `code:reliability`): (a) migrations ≥0039 contain no `add column` / `create table` column whose name matches `email|phone|sdt|name|birth|address|school|class|avatar|ip|device` unless listed in `tests/fixtures/pii-allowlist.json` with a CR id; (b) keys of `EngagementState` (parsed from `store.ts`) ⊆ committed baseline + `{homeItems, grantedObjectives}`; (c) object keys in every `.insert({` in `src/lib/practiceResults.ts` unchanged vs baseline; (d) `AchievementPayload` and funnel payload types contain only whitelisted keys; (e) no `<input` in `src/components/parent/Pricing*`/`Payment*` | `scripts/check-no-new-pii.mjs` + `tests/check-no-new-pii.selftest.mjs` | any new child-PII field or collection path |
| FF-12 | Data parity (F-2) | Unit: `max(drillCount) < min(examCount)` over grades 1-5 (`examConfigForGrade`); thresholds in `0039_*.sql` `is_mock_result` equal `examCount` per grade; SQL `skill_label_vi` keys equal `SKILL_LABELS ∪ QB_SKILL_LABELS` keys | `src/lib/exam/resultKind.test.ts` | classifier or label map drifts between TS and SQL |
| FF-13 | Pricing source of truth | Unit: parse `docs/sales/01-pricing.md` rows for Mùa thi / Năm học / Founding / anh chị em / VAT; assert `PRICING_FAMILY` + notes match | `src/lib/pricing/pricingFamily.test.ts` | price drift ("KHÔNG bịa số") |
| FF-14 | English audio preserved | Unit: `speakWord`/`speakSentence` still set `lang='en-US'`, still try the mp3 path first, rates unchanged; `speakInstruction` never requests an mp3 while `INSTRUCTION_AUDIO_FILES=false` | `speech.test.ts` | instruction work regresses content audio |
| FF-15 | Assets (C3/C4) | `check-attribution.mjs` extended per KUX-6 (mascot/payment dirs, `files[]` provenance bidirectional, QR sha256, Andika OFL); existing `e2e/same-origin.spec.ts` extended to the new flows (launchpad, gate, report, pricing, share) | script + e2e | unattributed asset, tampered QR, or third-party request |
| FF-16 | Perf / layering | Existing `check-bundle-budget.mjs` (entry JS ≤121 kB, CSS ≤10 kB, no lottie in entry) stays green; parent/report/pricing/share modules are `React.lazy` chunks; scanner: `@lottiefiles` imported only by `EmojiLottiePlayer.tsx` | build + `check-reliability` | entry bloat or second lottie importer |
| FF-17 | Dependency | Manifest diff: `dependencies`/`devDependencies` in `package.json` unchanged vs `edfa87d` unless an ADR in this file names the package | review checklist + `check-no-new-pii.mjs` (c2) | undeclared dependency |
| FF-18 | Motion (C6) | Scanner: every new keyframe name in `tailwind.config.js`/`index.css` (`speaker-pulse`, `sheet-up`, `trail-glow`, `lid-pop`, `item-rise`, `item-home`) is used only with a `motion-reduce:` pair on the same className | `src/lib/motionGuard.test.ts` | animation without reduced-motion fallback |

Mitigations without a row here are hopes, not controls - the threat model below
maps each mitigation to one of these IDs or a named test.

---

## 3. Threat model (STRIDE-lite)

Assets: child progress data, parent email, parent purchase intent, brand
integrity of payment info. No money moves in-app.

| # | Component / flow | Threat (STRIDE) | Impact | Mitigation | Verified by |
|---|---|---|---|---|---|
| T-1 | Parent gate | **Elevation** - G1-2 child passes the gate (guess, sibling help, hand-back within TTL) | child reaches pricing, Zalo/external site, share, email form | word-form 6-9 multiplication (unreadable + unsolvable for G1-2); 3-miss 10s cooldown; token in memory only, 5 min absolute, cleared on report exit / sign-out / grade change / reload (KUX-3 B); destination components re-check `isGatePassed` on mount; no in-app purchase exists | FF-1, FF-1e, `parentGate.test.ts` (TTL, clear paths), `ParentGate.test.tsx` (words never digits, cooldown) |
| T-1b | Parent gate | **Spoofing** - devtools sets the token | same as T-1 | accepted residual: adult-level effort; gate is friction, not auth | documented here |
| T-2 | Report reads (`results`, `engagement_state`, `parent_contacts`) | **Information disclosure** - account A reads B's data; admin session over-reads via `results_admin_all` (F-7) | child data leak | RLS self-read policies (`0002:30-32`, `0008:23-25`); explicit `.eq('account_id', uid)` on every query; guest never queries | FF-6, FF-6e |
| T-3 | Share image | **Information disclosure** - PII in the PNG or file name | child identity leak on social media | closed `AchievementPayload` type; `firstNameOf` strips to one given name; no avatar/id/school/class; fixed file name; logged-in + gated only | `achievementCard.test.ts` (fillText whitelist), FF-11(d) |
| T-4 | Payment panel | **Spoofing / Tampering** - fake payment claim to get activation; tampered QR/bank details in repo | revenue loss; money sent to wrong account | no client entitlement state; activation only by ops reconciliation against the bank statement using `VS <sdt> <goi>` (CR-60 SOP); QR + account constants reviewed, QR sha256 pinned in attribution; account digits rendered from one constant | FF-15 (sha256), FF-13, code review of `pricingFamily.ts` |
| T-5 | Rewards | **Tampering / Repudiation** - replay a summary (remount, back-nav) to farm stars/gifts | inflated cosmetic stars | store-level `grantedObjectives` (KUX-4a); stars never feed leaderboard (`results.points`, `0004:31-38`) | FF-8 |
| T-5b | Results rows | **Tampering** - student inserts forged `results` rows (self-insert RLS, `0002:33-35`) -> fake mock trend/minutes in the report | misleading parent report | pre-existing; out of scope - CR-68 server-side score attestation | referenced, not new |
| T-6 | Weekly digest | **Tampering (injection)** - crafted `engagement_state` skill keys or numbers injected into email HTML | phishing/HTML injection in parent inbox | whitelist `skill_label_vi`, numeric casts, `email_esc` on every text, per-contact exception block | FF-12, SQL test via `weekly_report_html(demo)` in WP-22 |
| T-7 | Funnel events | **Information disclosure** | identifiers leave device | client-only bus, closed payload type, no network | FF-11(d), unit test asserts no `fetch` in `funnel.ts` |
| T-8 | Parent email capture on summaries | **Denial of service / spam** - repeated verify mails | mailbox abuse | existing server throttle (`verify_send_log`, `0038:69-77`), card hidden when verified | existing `parent-verify-throttled` path + WP-22 |
| T-9 | Rollback | **Tampering (data loss)** - old client strips new keys from server blob (F-1) | kids lose collectibles | release R0 forward-compat sanitize before Drop-1 (§5) | rehearsal step 7 (§5) |

---

## 4. Implementation plan skeleton (Dev expands in WP-13)

Numbering follows PRD "Delivery shape". Order is token-layer first; plan's
per-surface labels for WP-14..18 were indicative and are re-sequenced here.
`Ruling:` re-sequencing keeps the WP count and estimates (Drop-1 46 WP,
Drop-1+2 ≈51 WP) unchanged.

Dependencies: WP-14 -> WP-15 -> {WP-16, WP-17, WP-18} -> WP-19 -> Drop-1 merge.
WP-19a -> {WP-19b, WP-19c} -> Drop-2 merge. R0 (subset of WP-18) ships to prod
first.

| WP | Scope | Files (C = create, M = modify) | Proof |
|---|---|---|---|
| **WP-14** Token + platform layer | design §4 tokens, band, viewer context, keyframes, Andika, modal hook, Mascot v2 (emoji fallback), inventory | M `src/lib/ui/tokens.ts`, M `src/lib/ui/theme.ts` (+`theme.test.ts`), C `src/lib/ui/viewer.tsx`, M `src/App.tsx` (provider only), M `tailwind.config.js`, M `src/index.css` (keyframes + Andika `@font-face`), C `public/fonts/andika/*` + `OFL.txt`, M `public/attribution.json`, M `scripts/check-attribution.mjs`, C `src/hooks/useModalA11y.ts`, M `src/components/ConfirmEndDialog.tsx`, C `src/lib/mascot/assets.ts`, M `src/components/Mascot.tsx` (+test), M 5 tests using `data-mascot-mood`, M `docs/sdlc/constitution.md` (E-1, if not done upstream), M `DESIGN_SYSTEM.md` §3/§6 | FF-3, FF-3t, FF-15, FF-16, FF-18; `ConfirmEndDialog` tests unchanged |
| **WP-15** Voice | KUX-1, KUX-2 | M `src/lib/speech.ts` (+`speech.test.ts`), C `src/hooks/useInstructionSpeaker.ts` (+test), C `src/components/InstructionSpeaker.tsx` (+test) | FF-14; state machine tests incl. StrictMode double mount |
| **WP-16** Launchpad + journey + fork | design §3.1, §3.5.d chip, §3.10, §3.11 GradeSelect | M `src/components/StartBatchScreen.tsx` (props unchanged; band from context), C `src/components/ExploreSheet.tsx` (+test), M `DailyQuestCard.tsx`, `ReviewCard.tsx`, `CoachCard.tsx`, `PetCard.tsx`, `LeaderboardCard.tsx`, `ArenaCard.tsx` (min-h overrides in sheet, streak copy, XP pill removal), M `GradeSelect.tsx` (speaker, EngagementBar chip, pill rename), M `EngagementBar.tsx`, C `src/components/SessionFork.tsx`, M `RoundSummary.tsx`/`BatchSummary.tsx` (fork), M e2e: `auth`, `emoji-visual`, `engagement`, `grades`, `guest-trial`, `mascot` specs + `e2e/utils/batch-flow.ts`, `practice-flow.ts` (open sheet first; 8 spec/test files + 2 utils reference `start-batch-button`) | AC-2.1 DOM count = 4 (G1-2), ≤6 (G3-5); FF-2, FF-7 |
| **WP-17** Feedback + question visuals + exam hybrid | design §3.4, §3.9, §3.11 cards | M `FeedbackPanel.tsx`, `QuestionCard.tsx`, option-kind components (`ImageChoiceQuestion`, `ListeningImageChoiceQuestion`, `DescribeAndChooseImageQuestion`, `Phonics*Question`, `ExtraLetterQuestion`, `ListeningFillBlankQuestion`, `ListeningSentenceFillBlankQuestion`), `optionButtonStyle.ts`; C `src/components/exam/ExamResult.tsx` (pure move commit first), M `ExamScreen.tsx` (header tokens + mascot + verdict strip retry in practice/review), M `BatchScreen.tsx` (`END_SESSION`) | FF-10, FF-2; `ExamScreen.*.test.tsx` green on the move commit |
| **WP-18** Rewards | KUX-4a, design §3.5 | M `src/lib/engagement/store.ts`, M `src/lib/engagement/sync.ts` (sanitize/merge/`engagementBound`), C `src/data/homeItems.ts`, C `src/components/GiftBoxMoment.tsx`, C `src/components/PetHome.tsx`, M `RoundSummary.tsx`, `BatchSummary.tsx` (stars primary, disclosure, seed prop), M `BatchScreen.tsx` (pass seed), M `celebrations/ChestReveal.tsx` if reused, C wellbeing key helper `src/lib/engagement/wellbeing.ts` | FF-8, FF-9; **R0 subset** = sanitize/merge pass-through of `homeItems`/`grantedObjectives` only, shipped first |
| **WP-19** Fitness functions + cross-cutting tests | §2 FF-1..FF-18 not already landed | C `src/lib/gateGuard.test.ts`, `copyGuard.test.ts`, `motionGuard.test.ts`, `src/lib/ui/tokens.contrast.test.ts`, C `scripts/check-no-new-pii.mjs` + selftest + baselines in `tests/fixtures/`, M `package.json` scripts (`code:reliability` only - no deps), C `e2e/kids-targets.spec.ts`, `e2e/kids-tokens.spec.ts`, M `e2e/same-origin.spec.ts` | all FF green; baseline 1020+ unit / 49 e2e still 100% |
| **WP-19a** Parent gate + report enrich | KUX-3, KUX-4b, design §3.6-§3.7 | C `src/lib/parentGate.ts` (+test), C `src/components/parent/ParentGate.tsx` (+test), C `src/hooks/useParentGate.tsx`, C `src/components/GatedLink.tsx`, M `GradeSelect.tsx` (pill + footer), M `ParentReportScreen.tsx` (paper register, sections A-F, `view` state, mount gate, lazy), C `src/components/parent/ParentEmailForm.tsx` (extracted, same `parent-email-*` testids), C `src/lib/parentReport/serverReport.ts` (+test), C `src/lib/exam/resultKind.ts` (+test), C `src/lib/funnel.ts` (+test), C `e2e/parent-gate.spec.ts` | FF-1, FF-1e, FF-6, FF-12; AC-5.2 states (loading/empty/error/teaser) |
| **WP-19b** Digest sections | KUX-12 | C `supabase/migrations/0039_kids_ux_weekly_digest.sql`, C `supabase/rollback/0039_down.sql` | FF-5, FF-12; `select practice.weekly_report_html('<demo uid>')` output reviewed; `begin; \i 0039_down.sql; rollback;` dry run |
| **WP-19c** Conversion surfaces | KUX-8, KUX-9, design §3.8 | C `src/lib/pricing/pricingFamily.ts` (+test), C `src/components/parent/PricingView.tsx`, `PaymentPanel.tsx`, `CopyButton.tsx`, C `public/payment/vietqr-tpbank.png` (+ attribution record, sha256), C `src/lib/share/achievementCard.ts` (+test), `shareImage.ts`, C `src/components/parent/ShareAchievementSheet.tsx`, C `src/components/SendToParentCard.tsx`, M `BatchSummary.tsx`, `RoundSummary.tsx`, `exam/ExamResult.tsx` (entries) | FF-11, FF-13, FF-15; AC-9.1 ≤2 steps in e2e |

Committed-plan rule (CONVENTIONS Developer): WP-13 commits this table expanded
to commit-level steps before the first code commit; departures update it in
the same commit.

---

## 5. Rollback contract

### 5.1 Release units

| Unit | Content | Ships | Independent revert? |
|---|---|---|---|
| **R0** | Forward-compat sync only: `sanitizeRemote` + `mergeEngagement` preserve `homeItems` / `grantedObjectives` (no UI) | prod, ≥1 day before Drop-1 | yes (harmless) |
| **R1 Drop-1** | WP-14..19, one merge commit on `main` | prod after preview verification | yes |
| **R2 Drop-2 frontend** | WP-19a + WP-19c, one merge commit | prod after R1 observation window | yes |
| **R3 Digest** | migration 0039 (WP-19b) | DB, applied with the same mechanism used for 0038 | yes, via `supabase/rollback/0039_down.sql`; decoupled from frontend (reads only existing tables), so a frontend revert does **not** require R3 revert |

Why R0 (T-9, F-1): the pre-feature client's `sanitizeRemote` drops unknown keys,
and its push writes the stripped blob back to `engagement_state`. If R1 were
rolled back to a pre-R0 build, every logged-in child who syncs during the
rollback window would lose `homeItems` permanently. With R0 in prod, the
"previous production deployment" target of any R1 rollback is R0, which keeps
the keys.

**Residual risk (recorded for human adjudication, not claimed as solved):**
R0 fixes the rollback TARGET. It cannot fix a still-open pre-R0 browser tab -
such a client retains its old sanitize list and would strip the new fields on
its next push, whether or not a rollback happens. Mitigations: (a) R0 adds a
`schemaVersion` field to the blob so post-R1 clients can detect-and-preserve
unknown future fields going forward (does not help the pre-R0 window);
(b) the R0->R1 observation window (≥1 day) shrinks the population of stale
tabs; (c) worst-case loss is cosmetic collectibles, not progress/streak.
A full fix would require a server-side merge function - out of scope; the
residual risk is accepted or a CR is filed.

### 5.2 Exact revert paths

1. **Fast path (seconds, no build):** Vercel Instant Rollback of project
   `ioe-leduyminh` (team `linhld7s-projects`) to the previous production
   deployment - dashboard "Instant Rollback", or `vercel rollback` (CLI).
   Constraints: on the Hobby plan only the **immediately previous** production
   deployment is eligible, so `main` is **frozen** (no pushes, including docs)
   for the observation window after R1 and after R2 (proposed 48h each; human
   sets it at the deploy gate). After a rollback Vercel stops auto-assigning new
   production deployments until the rollback is undone - verify this behaviour
   in the WP-26 rehearsal and record it in the deploy runbook.
2. **Durable path (<10 min target, must be proven):**
   `git revert -m 1 <R1-or-R2 merge sha>` on `main` -> push. **Important
   sequence after a fast-path Instant Rollback:** while a rollback is active,
   Vercel does NOT auto-assign new deployments to production - the pushed
   revert builds but stays unassigned. Complete the durable path with either
   `vercel promote <new-deployment-url>` or dashboard "undo rollback" (which
   re-enables auto-assignment); then verify the production alias serves the
   reverted SHA (`curl -sI https://ea.vieschool.com | cf-ray/x-vercel-cache`
   + asset hash check). If no fast-path rollback was used, the pushed revert
   auto-deploys normally. Preview-revert timing is tracked separately from
   this production-alias verification.
3. **DB (R3 only, if the digest itself misbehaves):** apply
   `supabase/rollback/0039_down.sql` (re-creates the 0037 `send_weekly_reports`
   body, drops `is_mock_result`, `skill_label_vi`, `weekly_report_html`). The
   cron schedule name `weekly-parent-report` is untouched by both directions.
4. Production rollback needs named human authorization (CONVENTIONS Deployer,
   environment-tiered autonomy); the agent prepares commands only.

### 5.3 Data compatibility matrix

| Data | Forward (new client) | Backward (reverted to R0) | Backward (reverted to pre-R0) |
|---|---|---|---|
| `homeItems`, `grantedObjectives` in `engagement_state` | written | preserved, unused | **stripped on sync** -> why R0 exists |
| Gate token | memory only | gone | gone |
| Wellbeing key `beheo-wellbeing-v1` | written | ignored | ignored |
| `results` rows | unchanged schema | unchanged | unchanged |
| Digest | R3 | independent | independent |

### 5.4 WP-26 rehearsal checklist (timed, on preview, before the prod gate)

1. Record candidate SHA, preview URL, start timestamp.
2. Smoke on preview: launchpad G1 (4 interactive), G4 (≤6), one batch to
   BatchSummary, gate -> report -> pricing -> payment, share preview renders.
3. Seed state with a demo student: complete a batch with a sticker unlock,
   pick a gift -> confirm `homeItems` in `engagement_state` (SQL read).
4. On a rehearsal branch: `git revert -m 1 <candidate merge sha>`, push, start
   timer.
5. Stop timer when the preview deployment is `Ready` **and** the old UI is
   observable: `start-batch-button` label "Bắt đầu luyện tập →", no
   `explore-open` testid, report opens without the gate. Record elapsed time;
   pass = <10 min. Fail -> deploy gate blocked until the runbook is fixed.
6. On the reverted preview, log in as the same demo student, play one round
   (forces a sync push).
7. Re-deploy the candidate; confirm `homeItems` still present in
   `engagement_state` (proves R0 forward-compat; needs R0 contained in the
   reverted base).
8. Dry-run `0039_down.sql` inside `begin; ... rollback;` on the project DB;
   confirm no error and `send_weekly_reports` still compiles.
9. Read Vercel docs/plan for Instant Rollback eligibility on this team; note
   Hobby vs Pro and the "auto-assign disabled after rollback" behaviour in the
   runbook (preview deployments are not eligible for Instant Rollback, so the
   fast path cannot be rehearsed on preview - only documented).
10. File the timings + screenshots in the deploy report; update
    `deployments/registry.json` notes.

---

## 6. Failure-mode catalog (external dependencies touched)

| Dependency | Failure mode | Symptom | Designed response |
|---|---|---|---|
| `speechSynthesis` | API absent | no `window.speechSynthesis` | `'unsupported'` -> speaker `unavailable`, visual path (AC-1.4) |
| `speechSynthesis` | no vi-VN voice | `hasVietnameseVoice()` false after `voicesReady()` | `unavailable`, never speak vi text with an en voice |
| `speechSynthesis` | autoplay blocked | `not-allowed` or no start in 1500ms | `blocked` cue "Bấm để nghe" |
| `speechSynthesis` | no end event | pulse stuck | fallback timer stops pulse |
| Supabase `results` read | network / RLS error | `{ error }` | section error + "Thử lại" (never empty), FF-6 |
| Supabase `results` read | >500 rows in 7 days | truncation | treated as error, not partial data |
| `engagement_state` sync | bind slow/failing | stale local mirror | report awaits `engagementBound()`; existing `engagementSyncHealthy()` path |
| Clipboard API | permission denied | `writeText` rejects | "Không chép được - ba mẹ chép tay nhé" |
| Web Share API | absent / no file support | `canShare` false | download + copy text fallback |
| Web Share API | user cancels | `AbortError` | silent, sheet stays open |
| Canvas | `toBlob` returns null (memory) | no blob | error state + retry |
| Fonts | not loaded in 2s | fallback glyphs | draw anyway with fallback stack |
| Mascot SVG | 404 / decode error | broken image | session-wide emoji fallback |
| dotLottie runtime | WASM/player failure | `onError('runtime')` | existing circuit breaker -> SVG |
| Email provider (digest) | send failure | `send_email` null / provider error | unchanged: warning + reconcile job (`0024`/`0025`) |
| Digest JSON | malformed self-reported blob | jsonb cast error | per-contact exception block, section shows empty state |

## 7. Capacity and saturation

PRD declares no RPS/concurrency NFR; rows below size the new load against the
existing system.

| Service | New load | Saturation mode | Mitigation | Verified by |
|---|---|---|---|---|
| Supabase PostgREST (`results` reads) | 2 bounded queries per report open, logged-in only | none expected; index `results_account_idx` covers `account_id, created_at desc` | `.limit()`, lazy on report open only | WP-24 timing per action (<2s server) |
| pg_cron digest | +3 small queries per verified contact, weekly | long run time if contacts grow | per-contact exception block; render/send split | WP-22 run on demo account |
| Vercel static (`/mascot`, `/fonts/andika`, `/payment`) | ≤5 SVG (≤12 KB gzip each), ≤2 Andika files on G1-2 letter screens, 1 PNG on payment view | none | same-origin static, cache headers per Vercel default | WP-24 perf, FF-16 |
| Client CPU (share card) | one 1080² canvas draw per share | low-end Android memory | single canvas, released after blob | WP-24 measured on 375px emulation |

---

## 8. Risks

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| RK-1 | vi-VN voice missing on many Android/desktop installs -> AC-1.3 autoplay rarely heard | high | medium | `unavailable` visual path; O-6 CR for pre-rendered vi clips; seam constant ready | Dev WP-15, PM backlog |
| RK-2 | e2e churn (8 spec/test files + 2 utils reference `start-batch-button`; 5 reference `data-mascot-mood`) causes long red streak | high | medium | update selectors in the same WP as each contract change; no flag dual-path | Dev WP-16/14 |
| RK-3 | Sync strips new keys (F-1) or rollback loses `homeItems` | medium | high | KUX-4a sync changes, FF-9, R0 release before Drop-1 | Dev WP-18, Deployer |
| RK-4 | Mock-trend classifier drifts if CR-46 configs change | low | medium | FF-12 fails first | Dev WP-19a |
| RK-5 | Entry bundle exceeds 121 kB / CSS 10 kB | medium | medium | lazy parent/pricing/share chunks; tokens as strings; FF-16 | Dev WP-14/19c |
| RK-6 | Constitution text not amended (F-9) blocks asset WPs at gate | high | high | E-1 resolved before WP-14 asset step | Orchestrator/human |
| RK-7 | Mascot art late | medium | low | `MASCOT_ART_READY=false` emoji fallback ships; Tier 2 optional | Design/Art |
| RK-8 | Pricing is DRAFT (O-1), plan codes unconfirmed (R-11) | medium | medium | single constant + FF-13; ops confirms codes before WP-19c merge | PM/ops |
| RK-9 | Vercel Hobby plan: instant rollback only to previous deploy | medium | medium | main freeze during observation windows; durable revert path rehearsed | Deployer |
| RK-10 | Per-question autoplay on G1-2 becomes repetitive (≈40 plays per batch) | medium | low | OBJ-2 option; content audio pre-empts; tap-to-replay | Human ruling |
| RK-11 | Digest crash on malformed self-reported JSON stops all parent emails | low | high | per-contact exception block; render/send split tested | Dev WP-19b |
| RK-12 | ExamScreen (1234 lines) regression | medium | high | pure-move commit for `ExamResult`; header-only edits; existing ExamScreen suites as the gate | Dev WP-17 |

---

## 9. Objections, rulings index, escalations

### Objections (advisory - human decides)

- **OBJ-1 AC-4.4 objective identity.** Design §3.5.b keys grants by "batch
  definition id", which does not exist (F-6). This ADR keys by the batch `seed`
  (per run): a remount/re-entry of the same run never re-grants, but a **new**
  random batch is a new objective and earns rewards as today. *Recommendation:*
  accept this reading - re-playing practice should stay rewarding. The
  alternative (one reward per calendar day per grade) would change the reward
  economy and needs a PRD change.
- **OBJ-2 Autoplay granularity.** Design `playKey = screen id + question id`
  autoplays the same instruction ("Nghe và chọn hình đúng") on every question.
  *Recommendation:* `playKey = screen id + round type` (autoplay once per round,
  speaker stays tappable). Default implementation follows the design unless the
  human rules otherwise.
- **OBJ-3 Lottie container format.** Design names `.lottie`; this ADR uses Lottie
  JSON to keep one loader (KUX-6). Size impact is small after HTTP compression.
  Design Lead to confirm.

### Rulings index

| ID | Ruling |
|---|---|
| TL-1 | `speakInstruction` is a new function in `speech.ts`, TTS-only, mp3 seam off (KUX-1 B). |
| TL-2 | No vi voice -> do not speak; `unavailable` state. |
| TL-3 | Gate token 5 min absolute, non-sliding, cleared on report exit / sign-out / grade change / reload (KUX-3 B). |
| TL-4 | Reward guard in local store, synced in the JSON blob; no DB table (KUX-4a B). |
| TL-5 | Mock trend via classifier, IOE mocks only, forms excluded; no `results.mode` column. |
| TL-6 | Minutes-today in a separate unsynced local key. |
| TL-7 | Band via pure helper + `ViewerContext` with a g35/off default (KUX-5 C). |
| TL-8 | Mascot: SVG Tier 1 required, Lottie JSON Tier 2 optional via the existing lazy player (KUX-6 A). |
| TL-9 | Andika copied once from the OFL source; no npm dependency. |
| TL-10 | No `VITE_UX_V2`; release units + Instant Rollback + git revert (KUX-7 C). |
| TL-11 | Digest reads self-reported skill stats for the parent's own child only. |
| TL-12 | Funnel events client-only; server ingestion -> CR. |
| TL-13 | WP-14..18 re-sequenced token-first; counts and estimates unchanged. |

### Escalations

- **E-1 (blocking for asset steps):** commit the approved constitution
  amendment text (`constitution.md` #1 audience G1-5, #3 owned/generated license
  class, C3 dirs + `public/mascot/`, `public/payment/`, `public/fonts/andika/`)
  before WP-14 touches those dirs. Owner: orchestrator (approval already
  recorded in design §14 and MEMORY 2026-02-16).
- **E-2 (non-blocking):** ops confirms plan codes MUATHI/NAMHOC/FOUNDING and the
  single transfer-note format across `01-pricing.md` and CR-60 (O-3 follow-up)
  before WP-19c merges.
- **E-3 (non-blocking):** confirm the Vercel plan tier for team
  `linhld7s-projects` (Instant Rollback depth) before the WP-26 runbook is final.
- **E-4 (doc correction):** PRD AC-6.1 should name `save_parent_contact` +
  `request_parent_verify` (F-4).

## 10. Traceability (AC -> ADR -> FF)

| AC | ADR | FF / test |
|---|---|---|
| AC-1.1-1.4 | KUX-1, KUX-2 | FF-14, speaker state tests, WP-21 no-reader matrix |
| AC-2.1-2.4 | KUX-5, WP-16 | DOM count e2e, FF-2, FF-7 |
| AC-3.1-3.3 | KUX-6, KUX-11 | FF-4, FF-10, FF-18 |
| AC-4.1-4.4 | KUX-4a | FF-8, FF-9 |
| AC-5.1 | KUX-3 | FF-1, FF-1e |
| AC-5.2 | KUX-4b | serverReport tests, FF-12 |
| AC-5.3 | KUX-4b | FF-6, FF-6e |
| AC-6.1 | KUX-3, WP-19c `SendToParentCard` | e2e parent funnel |
| AC-6.3 | KUX-12 | FF-5, FF-12, `weekly_report_html` check |
| AC-7.1 | KUX-10 | ExamScreen suites, FF-2s |
| AC-8.1-8.3 | KUX-5, KUX-6 | FF-2, FF-3, FF-3t |
| AC-9.1 | KUX-8 | FF-13, e2e ≤2 steps |
| AC-9.2 | KUX-9 | share fillText whitelist, FF-11 |
| Privacy matrix | KUX-8, KUX-9, KUX-13 | FF-11 |
| Rollback (plan) | KUX-7, §5 | WP-26 rehearsal |

## 10. Human-gate rulings (2026-02-16)

- E-1 = DONE: constitution text amended (audience G1-5, owned/generated
  license class, new asset dirs).
- E-2 = plan codes `MUATHI` / `NAMHOC` / `FOUNDING` approved; transfer note
  `VS <sdt> <goi>` (CR-60 ruling).
- E-3 = Vercel **Hobby** plan: Instant Rollback reaches only the previous
  deploy -> `main` frozen during 48h observation windows after R1 and R2.
- E-4 = AC-6.1 RPC names: `request_parent_verify` + `confirm_parent_email` +
  `save_parent_contact` (doc-level clarification).
- OBJ-1 = APPROVED: reward idempotency keyed by per-run `seed`.
- OBJ-2 = APPROVED: instruction autoplay once per round, not per question.
- OBJ-3 = APPROVED: mascot Lottie uses JSON format (single loader).
- Residual risk noted: pre-R0 open tabs can still strip new fields on sync -
  accepted (cosmetic collectibles only).
