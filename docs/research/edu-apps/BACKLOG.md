# Edu-apps research backlog (PO-maintained)

CR candidates ranked by expected impact x feasibility. Source reports:
`docs/research/edu-apps/`. Status: filed / in-SDLC / shipped / deferred / dropped.

| # | Candidate | Evidence | Status |
|---|---|---|---|
| 1 | **Science misconception distractors + per-option why-wrong feedback** (CR-144) - replace junk distractors with documented K-5 misconceptions, "tai sao sai" hint per option, misconception-first fact growth | POE meta g=1.015 elementary; misconception literature; CR-137 pattern proven on EN | shipped W48 (23,741 live science MCQs patched + Playwright-verified; pending deploy + external review) |
| 2 | **math-vi live arena** (CR-143) - extend arenaLive realtime races to math bank, accuracy-first scoring, same-seed | VioEdu đấu trường 5M+ students; meta-analysis: competition+collab strongest behavioral combo | filed W47 - next in queue |
| 3 | **Predict-first science round** (CR-145) - child commits to a prediction before the correct claim appears, then reconciles | POE meta-analysis g=0.979 overall / g=1.015 elementary | filed W48 |
| 4 | **Strategy-aware adaptivity** - response-time + error-pattern signals into fetch_questions_adaptive | DreamBox strategy-tracking (37 as tens vs singles) | backlog - latency_ms now logged in qb_attempt_events; needs selection-signal design |
| 5 | **Productive-struggle puzzle bank** - logic/pattern/multi-step puzzles for Nâng cao | Beast Academy puzzle-first engagement | backlog - content authoring cost |
| 6 | **Science fact imagery** - picture pairing on concrete science terms | IOE primary format is word<->picture; imagery studies favor delayed recall BUT provided-picture evidence is mixed (image CREATION beats provided pictures) | backlog - asset cost; consider "draw it" prompt instead |
| 7 | **Collectible depth pass** - sticker rarity tiers + album completeness display | Blooket Blooks = replay driver | backlog - marginal evidence; needs more album content first |
| 8 | **Teacher-awarded recognition** - class points for effort/teamwork | ClassDojo: on-task up, learning outcomes unproven; grades 1-2 null; never rank | backlog - needs teacher dashboard; design constraint: effort/team only |
| 9 | **Narrative/comic wrapper** - characters + unit arcs | Beast Academy, Prodigy | deferred - highest content cost |
| 10 | **Phenomenon-anchored video units** - Mystery Science analog | BrainPOP transfer ES=1.00 but tied to a produced-video library; Mystery Science itself has no included efficacy study | deferred - highest content cost |
| 11 | **Team/coop arena mode** - pairs/small-team races | Meta-analysis: competition+collab combo | backlog - after CR-143 proves arena engagement |

## Done / absorbed

- CPA visual models (bar model, number bond, groups) - shipped CR-133
- Semantic correctness + collocation typing + guard - shipped CR-135
- Visual-puzzle question_type - shipped CR-136 (W46)
- Distractor-aware misconception feedback - shipped CR-137 (W46)
- Verdict mascot reaction + session combo - shipped CR-139 (W46)
- Server-truth streak + separated daily goal - shipped CR-138 (W47)

## Dropped (do not resurrect without new evidence)

- Speed-scored competition (Kahoot trap: rewards fast guessing) - W47
- Real-prize redemption / đổi quà (ops-heavy, extrinsic-reward risk) - W47
- Hearts/lives punitive mechanics - W46-ux
- Pay-to-win loops - W46-ux
- Virtual-lab / hands-on simulation layer (Slavin: materials alone ES=+0.02) - W48
