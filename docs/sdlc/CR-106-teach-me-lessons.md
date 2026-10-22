# CR-106 - "Teach me" pre-answer lessons (status: pending approval)

Deferred out of CR-104 (M3 idea). Student taps "Dạy tôi" before
answering a bank question; a short per-skill lesson explains the
concept, then the question is answered UNGRADED (it is disclosed).

## The moat constraint (why this is a CR, not a flag)

CR-102's scoring moat grades only via `score_bank_attempts` - the oracle
holds the key. A taught question must NEVER submit a scored attempt for
that row again, or teaching becomes a score-laundering surface (teach ->
see key -> score). Design must therefore be disclosure-aware:

- `teach_bank_question(p_question_id)` RPC (new, rate-limited like
  fetch): returns the row's `explanation_vi` + lesson payload AND marks
  `(account_id, question_id)` as taught in a new `taught_marks` table
  (or a flag on `learning_events`).
- `score_bank_attempts` rejects (or grades-as-taught/no-score) any
  attempt on a taught row for that account.
- `fetch_questions` variants should prefer NOT re-serving taught rows
  for grading contexts; they may still appear in review decks where
  disclosure is free.

## Content dependency (the real cost)

`explanation_vi` exists on canonical rows but is a post-hoc rationale,
not a teaching script. Per-skill lesson content (G1-G5 x ~skill
taxonomy) is authoring work - either human-authored snippets keyed by
`skill`, or an LLM generation wave with the existing review/quarantine
pipeline. Scope decision needed: skill-level generic lessons (cheap,
~30-60 items) vs per-question lessons (expensive, thousands).

## Open questions for BA

- Which grades first? (Suggest G1-2 where "teach me" has highest value
  and content is smallest.)
- Does a taught question still count toward daily-quest/progress
  counters? (Recommend: counts as attempted-not-scored.)
- Lesson UI surface: QuestionCard popover vs full-screen interstitial.
