# Edu-apps research backlog (PO-maintained)

CR candidates ranked by expected impact x feasibility. Source reports:
`docs/research/edu-apps/`. Status: filed / in-SDLC / shipped / deferred / dropped.

| # | Candidate | Evidence | Status |
|---|---|---|---|
| 1 | **Server-truth streak + separated daily goal** (CR-138) - streak from `practice.results`, goal from `qb_attempt_events`, weekend amulet, day-3/7 milestone | Duolingo: separation +3.3% D14, freeze +0.38% DAU, loss-aversion @day7 | in-SDLC (W47) |
| 2 | **math-vi live arena** (CR-143) - extend arenaLive realtime races to math bank, accuracy-first scoring, same-seed | VioEdu đấu trường 5M+ students; meta-analysis: competition+collab strongest behavioral combo | file CR (W47) |
| 3 | **Strategy-aware adaptivity** - response-time + error-pattern signals into fetch_questions_adaptive | DreamBox strategy-tracking (37 as tens vs singles) | backlog - latency_ms now logged in qb_attempt_events; needs selection-signal design |
| 4 | **Productive-struggle puzzle bank** - logic/pattern/multi-step puzzles for Nâng cao | Beast Academy puzzle-first engagement | backlog - content authoring cost |
| 5 | **Collectible depth pass** - sticker rarity tiers + album completeness display | Blooket Blooks = replay driver | backlog - marginal evidence; needs more album content first |
| 6 | **Teacher-awarded recognition** - class points for effort/teamwork | ClassDojo: on-task up, learning outcomes unproven; grades 1-2 null; never rank | backlog - needs teacher dashboard; design constraint: effort/team only |
| 7 | **Narrative/comic wrapper** - characters + unit arcs | Beast Academy, Prodigy | deferred - highest content cost |
| 8 | **Team/coop arena mode** - pairs/small-team races | Meta-analysis: competition+collab combo | backlog - after CR-143 proves arena engagement |

## Done / absorbed

- CPA visual models (bar model, number bond, groups) - shipped CR-133
- Semantic correctness + collocation typing + guard - shipped CR-135
- Visual-puzzle question_type - shipped CR-136 (W46)
- Distractor-aware misconception feedback - shipped CR-137 (W46)
- Verdict mascot reaction + session combo - shipped CR-139 (W46)

## Dropped (do not resurrect without new evidence)

- Speed-scored competition (Kahoot trap: rewards fast guessing) - W47
- Real-prize redemption / đổi quà (ops-heavy, extrinsic-reward risk) - W47
- Hearts/lives punitive mechanics - W46-ux
- Pay-to-win loops - W46-ux
