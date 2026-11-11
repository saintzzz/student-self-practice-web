---
name: edu-research-loop
description: Weekly PO research cycle - survey the world's best K-5 learning apps (pedagogy AND UI/UX), write a report, then auto-implement the decided items in the same run. Runs weekly via launchd (devin -p headless) and manually anytime. Output docs/research/edu-apps/.
---

# Edu research loop (weekly)

Purpose: keep English Arena at world-class level - pedagogy AND
interface - by continuously studying the best global learning products.
The pipeline is the user's stated flow:

  self-evaluate as PO -> write the report -> (headless devin reads the
  report) -> auto-implement whatever the report's Decisions marked
  "implement", in the SAME run, through the normal SDLC gates.

The report is the contract: implementation works ONLY off its Decisions
section. The agent running this IS the PO - it decides what ships, what
is deferred, what is dropped.

## Cadence

- Weekly, Monday ~07:00 local, via `scripts/edu-research-weekly.sh`
  (launchd `com.vieschool.edu-research`).
- Manual: `devin -p "run the edu-research-loop skill"` in this repo.

## Focus rotation (pick the next un-done theme)

Every cycle surveys BOTH axes of the chosen theme: pedagogy (how kids
learn) and UI/UX (how the product looks/feels/responds). UX reports go
to `<YYYY>-W<ww>-ux.md` when the theme is pedagogy-led, or inline in the
main report when the theme is UX-led.

1. Math pedagogy (CPA, bar models, manipulatives, adaptive engines)
2. UI/UX & interaction patterns (feedback moments, character systems,
   celebration, tap targets, motion, empty/error states)
3. Gamification & retention (streaks, goals, rewards, live class play)
4. VN competitors (VioEdu, Monkey Junior, Kyna, IOE-native features)
5. STEM/science & English cross-subject methods
6. Teacher/admin workflow (reports, differentiation, classroom tools)

## Method

1. Read `docs/research/edu-apps/BACKLOG.md` + the latest report so the
   cycle builds on prior state, never repeats it.
2. Web-research 4-8 sources for this week's theme: official product
   docs, peer-reviewed or university evaluations, reputable edtech
   analyses. Prefer primary sources and measurable claims.
3. Write `docs/research/edu-apps/<YYYY>-W<ww>.md` using the template
   below. Ground every claim in a named source/product.
4. Update `docs/research/edu-apps/BACKLOG.md`: re-rank CR candidates,
   mark what was filed/shipped/deferred, add new candidates.
5. For each item marked "File CR" in Decisions, create the CR doc
   under `docs/project/CR-NNN-*.md` (next free number) with
   problem/evidence/scope/acceptance.
6. **Implement** - reread the report's Decisions section and implement
   every item marked "implement" (auto-implement if warranted = the PO
   already decided it in the report). Run the full SDLC per item
   (code -> tests -> commit -> deploy -> external review). If an item
   is too large for one cycle, implement its highest-value slice and
   mark the rest in BACKLOG. Only items the report explicitly marks
   "research-only / next cycle" stay as docs.
7. Commit + push docs AND implementation. Never push secrets or
   scratch files.

## Report template

```md
# Edu-app research - Week <ww>, <YYYY>
Scope / Method
## Landscape: what the best products actually do (table)
## What we already have
## Gaps ranked by expected impact (G1..Gn w/ evidence + feasibility)
## Decisions this week (PO): File CR / backlog / drop + rationale
## Next week's focus rotation
```

## PO decision rules

- **File a CR** when: evidence of real learning/retention benefit AND
  feasible on our stack AND not already covered.
- **Backlog** when: promising but blocked (schema work, content cost)
  or evidence is thin - note what would unblock it.
- **Drop** when: gimmick without learning value, or duplicated by
  something we already do.
- Every filed CR must cite the research that motivated it.
- Content quality bar: never propose generating semantic Vietnamese
  content via free LLM text without a semantic guard (CR-135 lesson).

## Hard rules

- Research stays honest: negative/mixed findings are recorded, not
  cherry-picked. Correlate-only claims are labeled as such.
- No competitor brand assets/copy in our product - methods only.
- Implementation runs the normal pipeline gates (lint/typecheck/tests/
  build, external review loop until clean); a cycle that can't finish
  its CRs leaves them marked in-progress in BACKLOG, not half-shipped.
