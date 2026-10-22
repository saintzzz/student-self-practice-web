# CR-104 - Bank integrity + quality wave (position-leak fix, prompt repair, a11y floor, budget re-base)

PO-driven quality wave. Every item traces to a measured defect or a
recorded debt - no speculative work.

## Audit findings (remote probes, 2026-10-22)

### A. Answer-position leak - REAL, fix in this CR

Correct-answer index distribution over practice-eligible MCQ rows:

| Grade | idx 0 | idx 1 | idx 2 | idx 3 |
|---|---|---|---|---|
| 1 | 30.2% | 26.0% | 22.9% | 20.9% |
| 2 | **39.3%** | 24.5% | 20.3% | 15.9% |
| 3 | **35.3%** | 25.8% | 22.2% | 16.6% |
| 4 | **35.3%** | 25.5% | 22.1% | 17.1% |
| 5 | 29.6% | 25.2% | 21.8% | 23.4% |

Expected uniform = 25%. Position 0 is over-represented by up to +14 pts -
a kid who always picks the first option scores ~35-39% instead of ~25%.
`toExamQuestion` maps `choices` 1:1 into `options` with NO display
shuffle, so the stored bias reaches the screen verbatim.

**Fix (client-side, no migration).** Bank MCQ options get a
deterministic-per-row display permutation at map time
(`seededShuffleIndices(4, row.id + '-opts')` - the same PRNG helper the
reorder scramble uses):

- `BankScored` gains `bankOptionOrder?: readonly number[]`
  (display index -> original bank index).
- `toExamQuestion` permutes `options` + `optionImages`; keyed rows remap
  `correctIndex` to the display position of the original index.
- `examAnswerToWire` maps the picked DISPLAY index back to the ORIGINAL
  index before sending to `score_bank_attempts` - the oracle keeps
  grading against stored order, protocol unchanged.
- `hydrateBankQuestion` translates the disclosed `correct_answer.index`
  (original space) to the display position for the correct-highlight.
- Games are unaffected (they build options from the vocab content bank,
  not qb rows). Local-generator questions already shuffle.

Deterministic per-id (not Math.random) so tests stay stable and a
remount never reshuffles under the kid's finger.

### B. Malformed `___ do/does` prompts - REAL, fix in this CR

155 english rows carry a generation artifact: `They ___ do/does
homework after school.` - the subject-verb alternation leaked into the
prompt where an adverb-of-frequency answer goes. Subjects observed:
He/She/Nam/Lan (3rd-person singular) vs They/We/I/My friends.

**Fix (data repair).** `___ do/does` -> `___ does` when the subject is
3rd-person singular (He|She|It|<single capitalized proper name>),
else `___ do`. The sentence then reads correctly under every accepted
adverb. Applied via data migration `0050_dodoes_prompt_repair.sql`.
`a/an` patterns in other rows are a legitimate ESL convention - not
touched.

### C. G5 approval/exam-eligibility gap - CONFIRMED, pipeline-bound

Practice-eligible volume is healthy at every grade (~5.6-7.4k) but the
exam-eligible pool collapses at G5 (~560 total; true-false and
word-to-image both 0 despite ~1000/~380 practice-eligible rows). The
blocker is human approval (`requiresHumanApprovalForExam`) - not
fixable by flipping flags, it is gen+review pipeline work on the
content workstation. Recorded as the standing G5 gap; this CR ships
the audit queries in `docs/sdlc/CR-104-bank-integrity-and-quality-wave.md`
so the next gap check is one command.

### D. Bundle budget drift - gate hygiene

`check-bundle-budget` delta gate is red: CSS +6.52 kB vs +4 cap
(accumulated CR-83..CR-103 feature CSS). JS went the other way:
129.27 kB gzip, -95.28 under the cr82 anchor thanks to CR-103 lazy
split. Per the file's own convention every major wave re-bases the
anchor with justification - re-anchor to the post-CR-103 build and create
`.perf-budgets.json` so `check-perf.mjs` becomes a real local gate.

