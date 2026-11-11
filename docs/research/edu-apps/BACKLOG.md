# Edu-apps research backlog (PO-maintained)

CR candidates ranked by expected impact x feasibility. Source reports:
`docs/research/edu-apps/`. Status: filed / in-SDLC / shipped / deferred / dropped.

| # | Candidate | Evidence | Status |
|---|---|---|---|
| 1 | **Visual-puzzle question_type** - model-first questions (choose/complete the bar model, number bond, balance) per ST Math visual-first | ST Math 1.3M students, language-independent schema building | file CR (W46) |
| 2 | **Distractor-aware feedback** - per-distractor misconception lines + corrected model in explanation | Zearn "precise feedback at moment of misconception"; our distractors already encode error patterns | file CR (W46) |
| 3 | **Streak + daily goal** - "5 câu mỗi ngày", weekend-amulet analog, streak display on hub | Duolingo: 7-day streak = 2.4x retention; wager +14% D7 | file CR (W46) |
| 4 | **Strategy-aware adaptivity** - response-time + error-pattern signals into fetch_questions_adaptive | DreamBox strategy-tracking (37 as tens vs singles) | backlog - needs attempt schema + signal design |
| 5 | **Productive-struggle puzzle bank** - logic/pattern/multi-step puzzles for Nâng cao | Beast Academy puzzle-first engagement | backlog - content authoring cost |
| 6 | **Narrative/comic wrapper** - characters + unit arcs | Beast Academy, Prodigy | deferred - highest content cost, revisit after 1-4 |
| 7 | **Live class play** (Kahoot/Blooket-style) | arena exists EN-only; VN math live quiz possible | backlog - needs W47 gamification report |

## Done / absorbed

- CPA visual models (bar model, number bond, groups) - shipped CR-133
- Semantic correctness + collocation typing + guard - shipped CR-135
