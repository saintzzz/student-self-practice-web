# CR-73: Full-system redesign via adaptive-uiux-design-system

## What changes

A full redesign of every English Arena surface - visual system AND
information architecture - specified with the
`designer/skills/adaptive-uiux-design-system` method (context manifest,
design thesis, invariant/adapt matrix, semantic token layers, component
contracts, journey mapping, implementation mapping, validation).

## Decisions (human-approved 2026-10)

- **Scope:** full redesign INCLUDING information architecture - not just a
  re-skin. Screen layouts and journeys may be re-drawn.
- **Brand:** navy/gold VieSchool shell is KEPT and upgraded - shared
  foundations stay consistent while kid/parent/exam surfaces diverge
  appropriately (ecosystem mode).
- **Surfaces:** ALL - kid play, journey map, question cards, engagement,
  parent (gate/reports/purchase), exam/IOE, auth, admin.

## Why

CR-69/CR-72 fixed the worst defects (icons, mascot, mobile density, a11y)
but the design accreted over 40+ CRs: three role surfaces share tokens
that were never designed as one system, the IA grew organically (Explore
sheet vs HomeShelf vs ArenaCard overlap), and DESIGN_SYSTEM.md describes
what exists rather than what should exist.

## Impact assessment

| Area | Impact |
|---|---|
| Screens | All 9 top-level screens (login, admin, grade-select, start-batch, batch, credits, placement, exam, report) |
| Components | ~60 components incl. 15+ question types - component contracts define shared primitives first |
| Tokens | `src/lib/ui/tokens.ts` remains the implementation SSOT but is reorganized into primitive/semantic/component layers |
| DESIGN_SYSTEM.md | Rewritten to v2 - it becomes the spec output of this CR |
| Behavior | IA changes may alter navigation (e.g. journey-map vs sheet vs shelf consolidation); content/scoring/audio engines untouched |
| Tests | Visual selectors (testids) preserved; class-level changes need test sweep |
| Risk | IA churn can break e2e flows - mitigate by keeping screen-state machine + testids stable where possible |

## Estimate

Separate effort from prior CRs. Two deliverable tracks:

1. **Design spec package** (Designer phase): context manifest, thesis,
   invariant/adapt matrix, token layers, component contracts, journey
   maps, implementation mapping, validation checklist.
2. **Implementation** (Dev/Test/Deploy phases): token layer refactor,
   component contract implementation, per-surface redesign rollout,
   Playwright visual verification.

## Re-entry point

Re-enter at BA/Designer (Phase 2-3) - IA change invalidates downstream
artifacts. PM/WBS not re-run per CR rules.

## Approvals

- Human approved scope/brand/surface decisions via intake questions
  (2026-10, recorded above).
- Design Lead review required before implementation.