### E. A11y floor - missing gate

Tester conventions require a runtime a11y scan per route; none exists.
Add `@axe-core/playwright` + `e2e/a11y.spec.ts` over the kid-facing
routes (grade pick, hub, batch question, game shelf, exam) and fix
what it finds. Known debt on the list already: `batch-end-early` is
44 px, below the 48 px kid floor (MEMORY).

**Shipped.** axe-core WCAG 2 A/AA scan over 5 surfaces
(`e2e/a11y.spec.ts`, serious+ fails the run). First pass caught three
real defects, all fixed and now green 5/5:

- `batch-end-early` white on `bg-sky-600` = 4.09:1 (< 4.5 AA)
  -> `bg-sky-700`.
- Word-order placeholder `text-slate-500` on `bg-slate-100` = 4.34:1
  -> `text-slate-600`.
- `game-card-coming-soon` aria-label shorter than its visible text
  (WCAG 2.5.3 label-in-name) -> label removed; content is the name.

### F. Combo streak meter (gameplay depth)

Backlog "combo meter" item, shipped cheap via the shared game-HUD
module: `useCombo` + `ComboMeter` in `src/games/lives.tsx`, wired into
all 15 Game Zone titles at their existing `gameVerdictSfx` verdict
points (`hit()` on correct, `miss()` on wrong). Streak >= 2 renders a
flame chip that re-pops per increment (`combo-pop` keyframe, inside
the reduced-motion gate); streak >= 3 adds the existing `streak` sfx.
Purely celebratory - no hearts, points, or content gating - so a
broken chain reads "start a new streak", consistent with the CR-100
hearts-are-chances model.

## Out of scope (deliberate)

- M3 "Teach me" pre-answer lessons - needs authored per-skill content;
  tracked in backlog, not this wave.
- G5 content generation - iMac pipeline, not this machine.
- Botnet-grade fetch defense (Turnstile) - needs Cloudflare account.
- Per-user adaptive difficulty - bank rows carry `difficulty` and
  `learning_events` tracks outcomes; a ZPD-biased `fetch_questions`
  variant is the designed next step, deferred to its own CR.

## Verification

- `npx tsc -b` clean.
- `src/lib/qb/bank.test.ts` rewritten to order-invariant assertions
  (option-set membership, correctness follows display index, image
  alignment, keyless pending until server verdict) + a dedicated
  shuffle describe with a full-distribution check (every original
  index x every display position, 400 draws each); 37/37 pass.
- `src/components/ExamScreen.realBank.test.tsx` locates the rendered
  image by its src - no fixed display-position assumption.
- `src/games/lives.test.tsx` +2 (combo chain/break, meter visibility);
  `QuizShow.test.tsx` +1 (timeout breaks combo regression).
- `src/games/` suite green with combo wired into all 15 titles.
- `e2e/a11y.spec.ts` 5/5 green on real pages post-fixes.
- `e2e/responsive-layout-phone.spec.ts` 3/3 (landscape fold fix via
  `[@media(max-height:420px)]:h-14` tiles).
- Migration `0050_dodoes_prompt_repair.sql` dry-run printed per-subject
  transforms (He/She/It/Nam/Lan -> `does`; They/We/I/My friends -> `do`)
  on remote samples before apply.
- Full suite: 207 files / 1748 tests. Build + bundle-budget gate green.
- External review r102: round 1 gemini garble (not confirmed, evidence
  recorded); round 2 reviewer-gpt found 3 real issues - shuffle bias
  (major, mulberry32 fix), combo contrast (minor), QuizShow timeout
  chain (minor) - all fixed and regression-tested. APPROVE.
- Preflight: secrets scan clean, `npm audit --omit=dev --audit-level=high`
  0 vulns, check-rtm / code:reliability / repo-laws / spec / uiux all
  pass (pre-existing warnings only).
