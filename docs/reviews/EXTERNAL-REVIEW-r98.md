# EXTERNAL-REVIEW r98 - CR-101 (gameplay depth + anti-scrape moat)

- **Date:** 2026-10-21
- **Mechanism:** pinned cross-model reviewer subagent (reviewer-gpt) - Codex CLI
  quota exhausted until 2026-10-27; fallback path per AGENTS.md.
- **Scope:** uncommitted CR-101 diff - migration 0044 (rate-limited bank RPC
  wrappers), `bank.ts` error mapping, `pickFiftyFifty` + `HintButton` and
  11 game-shell adoptions, hint unit/e2e tests, CR-101 doc.

## Findings & triage

### BLOCKER - `check_rate_limit_weighted` callable by anon (PUBLIC EXECUTE)

- **Status:** FIXED (migration `0045_rate_limit_acl_hardening`, applied).
- **Evidence:** remote `proacl` was `null` -> default PUBLIC EXECUTE; anon
  could rewrite any bucket (weight 0 + window 0 resets, negative weight
  subtracts quota), defeating the moat.
- **Fix:** `revoke all ... from public, anon, authenticated`; verified
  remote `proacl = {postgres=X/postgres}`. Added arg guard
  (`p_weight|p_max|p_window_seconds < 1` -> raise) defence-in-depth.

### MAJOR - `fetch_questions` wrapper kept PUBLIC EXECUTE

- **Status:** FIXED (same migration).
- **Evidence:** remote `proacl` showed `=X/postgres` (PUBLIC) - anon gained a
  separate `'anon'` 60-call/4,000-row budget outside guest caps.
- **Fix:** revoked `public, anon`; re-granted `authenticated, service_role`.
  Verified: `{postgres, authenticated, service_role}` only.

### MAJOR - authed PT429 silently fell back to the public bucket

- **Status:** FIXED in `src/lib/qb/bank.ts` + regression tests.
- **Evidence:** every error from `fetch_questions` triggered
  `fetch_questions_public`, so the per-uid cap never bound for real clients.
- **Fix:** PT429/`rate_limited` throws before the fallback branch. Two new
  tests pin both directions (authed: no fallback; guest: public path).

## Verified clean areas

- Hint state never merges into `wrongPicks`/lives/scoring (separate `hints`
  state; presentation-only union).
- `pickFiftyFifty` deterministic, bounded, never returns the correct index.
- `*__impl` functions correctly deny anon/authenticated
  (`{postgres, service_role}`).
- Window-rollover `ON CONFLICT` logic resets stale counters correctly.
- Hint e2e on a real browser flow passes.

## Verdict

Initial: **NO-GO** -> all three findings fixed + remotely verified.
Round 2 (reviewer-gemini, fix-diff only): **APPROVE** - confirmed the
SECURITY DEFINER wrappers still execute the locked helper as owner; the
pre-existing `check_rate_limit` already had proper revokes (0033); the
`rate_limits` table has RLS + full revokes since 0033; revoking `public`
from `fetch_questions_public` does not break anon client calls (explicit
grant kept); non-PT429 fallback stays bounded by the global guest cap.
