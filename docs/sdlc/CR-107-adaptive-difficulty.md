# CR-107 - Adaptive difficulty fetch (status: IMPLEMENTED + live-verified)

Deferred out of CR-104. Bank rows carry `difficulty` (smallint 1-5) and
per-learner outcomes live in `practice.qb_attempt_events`
(learner_id, question_id, is_correct, mode, answered_at).

## Measured inputs (2026-10-22, service-role probes)

- `qb_questions.difficulty` distribution: d2=60,872 | d3=20,582 |
  d4=6,886 | d5=1,835 | d1~0 | null=0. Low-skewed: adaptive targeting
  above d3 thins fast - the design must degrade to "best available",
  never starve a form.
- `qb_attempt_events`: ~1.1k rows total - cold-start (<10 outcomes per
  skill) is the common case for months. Baseline path is first-class,
  not an edge case.
- `fetch_questions` wrapper (0049): service_role bypass -> per-IP caps
  -> per-uid caps -> `strip_bank_row(fetch_questions__impl(...))`.
  The adaptive RPC clones this shape exactly.

## BA - acceptance criteria

- AC-107.1: `fetch_questions_adaptive(p_grade, p_subject, p_count,
  p_skills?, p_mode?)` returns strip_bank_row'd rows - same keyless
  contract as `fetch_questions` (the moat is not negotiable).
- AC-107.2: per-skill proficiency = rolling correct-rate over the
  learner's last 30 `qb_attempt_events` for that skill (joined via
  question_id); <10 outcomes -> baseline target difficulty 3.
- AC-107.3: ZPD mapping around the baseline band 3 - rate <0.5 eases
  to 2, 0.5-0.85 consolidates at 3, >=0.85 stretches to 4 (d5 supply is
  too thin to target: 1.8k rows vs 20k at d3). Rows are preferred
  in-band but a thin band falls back to nearest available difficulty -
  count is never under-filled while eligible rows exist.
- AC-107.4: same rate-limit stack as `fetch_questions` (IP + uid,
  weighted by rows). Authenticated only - guests get the uniform
  `fetch_questions_public` (no learner history to adapt on).
- AC-107.5: mock/assignment pools unchanged - uniform random over the
  approved exam pool (fairness ruling: exams do not adapt).
- AC-107.6: deterministic per (learner, seed-ish call): two calls with
  identical history return the same ordering shape (band order
  stable); within-band order may be random.
- AC-107.7: `p_mode` passes through to the impl's mode filter
  (practice/mock gating stays identical to fetch_questions).

## Tech Lead - design

- New `practice.fetch_questions_adaptive__impl` (revoked) + thin
  public wrapper `fetch_questions_adaptive` cloning 0049 caps.
- CTE `prof`: per-skill correct-rate from the caller's last 30 events
  (`answered_at desc`, `mode='practice'` outcomes only? DECISION:
  all modes count - a mock wrong answer is still signal).
- CTE `target`: per-skill target difficulty via the AC-107.3 map.
- Selection: `order by (abs(q.difficulty - coalesce(t.target,3)) > 1)
  desc-false-first, abs(...), random()` - in-band first, then nearest,
  random within. No hard 70/30 quota (adds a second query for a
  guarantee a thin bank can't honor anyway).
- variant_group dedup identical to the impl's existing distinct-on.
- Index: `qb_attempt_events(learner_id, answered_at desc)` already
  exists (0017) - no new index needed for last-30 lookups; a
  (learner_id, question_id) lookup is covered by the question index
  only if needed - measure, don't pre-add.

## Client surface (dev phase) - landed

- `fetchBankQuestions` routes authenticated `mode='practice'` calls to
  `fetch_questions_adaptive` first; a missing-RPC or non-rate-limit
  error falls back to `fetch_questions` (cold envs stay functional).
  PT429 surfaces - adaptive and standard budgets are separate buckets
  and falling back on a 429 would let a learner double-dip.
- Guests + mock + arena keep current paths (AC-107.4/5).

## Verification (2026-10-22)

- Migration `0051_fetch_questions_adaptive.sql` remote-applied via MCP.
- Live smoke (service context): 10 rows, 0 `answer`/`explanation_vi`/
  `zpd_target` keys, all d3 under cold-start baseline (correct).
- Anon REST call: 401 `permission denied` (authenticated-only holds).
- `tests/adaptive-fetch.selftest.mjs` covers the migration contract;
  `bank.test.ts` covers the client seam (AC ids referenced per test).

## Out of scope

- Cross-skill transfer (a reading win boosting listening) - no evidence.
- Latency-weighted difficulty (speed as signal) - v2.
- Embeddings/IRT models - disproportionate for the data volume.
