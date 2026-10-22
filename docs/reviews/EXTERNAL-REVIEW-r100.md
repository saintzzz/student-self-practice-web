# EXTERNAL-REVIEW r100 - CR-103 (per-IP rate limits + content-bank lazy split)

- **Date:** 2026-10-22
- **Mechanism:** pinned cross-model reviewer subagent - Codex CLI quota
  exhausted until 2026-10-27; fallback path per AGENTS.md.
- **Scope:** uncommitted CR-103 diff - migration `0049_per_ip_rate_limits.sql`
  (client_ip helper + per-IP buckets on fetch_questions_public/fetch_questions/
  score_bank_attempts), `src/data/grades.ts`, `src/lib/content/contentBank.ts`
  lazy bank + sync proxies, entry-boundary ensures (App, ExamScreen,
  GameRouteBoundary, FlashcardScreen, PlacementScreen), consumer migrations,
  test setup `beforeEach(ensureContentBank)`.

## Findings & triage

### BLOCKER - 0049 dropped `strip_bank_row` from both fetch wrappers

- **Status:** FIXED (deployed + migration file re-synced).
- **Evidence:** confirmed by inspecting the deployed function bodies via
  `pg_get_functiondef`. `__impl` returns `to_jsonb(rec)` - the full row.
  0046 wrapped it as `select practice.strip_bank_row(j) from impl`; the
  first 0049 version restored `select *` - re-exposing `answer` +
  `explanation_vi` on every fetch path, incl. anon.
- **Fix:** both wrappers now return `select strip_bank_row(j) ... j`
  again (incl. the service_role bypass branch of `fetch_questions` -
  caps-only bypass, matching 0046). Verified remote:
  `fetch_questions_public(3,'english',10)` - 0/10 rows leak `answer`
  outside the documented `reorder` exception; 0 leak `explanation_vi`.
- **Exposure window:** keys were re-leaked between the first 0049 apply
  and this fix (~30 min, no traffic anomaly observed).

### MAJOR - cold content-load failure in `ExamScreen.begin()` bypassed error handling

- **Status:** FIXED.
- `begin()` now wraps the cold-path `ensureContentBank()` in try/catch ->
  `reloadPage()` (the established lazy-boundary recovery, same as
  `handleStartBatch` in App.tsx). A failed bank chunk no longer becomes
  an unhandled rejection that leaves the screen mounted on an empty pool.

### MAJOR - failed loads stayed cached as rejected promises

- **Status:** FIXED.
- `ensureContentBank` now clears `inflight` on rejection - a retry
  (FlashcardScreen rebuild, next session entry) performs a real reload
  instead of replaying the same rejected promise forever.
- `warmupContentBank` now swallows the prefetch rejection
  (`.catch(() => {})`) - prefetch failure is ignored; the real entries
  retry and handle it. No unhandled rejections from warmup.

### MINOR - `wordIpa` / `isCommonEnglishWord` lacked the unloaded-read guard

- **Status:** FIXED.
- Both now call `unloaded()` when their maps are null - same throw-in-
  test / warn-in-prod semantics as the word-pool proxies. A null map can
  no longer silently masquerade as "word has no IPA"/"not a common word".

## Verified-as-correct by the reviewer

- Single-flight load + atomic bank assignment.
- Per-IP checks run BEFORE the global pools in all three RPCs.
- `client_ip` EXECUTE revoked from public/anon/authenticated.
- Sync-proxy design avoids the async cascade; warm path stays sync.

## Residual unverified items (accepted risk)

- Live XFF trust behaviour over real PostgREST anon calls (MCP SQL has no
  XFF; fail-open makes the unknown-IP case equal to pre-0049, never worse).
- Per-IP caps on `fetch_form`/`assignment_form` - out of scope: form
  surfaces keep their existing uid/global caps; the bulk-scrape threat
  lives on the public fetch + oracle surfaces.
