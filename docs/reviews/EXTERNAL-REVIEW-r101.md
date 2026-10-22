# EXTERNAL-REVIEW r101 - CR-103 fix verification round

- **Date:** 2026-10-22
- **Mechanism:** pinned cross-model reviewer subagent (reviewer-gpt) -
  Codex CLI quota exhausted until 2026-10-27; fallback per AGENTS.md.
- **Scope:** the r100 fix diff only - migration 0049 strip restoration
  (incl. service_role branch), ExamScreen.begin() catch -> reloadPage,
  contentBank inflight rejection reset + warmup swallow, wordIpa /
  isCommonEnglishWord unloaded guards, plus invariant re-checks (typed
  gates, cap ordering, grants, every ensure call site's error handling).

## Verdict: APPROVE

- All 4 r100 findings CONFIRMED-FIXED with file:line evidence.
- No new defects introduced by the fix diff.
- Reviewer boundary: source inspection only; remote deployment state was
  verified separately via `pg_get_functiondef` + live fetch probes
  (0 leaked `answer` outside the documented reorder exception, 0 leaked
  `explanation_vi`).
- Note: an unloaded prod read is SILENT (warn is dev-only, throw is
  test-only) and returns the documented fallback - safe, matches the
  contentBank docblock.

## Verification chain (this CR)

- Remote SQL probes: strip applied on all fetch paths incl.
  service_role; `client_ip` EXECUTE locked; per-IP buckets checked
  before global/uid pools; fail-open on missing XFF.
- tsc clean; build 408 modules; index chunk 623 KB -> 437.76 KB.
- Vitest 1740/1740 (207 files); Playwright 17/17.
