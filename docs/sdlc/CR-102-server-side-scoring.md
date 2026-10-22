# CR-102 - Server-side scoring (the real moat)

## Driver

CR-101 rate-limited the fetch RPCs, but the payload still carried
`answer` + `explanation_vi` - a scraper just needed more hours, not a
different plan. This CR removes the key material from the wire entirely:
verdicts are computed in Postgres and the only disclosure is per-attempt
post-answer (which the review sheet needs pedagogically anyway).

## Shipped

| Piece | What changed |
|---|---|
| **Answer strip** | `practice.strip_bank_row` drops `answer`+`explanation_vi` from every fetch surface: `fetch_questions`, `fetch_questions_public` (wrappers re-created, same 0044 budgets), `fetch_form`, `assignment_form` (renamed to `__impl`, revoked, re-wrapped with 60 calls/hr per-uid caps). |
| **Scoring oracle** | `practice.score_bank_attempts(attempts jsonb)` - computes verdicts server-side for mcq/visual/true-false/text-answer/reorder rows; returns `{question_id, correct, correct_answer, correct_answer_text, explanation_vi}` per attempt. Caps: authenticated 800 attempts + 200 calls/hr per uid; guest global 2000 attempts + 400 calls/hr. **Honest extraction economics (r99):** pedagogically the review sheet must disclose the answer post-attempt, so any typed probe buys one key per oracle call - the binding defense is the rate cap (guest drain of 29k keys ~15h saturated, ~36h per uid), not guess complexity. The 0048 tightening removes the trivial `{}` probe from the richer leak: structured `correct_answer` (accepted variants, index values) is only returned for type-appropriate responses; skipped attempts still get `correct_answer_text` + `explanation_vi` for the review sheet. |
| **Client hydration** | `bank.ts`: `toExamQuestion` dual-mode - keyless rows map to pending questions (`bankId` + placeholder answer fields); hydrated rows (tests/dev/reorder) map as before. `scoreBankAttempts` + `hydrateBankQuestion` + `resolveBankVerdicts` write the real key fields + explanation back post-attempt so review rendering is unchanged. |
| **Scoring branches** | `isExamAnswerCorrect` returns `bankVerdict` for bank questions (unresolved = fail-closed false); `examCorrectAnswerText` returns '' until hydrated. `unbankQuestion` strips the marker before wrong-answer storage so review replays score locally. |
| **ExamScreen** | practice: async verdict per answer (`verdictPendingRef` guards double-tap; failures surface the retry chip, no silent dead state); exam mode: fire-and-forget resolution, credit on arrival; a CHANGED answer invalidates the old verdict and rescores (`sameExamAnswer` + revision-guarded `patchExamQuestion` so stale resolutions never apply); `finishExam()` resolves all pending verdicts before `finishedAtMs` stamps + freezes input during the resolve window - a failed resolve keeps the sitting open with a retry chip (honest scoring, never silently fail-closed). Telemetry `record()` accepts the resolved verdict. |
| **Reorder exception** | `reorder` rows KEEP `answer` on the wire: `isWordOrderCorrect` (adjunct fronting, inversion, conjunct swap - 300+ lines) cannot be re-implemented in SQL, and a reorder "key" is a sentence, not a choice index. Documented, intentional. |
| **ACL fix (0047)** | Same r98 bug class: 0046's new functions kept default PUBLIC EXECUTE - revoked to named roles; `fetch_form` keeps `anon` (guest mock), `assignment_form` authenticated-only, oracle anon+authenticated. |
| **Oracle hardening (0048)** | r99 findings fixed: (a) multi-`accepted` text-answer rows errored the whole batch (scalar subquery in IN list -> EXISTS); (b) TF index-only keys scored inverted (missing `answer->>'text'` yielded non-null false -> index fallback unreachable); (c) NULL verdicts leaked via `v_typed AND NULL` (comparisons now `IS TRUE` + coalesce). |

## Verified on remote

- `fetch_questions_public` output keys no longer contain `answer`/`explanation_vi`.
- Oracle: correct index -> `{correct:true, correct_answer_text, explanation_vi}`; wrong -> false; unknown id -> graceful false/null.
- proacl verified post-0047: impls postgres-only, helpers postgres-only, wrappers named-roles-only.
- `qb_questions` RLS unchanged: authenticated SELECT via admin policy only (`ReviewQueueCard` is an admin tool).

## Deferred

- Turnstile/signed practice sessions - requires a Cloudflare account
  (external signup; cannot self-provision). The oracle+rate-limit layer
  stays the defense until it exists.
- `src/data/vocabulary` lazy-split (501K in index chunk) - core content
  graph consumed synchronously by ~15 modules; needs its own CR.

## Acceptance status

- tsc + build green; bank/exam/telemetry suites green incl. CR-102
  tests (pending mapping, hydration, unresolved-only resolve, reorder
  key kept, skipped-attempt display text, TF index-only hydration,
  `sameExamAnswer`).
- External review r99 (reviewer-gpt): REJECT -> all 5 findings
  addressed (disclosure tightening + 2 oracle SQL bugs + answer-change
  revision guard + practice catch). Re-verified on remote: typed
  correct->true, typed wrong->false+blob, `{}`->false+text only.
