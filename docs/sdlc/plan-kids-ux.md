# Project Plan - Kids-UX Redesign + Parent Conversion

Status: r2 draft → PM lead review.
Intent: `docs/INTENT.md`. Baseline: `docs/sdlc/discovery-kids-ux.md`.
Class: brownfield | Fidelity: token-faithful | Review mode: ai | Human gates: strict.

## Scope

Redesign the kid-facing experience to best-in-class elementary-edtech level and
add the parent-conversion path, without rewriting working mechanics.

**In scope (candidate, finalized at BA gate):**
1. StartBatchScreen IA restructure (1 primary CTA, grouped secondary entry points).
2. Kid-surface visual language upgrade: mascot/art system, option-question
   components, land scenes - from "stock" to authored.
3. Pre-reader support: read-aloud instructions (reuse `speech.ts` TTS chain),
   icon-first controls for grade 1-2 surfaces.
4. Auth/onboarding redesign: parent-vs-kid split, signup entry, PIN recovery.
5. Parent surfaces: visible report entry, conversion path (trial/lead/pricing
   - options matrix at BA gate decides real checkout vs lead capture).
6. Reward-economy simplification (one primary currency visible to kids).
7. Exam-screen identity ruling + optional unification.

**Out of scope:** question bank content changes, backend schema changes unless
ADR-approved, admin console, pronunciation STT provider work (separate CR).

## WBS with work-package estimates

Estimates are agent-effort units (WP = focused work package ≈ one subagent
dispatch or ~half-session of orchestrated work). Buffers included.

| # | Phase | Work packages | Est. | Gate |
|---|---|---|---|---|
| 0.5 | Discovery | WP-1 surface inventory (done), WP-2 research×2 (in flight) | 3 | - |
| 1 | PM | WP-3 this plan | 1 | PM lead review |
| 2 | BA | WP-4 PRD + personas + Gherkin ACs, WP-5 options matrices (checkout-vs-lead, account model, exam identity), WP-6 privacy matrix (child-data authz + no-new-PII verification plan) | 4 | BA lead + HUMAN |
| 3 | Designer | WP-7 design brief + IA + wireframe specs, WP-8 token delta + component specs, WP-9 Domain UX Benchmark rubric (vs Duolingo-ABC/Khan-Kids anchor, floor score declared), WP-10 asset spec (mascot/illustration system + license/reduced-motion rules per constitution §13-30,42-45) | 5 | Design lead + HUMAN |
| 4 | Tech Lead | WP-11 ADRs (component architecture, asset pipeline, TTS reuse, parent-surface data needs), WP-12 fitness functions + rollback contract | 3 | Tech lead + HUMAN |
| 5 | Dev | WP-13 implementation plan commit, WP-14..18 per-surface implementation (start-batch, auth/parent, question visuals, pre-reader TTS, reward simplification), WP-19 unit tests | 8 | Dev lead |
| 6 | Tester | WP-20 deterministic pre-pass, WP-21 kid E2E incl. grade-1 no-reader matrix, WP-22 parent funnel E2E + authz denial tests (cross-account, owner-only report), WP-23 axe a11y + contrast + 44px sweep, WP-24 perf budgets, WP-25 visual/token checks per breakpoint | 5 | Test lead |
| 7 | Deploy | WP-26 staged promotion + rollback plan + health checks | 1 | DevOps lead + HUMAN |
| 7.5 | External review | WP-27 whole-repo independent review → triage → repeat ≤3 | 3 | clean round |
| 8 | PM | WP-28 convergence pass + RTM + final report | 1 | PM lead + HUMAN |

### Milestones (cumulative WP)

| Milestone | Through WP | Cumulative est. |
|---|---|---|
| M1 Requirements approved | WP-6 | 12 |
| M2 Design approved | WP-10 | 17 |
| M3 Architecture approved | WP-12 | 20 |
| M4 Code complete | WP-19 | 28 |
| M5 QA green | WP-25 | 33 |
| M6 Live + external clean | WP-27 | 37 |
| M7 Final report | WP-28 | 38 |

Buffered total: 38 WP units + 20% contingency = **46 WP**, applied
non-cumulatively to Dev (WP-14..19) and Tester (WP-20..25) only.

## Privacy / safety verification plan (release-blocking)

- Report surface: owner-only access verified by denial tests (account A cannot
  read account B child's report; guest cannot reach report data).
- **No-new-PII audit (WP-22 evidence):** deterministic diff of touched tables,
  payload schemas, and analytics/event emissions before vs after - zero new
  child-PII fields permitted. Any exception requires a formal CR with human
  approval; BA-gate approval alone is NOT sufficient.
- Parent-gate pattern (adult-verification interstitial) required before any
  parent-only action (account links, purchases) - spec at design phase,
  tested in WP-22.
- New authz rules get RLS/fitness-function coverage, not UI-hiding only.

## Brownfield release contract + rollback

- Preservation evidence: baseline behavior matrix (from
  `discovery-baseline.md` + existing 1020+ unit suite + 49 e2e) must pass
  100% pre-deploy; any intentional behavior change is listed in the PRD with
  its AC - silent changes are defects.
- Promotion: deploy to Vercel preview first → full verification → then merge
  to `main` (auto-deploys prod). If risk is assessed high at Tech Lead gate,
  add a `VITE_UX_V2` feature flag as kill-switch; otherwise the flag is
  optional and the rollback is `git revert` + redeploy (<10 min, documented
  in deploy runbook).
- **Rollback rehearsal (WP-26, timed):** on the preview deployment, perform a
  `git revert` + redeploy drill and record elapsed time before the prod
  go-live gate - the <10 min claim must be proven, not asserted.
- Asset pipeline constitution compliance (constitution §13-30,42-45):
  same-origin/owned assets only, license recorded per asset, animation
  budgets + `prefers-reduced-motion` fallbacks tested in WP-23/24.

## Success metrics (measurable at Phase 6/7)

- Pre-reader path: scripted grade-1 no-reader matrix - every instruction
  surface has a working listen affordance; batch completable by tapping
  speaker icons + answer tiles, verified incl. audio-unavailable degrade
  (icons + visual states still complete the task).
- StartBatchScreen: ≤6 visible primary decisions on first paint (DOM count).
- Parent funnel: E2E completes landing→parent-gate→report→conversion CTA;
  funnel step events present (not just "CTA present").
- Benchmark floor: Domain UX Benchmark rubric ≥ declared floor (set in WP-9,
  target ≥80% of Duolingo-ABC-class anchor scores).
- a11y: 0 serious axe violations per route; every text pair ≥AA measured;
  touch targets ≥44px enumerated.
- Perf: landing LCP ≤2.5s (current ~0.7s), audio tap-to-sound <300ms warm,
  no CLS regression.

## Risks

| Risk | Mitigation |
|---|---|
| Scope creep - "redesign everything" | BA gate freezes AC list; deferred items go to CR backlog |
| Asset pipeline has no source of truth today | Tech Lead picks AI-generated vs icon-system; one isolated module; constitution gates above |
| Regression on 1000+ existing tests | Release contract above; token-level changes favored |
| Parent features may imply new data | BA options matrix: reuse account vs minimal parent link |
| Kid vs parent UI conflict on same entry | IA decision at design gate (age gate vs role entry) |
| Exam unification touch 1234-line screen | Separate decision at BA; may ship as phase-2 CR |

## Timeline note

Single-agent pipeline with subagent workers; phases sequential. Human gates at
BA, Design, Tech Lead, Deploy, Final - per strict HITL config. Every phase
ends with a pinned cross-model lead review; human approval does not replace
lead review.
