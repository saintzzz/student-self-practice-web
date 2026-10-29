# CR-109 — GTM outbound agent (VieSchool B2B lead pipeline)

- Status: DRAFT at intake - routed via full pipeline (greenfield
  feature-area). Raised by: owner (INTENT.md 2026-10-29).
- Classification: new feature-area, NOT a change to existing behavior.
  No CR to kid flows, bank, scoring, or arena.

## What changes

A self-hosted outbound pipeline for VieSchool B2B growth, replacing the
idea of renting Explee. Five agents on the repo's existing script-worker
pattern, one admin surface, one new Postgres schema, one send webhook.

## Scope (v1)

1. `gtm` schema: leads, campaigns, messages, events, suppression list.
   RLS: service_role for workers, admin-authenticated read/write for the
   admin surface. Zero overlap with `practice` schema tables.
2. Discover agent (`scripts/gtm/discover.mjs`): finds Vietnamese English
   centers (ICP-A) and private/international schools (ICP-B) from public
   sources; deterministic dedupe on phone + normalized name + city.
   Output: staged leads, never sent automatically.
3. Enrich agent (`scripts/gtm/enrich.mjs`): LLM classifies segment,
   scores fit 0-10 with reasoning, extracts public business contact
   info from the lead's own website when present. Rule-based prefilter
   drops non-target rows before any LLM call.
4. Draft agent (`scripts/gtm/draft.mjs`): Vietnamese email per lead -
   personalized first paragraph referencing lead name/city/program
   signals, fixed skeleton, plain-text style, opt-out line, no links
   to attachments. LLM with rule fallback when no key.
5. Send path (`scripts/gtm/send.mjs` + Resend): human-approved queue
   only, daily cap, suppression enforcement at send time, one follow-up
   max. Feature-flagged `GTM_SEND_ENABLED=0` until the dedicated domain
   is verified - drafts still accumulate.
6. Reply intake: Supabase edge function `gtm-reply-webhook` verifies
   Resend inbound signature, records reply, LLM classify
   interested/not-now/no/wrong-contact, updates pipeline status.
7. Admin surface: new `Outreach` tab in AdminScreen (admin role only) -
   lead list with fit score + reasoning, draft queue with approve/edit/
   reject, pipeline board (new -> queued -> sent -> replied -> meeting
   -> customer / dead), suppression management, campaign stats
   (sent/replies/meetings/cost-per-lead).

## Impact assessment

- Routes/screens: one new tab on the existing admin screen (admin-only,
  already RBAC-gated); zero kid-facing surface changes.
- Data model: new `gtm` schema only; `practice` schema untouched.
  Migrations additive, no column changes to existing tables.
- RBAC: admin role reads/writes gtm.*; teacher role gets nothing (gated
  by isAdmin, same as existing tabs); anon gets nothing (RLS default
  deny + no grants).
- Security posture: lead PII limited to business contact info (name of
  org, business email/phone, address); no student/child data anywhere
  in the schema by design. Webhook verifies Resend signature. Send path
  feature-flagged off until domain verification.
- Performance: zero effect on kid bundle - admin tab lazy-imports its
  components (admin chunk already lazy); scripts run off-app.
- Legal/brand: VN anti-spam (NĐ 90/2008 + 91/2020) - business addresses
  only, identification + opt-out in every email, suppression list
  honored at send, no consumer lists, no purchased lists, volume cap.
- Ops: new secrets needed only for send (Resend key exists; dedicated
  domain DNS is a human task recorded in the deploy gate).

## Non-scope (explicit)

- No B2C/parent outreach, no Zalo automation, no purchased lead lists.
- No live-booking calendar bot - v1 surfaces interested replies for a
  human to close; auto-reply drafting is a later CR if volume justifies.
- No sending until domain verified; the approve queue works without it.

## Estimate

- Schema + RLS + webhook function: S (1 migration, 1 edge fn).
- Agents (discover/enrich/draft/send): M - largest unknown is the lead
  source; Playwright-Maps scraper is the fallback if no Places key.
- Admin tab + tests + review loop: M.
- Total: ~2-3 working sessions on this repo; external spend ~$0 beyond
  existing LLM keys (Resend free tier covers early volume).

## Options considered (recorded)

| Option | Verdict |
|---|---|
| Rent Explee ($30 pilot) | Rejected for VN ICP - weak VN data + English-only drafting per reviews; revisit only for international school segment later |
| Buy lead lists | Rejected - unknown consent provenance, brand risk |
| Facebook/Zalo outreach automation | Deferred - needs Zalo OA account + different automation surface; phone numbers still captured for human follow-up |
| In-house agent (chosen) | Fits existing stack, VN-native data + copy, ~zero marginal cost |

## Acceptance criteria (headline; full set in BA PRD)

- AC-109.1 Discover stages >=50 deduped ICP leads per province run into gtm.leads.
- AC-109.2 Enrich assigns segment + fit 0-10 + reasoning to every staged lead; non-target dropped before LLM spend.
- AC-109.3 Draft produces a Vietnamese email per approved-fit lead with opt-out line; no send without admin approval.
- AC-109.4 Send enforces suppression list + daily cap + single follow-up; sends only with GTM_SEND_ENABLED=1 and verified domain.
- AC-109.5 Reply webhook verifies signature, records reply, classifies, updates pipeline status.
- AC-109.6 Admin tab: lead list, draft queue approve/edit/reject, pipeline board, suppression CRUD - admin role only, teacher/anon denied.
- AC-109.7 Every send records cost + campaign; stats view shows sent/replies/meetings per campaign.
