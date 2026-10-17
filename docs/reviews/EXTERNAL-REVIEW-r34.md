# External Review - Round 34 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: CR-82 uncommitted working tree,
HEAD=66d1d33. The full diff (1.35 MB) exceeded the codex 1 MB input cap, so the
same `scripts/external-review.mjs` prompt was fed to `codex exec` in two parts:
part A = src/components + hooks + data + types + App/index.css; part B = src/lib +
e2e + scripts + config. New files were included via `git add -N` (intent-to-add,
cleared after the diff was captured - no commits created).

## Part A output (components/hooks/types)

1. [major] src/components/LiveScore.tsx:37 - Target registration runs while `answered === 0`, when `chipRef.current` is null; it never reruns when the chip appears. Star flights and reduced-motion highlights therefore fail during normal play - register through a callback ref or rerun when the chip mounts.

2. [major] src/components/mascot/MascotLottie.tsx:54 - Animation loading depends on `playerRef.current` already existing, but the player callback can arrive asynchronously after WASM initialization. No `data` prop or callback-side `load()` then initializes it, leaving the mascot permanently static - load the latest animation when the player becomes available as well as when data changes.

3. [major] src/components/tracing/LetterTracingQuestion.tsx:195 - Auto-step sets `assisted` asynchronously, then finishes using the previous render's value. Completing a single-stroke letter through auto-step submits `assisted: false`, incorrectly counting assisted work as mastery - pass assistance explicitly into completion or maintain a synchronous ref.

4. [major] src/components/tracing/LetterTracingQuestion.tsx:112 - The delayed completion submission is never cancelled. Pressing "Tô lại" during the 400ms glow still submits the previous trace; leaving the question can also deliver a stale answer - retain and cancel the timer on reset/unmount, and reset the completion guard.

5. [minor] src/components/QuestionCard.tsx:382 - The parent subscribes in a passive effect after child `InstructionSpeaker` effects have already emitted immediate `not-played` settlement. On skipped/no-key mounts, the idle clock can remain null indefinitely - use a scoped callback, buffered settlement state, or subscribe before child passive effects.

6. [minor] src/components/InstructionSpeaker.tsx:112 - `lastInstruction` updates only when autoplay dispatches. Later questions sharing the round's already-played key retain an earlier question's instruction, so thinking-mode replay can speak instructions for the wrong exercise - track the current mounted question's instruction independently of autoplay eligibility.

7. [minor] src/hooks/useDemoHint.ts:44 - Rearming only clears persistence; it never updates the mounted hint's `showDemo` state. Thinking mode therefore cannot replay the current question's dismissed demonstration - notify mounted consumers or expose an explicit replay trigger.

## Part B output (lib/e2e/scripts/config)

1. [severity major] scripts/qb-ambiguity-lib.mjs:253 - Keyword matches approve incorrect or ambiguous keys without proving uniqueness: "The day after Monday is ___" accepts keyed "Friday" through the generic sequence rule. Translation/spelling rules also return true unconditionally - validate the expected answer and all competing choices; send unsupported cases to manual review.

2. [severity major] src/lib/mascot/lottieFromPoses.ts:212 - Flattening every shape's geometry, fill, stroke and transform into one Lottie group lets paint operators affect preceding paths. Distinct skin, outline and highlight paints cannot reliably match the SVG - wrap each painted shape in its own `gr`; verify rendered frame parity.

3. [severity major] src/lib/flashcards/reviewStore.ts:104 - A successful save following a failed write discards earlier session ratings: it reads only stored entries, then deletes the entire fallback map - merge fallback entries before persisting and apply the cap to both persistence and memory.

4. [severity major] scripts/audit-qb.mjs:52 - `j()` JSON-parses every string, so a legitimate primitive answer such as `"cat"` throws and aborts the audit. `{ boolean: false }` answers also resolve to empty text and evade answer validation - decode according to the column schema and explicitly validate boolean/index/text answer variants.

5. [severity major] scripts/qb-quarantine-apply.mjs:55 - Already-rejected rows are skipped even when eligibility flags remain true, leaving the policy leak this gate promises to repair. Failed PATCH requests also finish with exit code 0 - repair eligibility independently of review status and exit nonzero on failures.

