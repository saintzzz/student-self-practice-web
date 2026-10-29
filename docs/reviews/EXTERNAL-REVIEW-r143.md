# EXTERNAL-REVIEW r143 - CR-109 GTM outbound agent (round 1)

- Scope: migration 0070 (gtm schema/RLS/triggers/RPCs), scripts/gtm/{lib,discover,enrich,draft,send}.mjs, gtm-reply-webhook edge fn, src/lib/gtm/client.ts, admin/OutreachTab, tests.
- Mechanism: pinned reviewer subagent (reviewer-gpt), adversarial defect hunt.
- Verdict: **REJECT** - 1 BLOCKER, 7 MAJOR, 2 MINOR.

| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| 1 | BLOCKER | queue_gate trigger UPDATE-only; INSERT status='queued' bypassed approval | trigger now `before insert or update of status` (verified: direct INSERT queued raises queue_gate_denied) |
| 2 | MAJOR | editDraft sent `edited:true` but column not granted -> UI edit 403 | `edited` now stamped by body_gate trigger; client sends body only |
| 3 | MAJOR | campaignId CLI arg interpolated into PostgREST filters unencoded | uuidOrThrow() gate in enrich/draft |
| 4 | MAJOR | gtmAll keyset skipped rows on non-unique order cols (created_at ties) | pagination restricted to `id` asc; other orders = single bounded page |
| 5 | MAJOR | daily-cap count via paged client read could undercount | gtmCount() HEAD + count=exact |
| 6 | MAJOR | svix signature `===` string compare (timing) | constant-time byte compare after b64 decode |
| 7 | MAJOR | bouncedRecipient picked first email in bounce text - could suppress mailer/provider addresses | only suppresses payload.to/text match of the lead's own contact_email |
| 8 | MAJOR | reply events stored raw from/subject/500-char preview (PII into admin table) | payloads now {classification, from_domain, text_len} |
| 9 | MINOR | dry-run logged full recipient email | redact() a***@domain |
| 10 | MINOR | `join(' · ')` middle-dot separator | `join(' - ')` hyphen |

All 10 fixed; each verified (SQL probe for 1; unit tests 15/15; scripts syntax+smoke re-run).

## Round 2 (r144) - verdict APPROVE_WITH_CHANGES

All 10 round-1 fixes confirmed correctly implemented. New findings:

| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| 11 | MAJOR | draft.mjs selects lacked `id`; gtmAll pagination at exactly 1000 rows would issue `id=gt.undefined` | `id` added to all three message selects |
| 12 | MAJOR | no regression tests for the new security/reliability helpers; RUNS ledger left `-` | 7 new unit tests (uuidOrThrow gate, prefilter category regression, gtmAll pagination contract); RUNS.md now lists every rejection + defect |
| 13 | MINOR | migration 0070 edited in place after apply - replay drift | `drop trigger if exists` guards added; remote re-verified by INSERT-bypass probe (queue_gate_denied) |
| 14 | MINOR | unbounded admin reads could silently undercount pipeline/events | PAGE_CAP=5000 + `truncated` flag + UI warning chip |
| 15 | MAJOR | webhook claim not released on post-claim failure - provider retry answered `deduped`, reply lost | try/catch releases svix-id claim before returning 500; `handle()` hoisted with explicit params |

## Round 3 (r145) - verdict REJECT (2 BLOCKER, 4 MAJOR, 3 MINOR, 4 NIT)

Reviewer verified by execution (empty-HOME test run reproduced the CI
failure; postgrest-js source confirmed shouldThrowOnError=false).

| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| 1 | BLOCKER | gtmAll tests failed in CI - keys() read secrets file before stubbed fetch | GTM_SUPABASE_URL/GTM_SERVICE_ROLE_KEY env overrides in lib.mjs; pagination tests moved to scripts/gtm/lib.test.mjs (ea scanner forbids the env names in src/) - 22/22 pass under empty HOME |
| 2 | BLOCKER | claim-release was dead code: postgrest-js never throws, errors resolved into {error} | orThrow() applied to every post-claim read+write in handle(); failure now reaches catch -> releaseClaim + 500 |
| 3 | MAJOR | data.from not normalized (display-name/angle-brackets broke correlation + from_domain) | bracket-strip + trim + lowercase; contact_email lowercased at write (discover/enrich) so .eq correlation is exact |
| 4 | MAJOR | from-correlation scanned only 25 globally-newest sent messages | inverted: lead by contact_email first, then its latest sent message (per-address per ADR-4) |
| 5 | MAJOR | stranded 'sending' CAS claim - no reaper, invisible in admin | messages.updated_at column + claim stamps it + main() requeues sending rows stale >15min; 'sending' added to admin draft list |
| 6 | MAJOR | fetchStats capped at PAGE_CAP but truncation not surfaced | truncated flag + same amber chip on stats row |
| 7 | MINOR | claim release could duplicate reply events on retry | processing events stamped provider_event_id `${svixId}:reply`/`:unmatched`; 23505 continues so retries COMPLETE partial work idempotently |
| 8 | MINOR | `text ?? html` kept empty string over html | `||` fallback |
| 9 | MINOR | bookkeeping blip after resendSend marked delivered mail 'failed' (re-approve = double send) | nested try: bookkeeping failure still records status='sent' + logs error |
| 10 | MINOR | daily-cap window was UTC not Asia/Ho_Chi_Minh | VN-midnight boundary `T00:00:00+07:00` |
| 11 | NIT | fit.desc is NULLS FIRST in Postgres | `fit.desc.nullslast` (gtmAll now passes order suffixes through) |
| 12 | NIT | sent event stored full recipient email | payload now `to_domain` |
| 13 | NIT | dead `grant insert` on gtm.suppression | grant dropped (file + remote) |

## Round 4 (r146) - verdict APPROVE_WITH_CHANGES

All 13 round-3 fixes CONFIRMED-FIXED (reviewer re-ran the empty-HOME
vitest suite: 22/22). Two new findings:

| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| 1 | MAJOR | `+` in the VN-boundary/stale-reaper timestamps decodes as a space inside the PostgREST URL, corrupting both filters | FV() encodeURIComponent helper applied to every timestamp filter value in send.mjs |
| 2 | MINOR | a delivered mail whose bookkeeping writes ALL failed stayed 'sending' with no durable marker - the reaper could requeue it into a double-send | reaper excludes rows with provider_message_id; the bookkeeping fallback patch now carries status+pid+sent_at so any surviving write preserves the delivered truth; the pid is also recorded in run errors |

Round 5 verification: these are localized to send.mjs; the remaining
defect surface after this round is the residual "provider accepted AND
database fully unreachable >15min" window - the pid is then only in
gtm.runs errors (documented, manual recovery path).
