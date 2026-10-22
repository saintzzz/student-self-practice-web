# EXTERNAL-REVIEW r104 - CR-107 adaptive fetch + ea-scanner fix

- **Date:** 2026-10-22
- **Mechanism:** pinned cross-model reviewer subagent (reviewer-gpt) -
  Codex CLI quota exhausted until 2026-10-27; fallback per AGENTS.md.
- **Scope:** commits 857cfe5..0053551 - migration 0051
  (fetch_questions_adaptive + __impl), bank.ts adaptive seam,
  ea-scanner dollar-tag/delegation fix, AC-107 tests.

## Findings & triage

### MAJOR - separate fqa_* buckets allowed cross-RPC budget splitting

- **Status:** FIXED (hotfix applied remote + migration file updated).
- **Evidence:** the wrapper charged `fqa_ip_*`/`fqa_uid_*` while
  `fetch_questions` charges `fq_ip_*`/`fq_uid_*` - a caller could
  exhaust the adaptive allowance then re-draw through the standard
  RPC, doubling the aggregate cap 0049's anti-splitting design put in
  place. The client's no-fallback-on-429 only governs cooperative
  callers.
- **Fix:** adaptive now charges the shared `fq_ip_calls`/`fq_ip_rows`/
  `fq_uid_calls`/`fq_uid_rows` buckets. Remote-verified: prosrc has 0
  `fqa_` references, both shared buckets charged. bank.ts comment
  corrected (429 is terminal on the shared budget). Selftest asserts
  no `check_rate_limit*('fqa_` call exists.

## Verdict

Initial: NOT-CLEAN (1 major) -> fixed + remotely verified.
No other actionable defects: ZPD SQL, grants/keyless contract,
scanner resolution, and client error paths reviewed clean.
