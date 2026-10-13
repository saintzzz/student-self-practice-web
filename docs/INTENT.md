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
