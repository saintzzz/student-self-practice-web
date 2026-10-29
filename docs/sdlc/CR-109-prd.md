# CR-109 PRD — GTM outbound agent (VieSchool B2B)

Source: docs/INTENT.md (2026-10-29) + CR-109 scope doc. Owner rulings:
both B2B ICPs, build in-house for VN, no B2C/parent outreach, human
approve-to-send v1.

## Domain Pack (delta)

- Regulation: NĐ 90/2008/NĐ-CP + 91/2020 (anti-spam): advertising email
  requires recipient consent OR established relationship; every send
  must identify the advertiser + carry a refusal/opt-out mechanism;
  opt-outs must be honored immediately. Business-listing outreach under
  B2B framing is the operating model - consumer email lists are
  out-of-scope entirely.
- Deliverability reality: a cold sending domain attracts spam
  complaints under volume; dedicated sending domain + low volume ramp
  (start <=20/day) + suppression discipline.
- VN B2B norms: orgs publish contact email/phone on websites + Maps;
  Zalo/phone is the real close channel - email opens the door, humans
  close. v1 captures phones for manual follow-up.
- Glossary (ubiquitous language): `lead` = an organization row in
  gtm.leads; `draft` = a generated email awaiting approval; `campaign`
  = a named batch (province x segment x date); `suppression` =
  do-not-contact entry (email or domain); `pipeline status` = lead
  lifecycle state.

## Requirements (EARS)

### R1 - Discovery (deterministic script)
- REQ-1.1 When the operator runs `gtm:discover --province <p> --segment
  <s>`, the system shall stage matching public business listings into
  `gtm.leads` with source provenance (source, source_url, captured_at).
- REQ-1.2 The system shall dedupe leads on normalized phone OR
  (normalized name + city); re-runs shall upsert, never duplicate.
- REQ-1.3 The system shall only ever stage records whose public data is
  business contact info (org name, address, business phone/email,
  website); personal-name emails are rejected at staging.
- REQ-1.4 While a source adapter is unavailable, the system shall log a
  structured error to gtm.runs and exit non-zero - never silently
  stage partial output as success.

### R2 - Enrichment (rule prefilter + LLM)
- REQ-2.1 The system shall apply a deterministic prefilter before any
  LLM call: rows whose category/name signal non-target (non-education,
  university-only, government sector) become `status='dropped'` with a
  drop_reason; they consume zero tokens.
- REQ-2.2 For every surviving lead the system shall record `segment`
  (center|school|unknown), `fit` (0-10 integer), `fit_reason`, and
  `signals` (jsonb: primary-program hint, chain size hint, english
  focus hint) from one LLM call per lead.
- REQ-2.3 The system shall extract a public business email from the
  lead's own website contact/about pages via deterministic fetch +
  pattern match (no LLM for extraction); found emails populate
  `contact_email`, else null.
- REQ-2.4 Leads with fit >= GTM_FIT_MIN (default 6) AND contact_email
  become `status='enriched'`; others become `status='cold'`.

### R3 - Drafting (LLM, skeleton-locked)
- REQ-3.1 For each `enriched` lead the system shall generate one
  Vietnamese email draft: subject + plain-text body with a personalized
  opening referencing the lead's name/city/signals, a fixed value
  paragraph (practice platform + 29k-question bank + assignments for
  their students), and a low-friction CTA.
- REQ-3.2 Every draft body shall end with the mandated footer block
  defined in REQ-3.5; drafts lacking it are invalid and cannot be
  approved or sent.
- REQ-3.3 Drafts enter `gtm.messages` as `status='pending_review'`; the
  system shall never transition a message to `queued` without an admin
  approval artifact (REQ-3.6).
- REQ-3.4 When no LLM key is configured the system shall fall back to a
  fixed Vietnamese template with the lead's name/city interpolated -
  never emit an empty or English body silently.
- REQ-3.5 The mandated footer block (advertiser identification +
  opt-out mechanism per NĐ 90/2008 + 91/2020) is exactly:

    --
    VieSchool - nen tang luyen tieng Anh tieu hoc
    {sender_name} | {sender_role}
    {business_address} | {reply_email}
    Neu anh/chi khong muon nhan them thong tin, tra loi "KHONG" -
    chung toi se ngung ngay.

  `{sender_name}`, `{sender_role}`, `{business_address}`, `{reply_email}`
  are configured env values, not per-lead LLM output. A draft or message
  without this footer (or with it altered - verified by a deterministic
  `has_footer` marker check on the sentinel line `VieSchool - nen tang
  luyen tieng Anh tieu hoc` + the `tra loi "KHONG"` opt-out line) is
  invalid; the check runs at generate, at approve, and at send.