6. [severity minor] e2e/cr82-spell-gap.spec.ts:85 - Three random batches cannot guarantee a bank item. At the stated one-third coverage, twelve independent draws still miss roughly 0.77% of runs - use a fixed seed known to produce a bank and retain random coverage as a separate sweep.

## Triage (developer)

- A1 FIXED - LiveScore registers via a callback ref (`setChipRef`), which fires
  when the chip element mounts/unmounts instead of once at component mount.
  Regression test: "registers the chip when it mounts late" in RewardFx.test.
- A2 FIXED - `MascotLottie.handleRef` now loads `animationDataRef.current` when
  the player materialises after the apply-effect early-returned (latest
  data/pose mirrored through refs). Same-commit same-data reload is a harmless
  restart.
- A3 FIXED - `advanceFrom`/`finishLetter` accept `opts.assisted`; both assisted
  call sites (auto-step, fail>=3 auto-draw) pass the flag synchronously.
  Regression test: single-stroke 'o' auto-step submits `assisted: true`.
- A4 FIXED - the glow submit timer lives in `submitTimerRef`, cancelled by
  "Tô lại" (which also clears `submittedRef`/`glow`) and on unmount.
  Regression test: reset inside the glow window -> onSubmit never fires.
- A5 FIXED - `InstructionSpeaker` buffers the last settle
  (`lastInstructionSettle()`); QuestionCard captures its render epoch and
  replays a settle that happened during its own mount (before the subscription
  effect ran). Stale settles from previous questions are ignored by epoch.
- A6 FIXED - `lastInstruction` is claimed at mount regardless of autoplay
  eligibility (speakerKey is round-level, so later questions' keys are usually
  already played).
- A7 FIXED - `rearmDemoHint` notifies a module listener set; mounted
  `useDemoHint` consumers of the rearmed kind flip `showDemo` back to true.
- B1 FIXED (sequence rules) - day/month keys must now survive the precise
  arithmetic rules (the generic accepts no longer preempt them); non-day/month
  generic accepts require the answer to be the single sequence member among
  choices. DEFERRED (translation/spelling unconditional accepts) - by design:
  the classifier detects self-answerable prompts; semantic key-vs-translation
  correctness needs a dictionary and belongs to a different validator. Noted
  for the next audit CR.
- B2 FIXED - `groupToLayer` emits one `gr` per painted shape; `npm run
  assets:mascot` regenerated all 6 pose JSONs (check-mascot-assets OK).
- B3 FIXED - `saveFlashRating` merges the session spill into the persisted set
  before writing and caps the spill at 200. Regression test added.
- B4 FIXED - `j()` tolerates non-JSON strings (returns raw); `{boolean}`
  answers resolve to 'true'/'false' for validation.
- B5 FIXED - already-rejected rows with dirty eligibility flags are PATCHed
  (counted as `repaired`); the script exits nonzero when any row fails.
- B6 FIXED - dev-only `window.__batchSeedForTesting` (App.tsx) pins the batch
  seed; cr82-spell-gap uses GAP_BANK_SEED='e2e-seed-0' (verified offline:
  bank item at question 0). Random coverage retained via the within-round
  scan; regen instructions in the spec header.

Loop status: round 34 findings all triaged (11 fixed, 1 partially fixed +
documented deferral, 0 not-confirmed). A clean re-round on the remaining diff
delta is recorded below when run.

## Follow-up rounds (r35-r38) - delta re-reviews via codex exec

- r35 (focused delta of all 13 fix files): 1 remaining - sequence rule still
  accepted a unique-member wrong key ("Monday, Tuesday, ___" keyed 'Friday').
- r36 (revised seqExpected): 2 edge cases - repeated members ignored; noncyclic
  orders wrapped. Fixed: collect every occurrence; wrap only day/month.
- r37 (revised): 1 edge case - post-blank members ignored, so contradictory
  runs passed. Fixed: post-blank members must continue the run exactly.
- r38 (final): **CLEAN**.

Final state of seqExpected: positional sequence-completion proof - named
members (all occurrences) must form a consecutive ascending run (modulo for
cyclic sets) before the blank, the key must equal the next member, and any
members after the blank must continue the run. 16-case manual matrix green;
real-data audit output unchanged (28 pending-quarantine, DB-side state).
