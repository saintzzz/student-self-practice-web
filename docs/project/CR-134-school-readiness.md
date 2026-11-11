# CR-134 - School Deployment Readiness

## Trigger

PO assessment before running PRD/pilots in real schools: a VN classroom
(40-45 students behind a single school NAT IP) hitting the current per-IP
rate limits breaks mid-lesson, and onboarding a school requires creating
accounts one-by-one.

## Verified evidence (not speculation)

| Surface | Current cap | Classroom reality | Result |
|---|---|---|---|
| `fetch_questions` (auth) | `fq_ip_calls` 100/hr, `fq_ip_rows` 3000/hr per IP | 30 HS x 120-cau mock = 3600 rows | PT429 mid-exam |
| `score_bank_attempts` | `sba_ip` 1500 rows/hr per IP | 40 HS x 120 answers = 4800 rows | PT429 on submit |
| Account creation | AdminScreen single `create-account` only | 5 classes x 40 HS = 200 manual entries | hours of typing |

## Scope

1. **Rate limits (this CR's fix):** raise AUTHENTICATED per-IP caps to
   classroom scale. Per-uid caps stay unchanged and remain the abuse bound
   (accounts are admin-provisioned, no self-serve signup exists, so an
   attacker cannot mint accounts to multiply a uid cap). Guest/public IP
   caps stay strict - that remains the scraping vector.
2. **Bulk account import:** CSV/XLSX import in AdminScreen with template
   download + post-import DB verification. Deferred to follow-up commit in
   this CR if sizing allows; otherwise CR-135.

## Sizing

- VN class max ~45 HS; allow 3 concurrent classes per school IP
  (~135 authed users/IP/hr) plus retries.
- New auth IP caps: `fq_ip_calls` 400/hr, `fq_ip_rows` 30000/hr,
  `sba_ip_calls` 400/hr, `sba_ip` 30000/hr.
- Per-uid caps unchanged (`fq_uid_*` 60/4000, `sba_uid_*` 200/800).
- Guest caps unchanged (public 60/2500 + Turnstile gate).

## Non-goals

- No school tenancy/admin grouping (build after first signed school).
- No new question-type work for math-vi here.

## Impact

- `supabase/migrations/00NN_school_ip_caps.sql`: CREATE OR REPLACE for the
  affected functions (fetch_questions, fetch_questions_adaptive,
  fetch_questions_public internals, score_bank_attempts) - only the
  authed IP-cap literals change.
- AdminScreen: bulk-import UI (if in scope this round).

## Estimate

S-M: one migration + optional admin UI panel.

## Status + incident postmortem

**Shipped:** 0076/0077/0078 (caps) + bulk import UI; r183/r184 findings
fixed; r185 CLEAN. Bulk import verified on prod (CSV upload -> create ->
enroll -> delete, DB clean).

**Incident (fixed):** 0076-0078 were written by re-emitting the 0056
function bodies - silently reverting 0057's upgrade (5-arg leak_wm_tag,
opaque guest actor). The dropped 3-arg helper made every fetch call fail
42883; all question loads broke. 0079 restored the 0057 bodies with the
caps on top; verified RPC 200 + wm tags on prod.

**Process lessons (now standing rules):**
- Never re-emit a function body from an older migration file - read
  `pg_get_functiondef` (the LIVE definition) as the base.
- After any DB migration touching student-path RPCs, smoke-call the
  real RPC with a user JWT before declaring done.
- `git add -A` near QA scratch scripts commits them - keep scratch
  outside the repo or use explicit paths.
