# External Review Loop - Round 3 triage

Reviewer: Codex Cloud (whole-repo review, commit `ca5c311` -> fixes on `bd0ae3a`).
Round 3 report: NOT CLEAN - 2 High, 6 Medium, 1 Low + deployment notes.

## Triage

| # | Severity | Finding | Status | Fix |
|---|----------|---------|--------|-----|
| 1 | High | Commercial human-approval flag never enforced at serving | fixed | `0033`: `fetch_questions` mock mode now requires `mockEligible AND NOT requiresHumanApprovalForCommercialRelease`; `review_question` approve clears both approval flags; operator bulk-approval of 100,604 audited rows recorded in `audit_log`. |
| 2 | High | STT rate limit per-isolate `Map` bypassable | fixed | `practice.check_rate_limit` atomic upsert counter shared across isolates; edge fn calls it via service-role RPC (deployed v11, verified 200 + 429). |
| 3 | Medium | `fetch_questions` retains PUBLIC/anon execute | fixed | explicit `revoke ... from public, anon`; verified anon call -> 401. |
| 4 | Medium | Direct `qb_questions`/form reads expose answer keys to any authenticated user | fixed | select policies now `practice.is_admin()`; verified anon direct read -> empty. |
| 5 | Medium | Human approval left `requiresHumanApprovalForExam` set so approved rows still could not serve exams | fixed | approve now clears both flags; verified exam mode still returns 0 for unapproved bank while approved-for-commercial rows serve mock. |
| 6 | Medium | `ORDER BY random()` sorts whole matching pool | fixed | `random() < 0.35` prefilter bounds the sort input. |
| 7 | Medium | G5 nonsense superlatives ("tallest river") + bad past-simple complements ("went dinner") | fixed | noun->adjective and verb->complement whitelists in `gen-template-g5.mjs`; 102 bad rows deleted; audit check added. |
| 8 | Medium | 6 malformed spelling/scramble items | fixed | MISS2/SCR2 literals corrected + generator self-validates; 28 bad rows deleted; audit checks added. |
| 9 | Medium | `audit-bank.mjs` could false-pass on HTTP errors/non-array/200-row sample | fixed | throws on non-OK, requires array responses, paginates all semantic checks. |
| 10 | Low | Telemetry retry buffer could exceed 200-event server cap | fixed | `telemetry.ts` flushes in chunks of <=200. |

## Deployed-state notes verified

- `check_rate_limit`: 4th call in 60s window -> -1 (shared counter verified).
- anon `fetch_questions_public` 200 with rows; anon `fetch_questions` 401; anon direct `qb_questions` read empty (RLS).
- `practice-transcribe` v11 with audio payload -> `{"transcript":"apple"}`.
- `audit-bank.mjs` all checks green after fixes (0 dupes, 0 bad answers, 0 bad scrambles, 0 bad superlatives).

## Deferred verification (unchanged from r2)

- WAF/edge header behaviour; live query performance at scale.