- REQ-3.6 Approval is a data artifact, not a UI convention:
  `gtm.message_approvals(message_id, approver_uid, body_sha256,
  created_at)` written only by the `gtm_approve_message` RPC
  (security-definer, requires `practice.is_admin()`). A DB trigger on
  gtm.messages rejects any transition to `queued` unless an approval
  row exists whose body_sha256 equals sha256 of the current body. Admin
  sessions cannot UPDATE messages.status directly - column privileges
  grant update only on body/review fields, never status.

### R4 - Send (human-approved, capped, flag-gated, lawful-basis-gated)
- REQ-4.0 Every send-eligible lead shall carry a recorded lawful basis:
  `lawful_basis` on gtm.leads set at staging to
  `public_business_contact` only when the row has source provenance
  (source + source_url) AND the campaign's offer is B2B-relevant to the
  lead's segment. Leads with `lawful_basis IS NULL` or
  `status='dropped'` are ineligible; the send path re-verifies basis +
  non-null provenance at send time. Established-relationship sends
  (a lead that replied) carry `lawful_basis='relationship'` set by the
  reply webhook.
- REQ-4.1 The system shall send only `queued` messages whose lead has
  a contact_email AND a lawful_basis AND is not covered by
  gtm.suppression (exact email or domain) - the suppression + basis
  checks run at send time, not approval time.
- REQ-4.2 While GTM_SEND_ENABLED is not '1', the send command shall
  perform a dry-run (log what would send) and exit 0 - no provider call.
- REQ-4.3 The system shall cap sends per run-day at GTM_DAILY_CAP
  (default 20) counting sends already recorded today.
- REQ-4.4 The system shall allow at most one initial message + one
  follow-up per lead (follow-up only >=4 days after the initial send
  and only when lead status is still 'sent'); a third attempt is
  impossible by contract.
- REQ-4.5 Message status transitions shall be CAS-guarded
  (.eq(status, expected)); a send that cannot claim its row reports a
  conflict, not success.
- REQ-4.6 Every send shall record provider message id + cost estimate +
  campaign attribution in gtm.events.

### R5 - Reply intake (edge function webhook)
- REQ-5.1 The webhook shall reject requests without a valid Resend
  inbound signature (svix-style headers + GTM_REPLY_SECRET).
- REQ-5.2 The webhook shall correlate inbound mail to the original
  gtm.messages row (in-reply-to provider id, then header/from-address
  fallback); unmatched replies park as `reply_unmatched` events -
  never error, never drop silently.
- REQ-5.2b The webhook shall be idempotent: each provider event id is
  stored unique on gtm.events.provider_event_id; a replayed delivery
  returns 200 with no new event row, no reclassification, and no second
  pipeline transition.
- REQ-5.3 For each matched reply the system shall classify
  interested|question|not_now|no|wrong_contact|bounce via LLM (rule
  fallback on keywords) and set the lead pipeline status accordingly;
  `interested` and `question` surface a `needs_human` flag, and any
  matched human reply upgrades the lead lawful_basis to 'relationship'.
- REQ-5.4 On `no` / explicit opt-out language, the system shall add the
  sender's email to gtm.suppression automatically.
- REQ-5.5 On `bounce` the system shall suppress the intended RECIPIENT
  address (parsed from the bounce payload), never the sender address
  (mailer-daemon/postmaster/provider relays are never suppressible);
  hard bounces suppress + mark lead 'bounced', soft bounces only record
  the event and leave the lead sendable.

### R6 - Admin surface (Outreach tab)
- REQ-6.1 The admin Outreach tab shall be reachable only by
  account.role='admin'; teachers and anon get no data (RLS default deny
  + tab hidden by role check).
- REQ-6.2 The tab shall show: leads table (segment, fit, reason, city,
  status, source) with filters; draft queue with approve/edit/reject;
  pipeline counts; suppression CRUD; per-campaign sent/reply/meeting
  stats with cost-per-lead.
- REQ-6.3 Approving a draft shall set `queued`; the send script later
  claims queued rows. The UI never sends directly.
- REQ-6.4 Editing a draft shall save the edited body and mark
  `edited=true` so reviewers can distinguish generated vs edited copy.
- REQ-6.5 Every list/table shall have an empty state; every action an
  inline error naming the field/constraint.

### R7 - Run observability
- REQ-7.1 Every agent run shall write one gtm.runs row: agent name,
  counts in/out, dropped, llm_calls, estimated cost, duration, errors.
- REQ-7.2 LLM calls shall read AI_PROVIDER/AI_MODEL env per
  CONVENTIONS.md (rule fallback, no hardcoded model).

## Acceptance criteria (Gherkin)

