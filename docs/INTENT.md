# Intent: Kids-first UX redesign + parent-conversion surface
Author: linhl (product owner). Status: draft.
Intake class: brownfield (live product, new cross-cutting UX requirement).

## Problem
"deep research và improve UI (và UX) cho dự án này... tôi muốn một sản phẩm phù hợp nhất với trẻ em tiểu học, cả về nội dung và hình thức. và phụ huynh nhìn vào sẽ muốn mua cho con ngay lập tức."

Current state after CR-69 critique (design health 25/32): the shell has identity (navy/gold VieSchool, journey map) but the surfaces kids touch most are generic (emoji mascot, stock option buttons, IOE-clone exam). StartBatchScreen overloads a 7-11yo with ~16 tap targets. No pre-reader support (all text instructions). No parent-facing surfaces at all (no signup, no onboarding, no progress report for parents, no purchase/trial path).

## Proposed outcome
- A 6-11 year old can use the app with minimal reading ability, guided by voice/illustration.
- Visual quality at the level of best-in-class kids learning apps (Duolingo ABC, Khan Kids class), not stock component look.
- A parent landing on the app understands what it does, trusts it, and has a path to buy/enroll.

## Affected users and systems
- Kids grade 1-5 (primary user), parents (buyer), admin/staff.
- Surfaces: landing/auth, StartBatchScreen, practice round surfaces, rewards/progress, exam screens, parent/report surfaces (may be new).
- Repo: student-self-practice-web (Vite/React/TS/Tailwind, Supabase, Vercel).

## Constraints
- Keep existing Supabase backend + data model unless an ADR justifies change.
- Vietnamese-first copy, hyphen-only (no em/en dash), WCAG AA contrast floor, 44px touch targets.
- Fidelity: token-faithful (no Figma source exists).
- No new PII for kids; parent-facing surfaces must not leak child data beyond owner.

## Open questions
- Does "phụ huynh muốn mua ngay" imply a real pricing/checkout surface, or a marketing/onboarding surface that drives conversion to existing enrollment?
- How far does visual redesign go - restyle existing screens vs new illustration/mascot system?
- Parent dashboard scope: read-only progress report vs account management?

---
Origin: human brainstorm (owner request)
Committed by: orchestrator (intake)

## Outcome (2026-10-14)
- Status: DELIVERED + DEPLOYED (ea.vieschool.com, commit 233853d).
- Pipeline: full SDLC - discovery research, PM plan, BA PRD r2 + human rulings (OM-1..5), designer spec "Mot con duong vang" + human gate, Tech Lead ADR + human rulings, dev (6 parallel workers + orchestrator merge), dev-lead r3 APPROVE, test-lead APPROVE (mutation-verified), human go-live, external review r18 CLEAN (4 rounds).
- Open questions resolved: pricing = in-app honest card + manual transfer (OM-1B); redesign = full kid shell restructure (mascot-led, one-gold-CTA); parent dashboard = read-only report + email digest enrichment (remote view deferred to CR-70).
- Deferred: CR-70 backlog (marketing landing, remote parent view, guest email capture, auth redesign, real payment gateway).

---

# Intent 2 (2026-10-22): maintenance wave - close the deferred ledger
Author: linhl. Status: approved ("lam lan luot nhe. sau do chay lai SDLC").
Intake class: CR wave on brownfield - 4 tracked CRs, no WBS re-run.

## Request (originator's words)
Pending items from the MEMORY deferred ledger, worked in order, then a
fresh SDLC pass over the project.

## Intake map
| CR | Item | Status at intake | Re-entry |
|---|---|---|---|
| CR-105 | Bundle budget remainder (legacy absolute caps ~9kB over) | doc + measured | BA -> tiny Dev |
| CR-106 | "Teach me" pre-answer lessons | design sketch | BA (content-scope ruling needed) |
| CR-107 | Adaptive difficulty fetch (ZPD-biased) | design sketch | BA -> Tech Lead (new RPC) |
| CR-108 | Turnstile botnet defense | BLOCKED: Cloudflare signup | hold until account exists |

## Already resolved at intake (no pipeline work needed)
- G5 exam-pool gap: VERIFIED CLOSED 2026-10-22 (2,327 distinct pools,
  gate >=800) - measurement recorded in MEMORY, no code change.
- r17/r18 review rounds: long closed (r18 CLEAN; loop reached r102
  APPROVE since).

## Order of work
CR-105 first (smallest, gates honesty), then CR-107 (design-ready),
then CR-106 (largest - content authoring scope), CR-108 parked.
