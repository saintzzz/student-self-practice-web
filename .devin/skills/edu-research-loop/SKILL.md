---
name: edu-research-loop
description: Weekly PO research cycle - survey the world's best K-5 learning apps, write a report, decide CR filings, keep the product pedagogy current. Runs weekly via launchd (devin -p headless) and manually anytime. Output docs/research/edu-apps/.
---

# Edu research loop (weekly)

Purpose: keep English Arena's pedagogy at world-class level by
continuously studying the best global learning products and converting
findings into CRs. The agent running this IS the PO: it decides what
gets filed, what gets deferred, what gets dropped. It never implements
features inside this loop - implementation runs through the normal
SDLC pipeline (PM->BA->...->external review).

## Cadence

- Weekly, Monday ~07:00 local, via `scripts/edu-research-weekly.sh`
  (launchd `com.vieschool.edu-research`).
- Manual: `devin -p "run the edu-research-loop skill"` in this repo.

## Focus rotation (pick the next un-done theme)

1. Math pedagogy (CPA, bar models, manipulatives, adaptive engines)
2. Gamification & retention (streaks, goals, rewards, live class play)
3. VN competitors (VioEdu, Monkey Junior, Kyna, IOE-native features)
4. STEM/science & English cross-subject methods
5. Teacher/admin workflow (reports, differentiation, classroom tools)

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
   skeleton under `docs/project/CR-NNN-*.md` (next free number) with
   problem/evidence/scope/acceptance - the SDLC picks it up later.
6. Commit + push ONLY files under `docs/` (report, backlog, CR docs).
   Never push code, scripts, secrets, or scratch files.

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
- Report diffs only under `docs/`; the loop NEVER self-deploys code.