- AC-109.1 Given a configured province+segment, when `gtm:discover`
  runs against a seeded fixture source, then the fixture's lead count is
  staged in gtm.leads with provenance, a rerun adds no duplicates, and
  gtm.runs records source_results_seen + pages_exhausted as the
  production ceiling evidence.
- AC-109.2 Given staged leads, when `gtm:enrich` runs, then prefiltered
  leads show drop_reason without an llm_call, and survivors carry
  segment + fit + reason + signals; leads fit>=6 with email are
  'enriched'.
- AC-109.3 Given enriched leads, when `gtm:draft` runs, then each gets a
  pending_review Vietnamese draft ending in the mandated opt-out footer;
  no draft can reach `queued` without a matching gtm.message_approvals
  row.
- AC-109.4 Given queued drafts, when `gtm:send` runs with
  GTM_SEND_ENABLED=0, then zero provider calls occur and the run logs
  the would-send list; with =1 sends respect suppression + lawful_basis
  at send time, the daily cap, and one-follow-up max.
- AC-109.5 Given a signed Resend inbound event for a sent message, when
  the webhook fires, then the reply is recorded, classified, and the
  lead status updates; an unsigned request is rejected; an unmatched
  reply parks as reply_unmatched.
- AC-109.6 Given a `no`/opt-out reply, when classification runs, then
  the sender email lands in gtm.suppression and subsequent sends skip it.
- AC-109.7 Given an admin session, when the Outreach tab opens, then
  leads/drafts/pipeline/suppression/stats render with real rows and
  filters work; given teacher or anon, then the tab/data are denied.
- AC-109.8 Given draft editing, when admin edits + approves, then the
  stored body is the edited one with edited=true; an edit that removes
  the opt-out footer is rejected at approve.
- AC-109.9 Given each agent run, when it finishes, then gtm.runs has one
  row with counts + llm_calls + cost estimate + duration.
- AC-109.10 Given empty lead/draft tables or a failed action (approve a
  footer-less draft, duplicate suppression), then the tab renders empty
  states and inline errors naming the field/constraint.
- AC-109.11 Given the same signed inbound event delivered twice, then
  exactly one canonical gtm.events row exists and pipeline/suppression
  effects apply once (provider_event_id dedupe).
- AC-109.12 Given a lead without lawful_basis or provenance, when
  `gtm:send` runs, then that message is skipped and the run records the
  block reason; a matched human reply upgrades basis to 'relationship'.
- AC-109.13 Given a direct DB update attempt setting messages.status
  to 'queued' without an approval artifact, then the trigger/RLS
  denies it; a stale-hash approval (body edited after approval) also
  fails the trigger.

## Adversarial elicitation pass (self-attack + BA lead review, resolved)

- A1 "Discovery silently succeeds with zero leads" -> REQ-1.4 non-zero
  exit + runs row; AC-109.1 asserts deterministic fixture counts +
  records ceiling evidence.
- A2 "LLM drafts hallucinate claims about the lead's school" -> skeleton
  locks value paragraph to OUR product facts; personalization limited to
  lead name/city/signals; admin approves every send in v1.
- A3 "Suppression checked once at approval then email added later" ->
  REQ-4.1 re-checks at send time.
- A4 "Follow-up loop hammers leads" -> REQ-4.4 hard max 2 touches.
- A5 "Webhook spoof injects fake interested replies" -> REQ-5.1
  signature gate; unmatched park without crashing.
- A6 "Client-side user triggers sends" -> send is a service_role script
  path only; admin UI only queues.
- A7 "Lead table becomes a personal-data store" -> schema fields are
  org-level by contract; REQ-1.3 rejects personal-name emails.
- A8 "Draft edit bypasses opt-out rule" -> has_footer gate at generate +
  approve + send (REQ-3.5), AC-109.8.
- A9 "Two send runs race and double-send" -> CAS claim + unique index on
  (lead_id, kind) preventing a second initial.
- A10 "Webhook replay re-applies classification/suppression" ->
  REQ-5.2b provider_event_id unique dedupe, AC-109.11.
- A11 "Bounce poisons suppression with mailer-daemon addresses" ->
  REQ-5.5 suppresses the intended recipient only, AC-109.6 extension.
- A12 "Approval bypassed by direct status UPDATE" -> REQ-3.6 trigger +
  column privileges + body-hash staleness, AC-109.13.
- A13 "Send without lawful basis" -> REQ-4.0 basis recorded at staging +
  re-verified at send, AC-109.12.
- OPEN-1: Google Places key vs Playwright Maps scrape for discovery -
  decided at Tech Lead (no Places key found in secrets; default =
  Playwright, Places adapter if a key appears).

## Out-of-scope restatement

No B2C, no consumer lists, no Zalo automation, no auto-reply bot
(interested replies flag a human), no sends before domain verification.
