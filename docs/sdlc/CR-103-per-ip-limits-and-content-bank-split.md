# CR-103 - Per-IP rate limits + content-bank lazy split

Closes the two items deferred out of CR-102 with an honest assessment of
what each could and could not deliver.

## Scope

### 1. Per-IP rate limits (migration `0049_per_ip_rate_limits.sql`)

**Threat.** The guest caps from CR-101/102 are GLOBAL shared pools
(`fq_pub_calls` 300 calls/hr, `sba_guest` 2000 attempts/hr). One scraper
IP could (a) burn the entire shared pool - a denial-of-wallet for real
guests - and (b) take the full 8000 rows/hr fetch budget from a single
address. Per-uid caps do not bind guest traffic at all (it is all `anon`).

**Fix.** `practice.client_ip()` reads `x-forwarded-for` from the PostgREST
`request.headers` GUC; the LAST entry is used because the edge appends the
real TCP peer after any client-supplied (spoofable) prefix. New per-IP
buckets run BEFORE the shared pools so a blocked IP stops consuming the
global budget immediately:

| Surface | Per-IP cap | Purpose |
|---|---|---|
| `fetch_questions_public` | 60 calls + 2500 rows / hr | honest classroom on one NAT fits (~30 kids = ~30 fetches); scraper cut ~3x vs old single-IP budget |
| `fetch_questions` | 100 calls + 3000 rows / hr | same buckets shared across both fetch surfaces - no budget-splitting; authed keep per-uid caps on top |
| `score_bank_attempts` | 200 calls + 1500 attempts / hr | ~30 kids x ~45 scored actions fits; probe IP throttled hard |

**Fail-open.** When `request.headers` is absent (non-PostgREST paths -
SQL console, MCP, future service connections) `client_ip()` returns NULL
and the per-IP layer is skipped; the pre-existing global/uid caps still
apply. Worst case equals the pre-0049 state, never worse. `client_ip` has
`EXECUTE` revoked from public/anon/authenticated (r98 lesson).

**Honest economics.** Per-IP limiting kills the single-IP scrape but not
a botnet (many IPs each under cap - the global pools remain the backstop).
Turnstile remains the correct next layer for that; it needs a Cloudflare
account and is still deferred deliberately.

### 2. Content bank lazy split

**Before.** `src/data/vocabulary` (~287KB source), `ipaMap` (33KB) and
`commonEnglishWords` (51KB) were statically reachable from the eager
index chunk - via `GRADES` in App.tsx and `getWordsByGrade`/`ALL_WORDS`/
`WORD_IPA` across the batch/exam/games pipeline.

**After.**

- `src/data/grades.ts` - `GRADES` moved out of the bank barrel; the six
  meta-only screens (App, Admin, Batch, BatchSummary, Placement,
  RoundSummary) import it directly. `vocabulary/index.ts` re-exports it
  so existing/test imports keep working.
- `src/lib/content/contentBank.ts` - ONE dynamic-import boundary loading
  vocabulary + ipaMap + commonEnglishWords together (single-flight,
  cached). Sync proxies keep the existing sync call sites unchanged -
  `getWordsByGrade`, `getWordsByTopic`, `allWords`, `wordIpa`,
  `isCommonEnglishWord` - so the sync state machine (batchSession,
  games/sources, examSession, placement, question renderers) needed zero
  async cascade.
- `wordVisual.ts` - the wordId->visual map now builds lazily on first
  read and only caches once real words exist (an early lookup can never
  freeze an empty table).
- Load guarantees at every entry that can reach a sync proxy:
  - `handleSelectGrade` - `warmupContentBank()` prefetch (fire-and-forget
    while the kid lands on the hub).
  - `handleStartBatch` - `await ensureContentBank()` before `createBatch`;
    chunk-load failure recovers via `reloadPage()` (same convention as
    lazy screens).
  - `ExamScreen.begin()` - `await ensureContentBank()` first (covers
    exam, practice, review, arena and assignment paths).
  - `GameRouteBoundary` - `BankGate` holds mount on `contentBankReady()`
    with the existing `game-loading` placeholder; one gate covers all
    15 games.
  - `FlashcardScreen.build` - awaits before building the deck.
  - `PlacementScreen` - session built in an effect after ensure, not a
    sync useState initializer.
- Test rig: `src/test/setup.ts` registers `beforeEach(ensureContentBank)`
  (beforeEach - not module top level - so a file-level `vi.mock` of the
  vocabulary module still wins). `contentBank` proxies THROW on an
  unloaded read in `MODE=test` - describe-scope reads can never degrade
  to a vacuous pass on an empty pool (this immediately caught
  `examSession.test.ts` calling `createExam` at describe scope; fixed by
  moving it inside the `it`).

## Bundle result

| Chunk | Before | After |
|---|---|---|
| `index` (eager) | 623 KB | **437.7 KB** - under the 500 KB warning |
| vocabulary bank | inside index | 113.6 KB lazy (gzip 33.6 KB) |
| `ipaMap` | inside index | 22.4 KB lazy |
| `commonEnglishWords` | inside index | 50.6 KB lazy |

`index.html` preloads only index+vendor - the bank is fetched once per
session, starting at grade pick.

## Verification

- Remote SQL: `fetch_questions_public` works; `fq_ip_calls:unknown` /
  `fq_ip_rows:unknown` counters increment (MCP has no XFF - 'unknown'
  bucket is the fail-open path); proacl shows `client_ip` locked to
  postgres, wrappers keep intended role grants. r100 verification:
  `pg_get_functiondef` confirms ALL fetch surfaces still apply
  `strip_bank_row` (incl. the fetch_questions service_role branch) and
  a live fetch returns 0 leaked `answer`/`explanation_vi` outside the
  documented `reorder` exception.
- `npx tsc -b` clean; `npx vite build` clean (408 modules, no chunk
  warning - index 437.76 KB vs 623 KB before).
- Vitest: **1740/1740** across 207 files.
- Playwright: **17/17** over grades, batch-full-flow, exam-paper,
  cr82-flashcards, cr100-hearts, engagement (guest-trial skips are
  pre-existing).
- Not verified end-to-end: whether Supabase edge populates
  `request.headers` for RPC calls on this project (needs a real anon
  REST call; fail-open design makes this safe either way - worst case is
  today's global caps).

## External review

- r100: REJECT -> all 4 findings fixed (strip restored + verified on
  remote incl. service_role branch; begin() cold-failure now reloads;
  inflight rejection cleared for retry + warmup swallows; wordIpa /
  isCommonEnglishWord guarded). Record: `docs/reviews/EXTERNAL-REVIEW-r100.md`.

## Out of scope (deliberate)

- **Turnstile/botnet-grade defense** - requires a Cloudflare account;
  documented boundary.
- **Per-grade bank granularity** - wordVisual/phonics consume the whole
  bank, so a single lazy chunk captures ~95% of the win without
  restructuring 89 topic files.
