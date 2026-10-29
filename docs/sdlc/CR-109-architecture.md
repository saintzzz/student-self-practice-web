# CR-109 Architecture — GTM outbound agent

Inputs: CR-109 scope + PRD r2 (REQ-1..7, AC-109.1-13). No UI-heavy
design pass needed: the only surface is an admin tab inside the
existing AdminScreen following its established table/tab conventions -
recorded as `Ruling: admin-internal tooling inherits house style,
fidelity=reference-only`.

## ADR-1 — Placement: same repo, new `gtm` schema

GTM lives in this repo, not a new one: shares the Supabase project,
`practice.is_admin()` for RBAC, the scripts/*.mjs worker convention
(service_role + env keys), and the AdminScreen for its one UI surface.
Ruling recorded at intake; zero coupling to `practice` tables in
either direction (fitness function below).

## ADR-2 — Data model (`supabase/migrations/0070_gtm_schema.sql`)

`create schema gtm` + PostgREST `Accept-Profile: gtm` on scripts;
browser client uses `.schema('gtm')` on a second supabase-js client
inside the admin tab only (the shared client stays on `practice`).

- `gtm.campaigns(id, name, segment, province, status, created_at)`
- `gtm.leads(id, campaign_id?, name, segment text check in
  (center|school|unknown), address, city, phone, website, contact_email,
  source text, source_url text, lawful_basis text check in
  (public_business_contact|relationship) , status text default 'staged'
  check in (staged|dropped|enriched|cold|queued|sent|replied|meeting|
  customer|bounced|dead|suppressed), fit smallint check 0..10,
  fit_reason, signals jsonb, drop_reason, needs_human bool default f,
  dedupe_key text unique not null, created_at, updated_at)`
  - `dedupe_key` = `lower(regexp_replace(coalesce(phone,''),'\D','','g'))`
    when phone present else `unaccent(lower(name)) || '|' ||
    unaccent(lower(city))` - computed by the script, stored, unique.
- `gtm.messages(id, lead_id ref, kind text check (initial|followup),
  subject, body, status check (pending_review|queued|sent|failed|
  rejected), edited bool, review_notes, provider_message_id,
  sent_at, created_at, unique(lead_id, kind))`
- `gtm.message_approvals(message_id ref unique, approver_uid uuid,
  body_sha256 text, created_at)` — REQ-3.6 artifact.
- `gtm.suppression(value text unique, kind text check (email|domain),
  reason, source, created_at)`
- `gtm.events(id, lead_id?, message_id?, kind, payload jsonb,
  provider_event_id text unique, created_at)` — provider_event_id is
  the webhook idempotency key (REQ-5.2b).
- `gtm.runs(id, agent text, campaign_id?, stats jsonb, llm_calls int,
  cost_estimate numeric, duration_ms, errors jsonb, created_at)`

### Queue gate trigger (REQ-3.6)
`gtm_messages_queue_gate` BEFORE UPDATE OF status: when
`new.status='queued'` and `old.status<>'queued'`, require EXISTS
approval where `message_id=new.id and body_sha256=encode(digest(
new.body,'sha256'),'hex')` — pgcrypto digest; else raise
`queue_gate_denied`. Stale-hash approvals (edit after approve) fail
this check by design (AC-109.13).

### RPCs (security definer, `practice.is_admin()` guard)
- `gtm_approve_message(p_id)` → has_footer check on current body,
  insert approval(sha256(body)), set status='queued'. Auth'd admins
  call this; send script never does.
- `gtm_reject_message(p_id, p_reason)` → status='rejected'.
- `gtm_suppress(p_value, p_reason)` → insert suppression + mark
  matching leads status='suppressed' + fail their pending/queued
  messages.

### Grants/RLS (mirror practice pattern)
- `gtm.*` tables: `authenticated` gets SELECT (RLS policy
  `practice.is_admin()`), INSERT/UPDATE/DELETE revoked; column-level
  exception: `GRANT UPDATE (body, review_notes)` on gtm.messages to
  authenticated + RLS policy admin — edit-draft path; status column is
  NOT updatable (bypass denial, AC-109.13).
- `anon` gets nothing. `service_role` bypasses (scripts + webhook).
- Helpers (`gtm.has_footer`, `gtm.is_suppressed`) = stable SQL
  functions, EXECUTE revoked from public per 0045 convention.

## ADR-3 — Agents as Node scripts (`scripts/gtm/`)

Same shape as `scripts/qb-*.mjs`: service_role key from
`~/.config/devin/secrets/supabase_new_keys.json`, `Accept-Profile: gtm`
header, env AI keys (GEMINI→OPENAI→ANTHROPIC chain, `AI_PROVIDER`/
`AI_MODEL` override), `thinkingBudget: 0` on Gemini, rule fallback
always present. Every run writes gtm.runs.

- `lib.mjs` — db REST helpers (fetchAllRows keyset, upsert by
  dedupe_key), LLM `chatJson(prompt)` with provider chain + schema
  validate + one repair retry, `hasFooter`, suppression check, norm
  helpers (unaccent-dedupe via server-side `unaccent(lower())`? — VN
  text: do normalization in JS: strip diacritics via NFD+regex, lower,
  collapse spaces).
- `discover.mjs --province <p> [--segment center|school]
  [--fixture <file>]` — adapters: `maps` (Playwright, scroll results
  panel, parse name/category/address/phone/website — no login), later
  `places` if GOOGLE_PLACES_KEY appears. `--fixture` reads a JSON file
  for deterministic tests + AC-109.1. Stages rows with
  lawful_basis='public_business_contact' + provenance.
- `enrich.mjs [--limit n]` — prefilter (deny categories: non-education,
  university/college-only names, government names) → drop_reason;
  survivors → one LLM call returning `{segment, fit, reason, signals}`
  validated; website email extraction fetch (homepage + /lien-he,
  /contact, /about — first 3 fetches, mailto + regex, deny obvious
  personal providers? No: business emails on their OWN site are fine —
  reject only if local-part looks like a person-name pattern AND host
  is gmail/ yahoo → keep it: `contact_email` prefers org-domain then
  any business mailbox; never store emails harvested from third-party
  pages).
- `draft.mjs [--limit n]` — enriched+email → message row
  kind='initial' pending_review; follow-up drafts generated on demand
  by `send.mjs --followups` for sent>4d leads (kind='followup', still
  pending_review → still human-approved, REQ-4.4).
- `send.mjs [--dry]` — claims queued rows CAS-style
  (update status queued→sent where status='queued' returning id),
  checks: GTM_SEND_ENABLED, footer present, suppression, lawful_basis,
  daily cap, then Resend `POST /emails`. Records event 'sent' +
  provider_message_id. Follow-ups claim only leads still 'sent'
  for >=4 days.

## ADR-4 — Reply webhook (`supabase/functions/gtm-reply-webhook/`)

Deno edge fn like practice-turnstile: `GTM_REPLY_SECRET` (svix whsec)
verifies `svix-id/svix-timestamp/svix-signature` (HMAC-SHA256 over
`${id}.${ts}.${body}`, base64-decoded secret part after `whsec_`,
5min tolerance); svix-id → gtm.events.provider_event_id insert-first
(409 on conflict = replay → 200 no-op, REQ-5.2b). Correlate via
In-Reply-To provider id → messages.provider_message_id, else
from-address → latest sent message. Classification: rule pass first
(bounce markers, "KHÔNG"/opt-out, question marks), LLM fallback;
bounce parsing per REQ-5.5 (suppress recipient parsed from payload,
never mailer-daemon sender). Dep hook: classify result mutates lead
status + sets needs_human on interested/question + upgrades
lawful_basis='relationship' on any human reply.

## ADR-5 — Admin surface (`src/components/admin/OutreachTab.tsx`)

New tab `id:'gtm'`, label `Tiếp thị` (full-word per conventions),
`isAdmin` only. Sections: Campaigns header (name, segment, counts),
Leads table (name/city/segment/fit/reason/status/needs_human filter),
Draft queue (subject preview, body expand, edit textarea, approve/
reject buttons calling RPCs), Pipeline strip (count per status),
Suppression mini-CRUD, Stats row (sent/replies/meetings, cost/lead
from runs+events). Second supabase client with `schema:'gtm'` local to
the tab. Lazy-imported like other admin-heavy pieces. Empty states per
REQ-6.5; Vietnamese copy hyphen-only.

## ADR-6 — Send infra (flag-gated)

Env: `GTM_SEND_ENABLED`, `GTM_RESEND_API_KEY`, `GTM_FROM`,
`GTM_DAILY_CAP`(20), `GTM_FIT_MIN`(6), `GTM_REPLY_SECRET`,
`GTM_SENDER_NAME/ROLE/ADDRESS` for footer. Dedicated sending domain =
human DNS task at deploy gate (subdomain `go.vieschool.com` or a
separate domain — owner's call, recorded in deploy checklist). Until
then every send path is dry-run; drafts still accumulate and can be
copied for manual outreach.

## Failure modes (per-dependency)

| Dep | Mode | Symptom | Response |
|---|---|---|---|
| Maps scrape | layout change / consent wall | adapter throws, 0 staged | runs row errors + non-zero exit (REQ-1.4) |
| LLM key missing | all providers absent | chatJson falls to rule path | rule fallback results, flagged `llm=false` in runs |
| LLM bad JSON | schema invalid | validation fails | 1 repair retry then drop lead with error recorded |
| Website fetch | TLS/timeout/anti-bot | extraction skip | contact_email null → lead 'cold' not 'enriched' |
| Resend send | 4xx/5xx | provider error | message status='failed' + event + retryable |
| Webhook sig | invalid | 401 | reject, no DB writes |
| Supabase down | fetch error | script aborts | non-zero exit, partial work committed is idempotent |
| Domain unverified | flag off | dry-run log only | zero provider calls |

## Fitness functions (release gates)

1. Deterministic: `grep -rn "from 'gtm" src/` outside
   src/components/admin/ + `grep -rn "gtm\." supabase/migrations/*practice*` = 0
   (schema isolation).
2. `scripts/check-gtm-rls.mjs` selftest: anon SELECT gtm.leads →
   permission denied/0 rows; teacher auth → denied; admin → rows;
   direct UPDATE messages.status → denied; approve RPC without admin →
   denied.
3. Unit: dedupe_key collision, prefilter drops, has_footer negative,
   suppression match (email+domain), CAS claim, follow-up window,
   bounce-suppression parsing, webhook sig verify + replay no-op,
   classify rule fallback.
4. Selftest vs remote (tests/gtm-contract.selftest.mjs, gated by env
   like adaptive-fetch.selftest.mjs): trigger blocks unapproved queue,
   stale-hash approval fails, column-privilege deny, footer gate.

## Canonical references

- Edge fn shape: supabase/functions/practice-turnstile/index.ts (this
  repo — Deno.serve + service_role + schema-scoped client).
- Rate-limit/wrapper SQL idiom: migrations 0044-0049 (revoke/grant,
  security definer guards, $function$ convention for redefines).
- Resend inbound: docs.resend.com/webhooks (svix verification).
- Maps adapter: repo playwright-cli skill + existing e2e infra.
