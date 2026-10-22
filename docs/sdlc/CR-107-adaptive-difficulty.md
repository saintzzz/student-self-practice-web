# CR-107 - Adaptive difficulty fetch (status: pending approval)

Deferred out of CR-104. Data is already in place: `qb_questions`
carries `difficulty` and `learning_events` records per-account
outcomes. The missing piece is a fetch variant that biases selection
toward the learner's zone of proximal development instead of uniform
random.

## Design sketch (from MEMORY, expanded)

- New RPC `fetch_questions_adaptive(p_grade, p_subject, p_count,
  p_skill?, p_mode?)` alongside `fetch_questions` - same hardening
  (rate limits, strip_bank_row, canonical + eligibility filters,
  variant_group dedup).
- Difficulty model, v0 deliberately simple:
  - Account skill proficiency = rolling correct-rate per skill from
    `learning_events` (e.g. last 30 outcomes; cold-start = grade
    baseline difficulty 2).
  - Pick target difficulty = clamp(proficiency-mapped level +- 1);
    sample ~70% in-band, ~30% adjacent bands. ZPD = "hard enough to
    stretch, easy enough to succeed".
- No model training, no embeddings - deterministic SQL + seeded
  ordering so forms stay reproducible per seed where needed.

## Impact assessment

- DB: new RPC + read path over `learning_events` (index on
  (account_id, skill, created_at) - check existing; add if missing).
  No schema break; `fetch_questions` untouched (practice/exam paths
  unchanged).
- Client: opt-in surface (practice rounds first; mock exams keep the
  fixed-form pool - fairness).
- Anti-scrape unchanged: same strip + caps apply.

## Open questions for BA

- Does adaptive mode count for mock-exam fairness? (Recommend: no -
  exams stay uniform-random over the approved pool.)
- Minimum history before adaptation kicks in (recommend >=10 outcomes
  per skill, else baseline).
- Teacher-visible? (assignments could request adaptive vs fixed.)
