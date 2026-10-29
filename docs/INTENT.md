# Intent: GTM outbound agent for VieSchool B2B
Author: linhl (product owner). Status: approved direction.
Intake class: greenfield feature-area on existing repo (no live GTM behavior to preserve).

## Problem
"tao thấy hệ thống này: Explee - 24/7 AI agent that finds clients while
you sleep... họ hỗ trợ tìm khách hàng tiềm năng có liên quan đến domain
của mình. sau đó gửi email marketing và nhận về sự quan tâm + bán được
hàng. mày có thể nghiên cứu và làm theo hướng này không?"

Research finding (2026-10-29): Explee/AutoGTM is an open-source agent
stack - market research -> ICP -> lead discovery (their DB) -> enrich +
fit-score -> personalized draft -> send via pre-warmed infra (Resend/
Instantly) -> reply classify -> book meeting. Their stack is Supabase +
Resend + LLM - the same stack this ecosystem already runs. Their weak
spot per independent reviews: non-English markets, Vietnamese lead data,
Vietnamese copy. All three are our home field.

## Human rulings at intake
- ICP: BOTH B2B segments - English centers (ICP-A) AND private/
  international schools (ICP-B). No B2C: cold-emailing parents is
  rejected (VN anti-spam NĐ 90/2008 + 91/2020 consent requirement,
  channel mismatch - VN parents buy edtech via Zalo/Facebook, brand risk
  for a kids' product).
- Pilot decision: build in-house for VN now, no Explee paid pilot.
- PO autonomy: owner delegates execution ("mày toàn quyền xử lý nhé PO").

## Proposed outcome
An agent pipeline that finds Vietnamese B2B leads, scores fit, drafts
personalized Vietnamese outreach, sends via dedicated mail infra, and
tracks the funnel from lead to booked meeting - run as the same
script/worker pattern the repo already uses for content pipelines.

## Affected users and systems
- Operator: admin/owner (reviews lead queue, approves sends, tracks pipeline).
- Surfaces: new admin tab inside existing AdminScreen (admin role only).
- Backend: new `gtm` Postgres schema, edge function reply webhook,
  Resend for delivery, LLM for enrich/draft/classify.
- NOT affected: kid-facing flows, question bank, scoring moat, pricing.

## Constraints
- Business-contact data only (public listings/websites) - never scraped
  personal/consumer emails; every send enforces a suppression list.
- Dedicated sending domain (never vieschool.com primary) - owner DNS task.
- Human approve-to-send gate in v1; daily send cap; single follow-up max.
- Vietnamese outreach copy; hyphen-only convention; admin UI reuses
  existing AdminScreen tokens.
- Costs bounded: LLM calls only for enrich/draft/classify; deterministic
  dedupe/scoring scaffolding does not burn tokens.

## Open questions (recorded for BA)
- Google Places API key vs Playwright Maps scraping for lead discovery.
- Sending domain choice (subdomain vs separate domain) - owner decides
  at deploy gate; send path stays feature-flagged until verified.
- Whether reply webhook is needed in v1 or manual status marking first.

---
Origin: human brainstorm (owner request + external product research)
Committed by: orchestrator (intake)
