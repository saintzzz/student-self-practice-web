# CR-82: Content Integrity Pipeline + Luxury Redesign + Mechanics Expansion

Status: APPROVED (user directive 2025-.. — "thay đổi lại toàn bộ design UIUX... luxury nhất có thể... nội dung phải được validate, verify kỹ càng trước khi public")

## Driver

User-tested `đề nâng cao` and hit broken bank items (e.g. `My mom is working on ___` with
two valid weekday answers; explanation asserting "Chủ Nhật là ngày nghỉ" while the keyed
answer is arbitrary). User judged CR-81 redesign "không đủ wow" and wants mechanics breadth
learned from Lingokids / Khan Academy Kids / Monkey Junior / Duolingo ABC / ABC Kids.

Root cause of content defects: the remote `practice.qb_questions` bulk batch
(`*-bulk-*` ids, tens of thousands of rows) was machine-generated with
`review_status='approved'` but never semantically audited. Fetch RPCs exclude only
`rejected`/`draft` — every broken row is live.

## Workstream A — Content integrity (highest priority)

- **A1 Auto-flag sweep (SQL)** on `qb_questions`, English first:
  - F1 same `prompt_text` with different `answer->>'text'` (contradictory keys)
  - F2 cloze items whose distractor set contains ≥2 mutually-valid options
    (day-of-week, rooms, jobs, "usually/always" assumption items)
  - F3 mixed-category distractors (e.g. choices = day + `Holiday`/`Weekend`)
  - F4 malformed: answer index out of range, missing/duplicate choices,
    explanation_vi absent or not mentioning the keyed answer
  - F5 exact-duplicate rows (same prompt+answer, different id)
- **A2 Human-grade review pass** over flagged families (batched adjudication —
  fix key / rewrite distractors / quarantine). No item is fixed by editing only the
  explanation while the item remains ambiguous.
- **A3 Quarantine** confirmed-broken rows: `review_status='rejected'` (RPC already
  excludes it — verified against `fetch_questions`/`fetch_questions_public` source).
  Reversible, non-destructive; keeps the row for future repair.
- **A4 Repeatable gate:** `scripts/audit-qb.mjs` — pulls bank rows, runs the A1
  detectors, prints a report; exit non-zero on new violations so future bulk imports
  can be gated pre-publish.

## Workstream B — Luxury redesign (B for "beauty")

Goal: unmistakably premium kid product — rich illustrated world, soft-depth materials,
character presence, cohesive brand. Not another token pass; a real visual language.

- **B1 Scene upgrade:** land scenes become the hero — full-bleed illustrated
  backdrop (already-drawn SVG art) with parallax layers + ambient motion
  (drifting clouds, twinkling stars, swaying trees), grade-appropriate palette.
  The board floats over it as a "map/journey" surface, not a void with a peek.
- **B2 Materials:** tiles/cards get soft-3D depth (inner highlight + drop shadow +
  press-to-sink), rounded "chunky" radii, warm paper/exhibit surfaces for imagery.
- **B3 Typography:** display face for hero glyphs/numbers, Vietnamese-friendly
  body face; type scale hierarchy actually differentiated.
- **B4 Character system:** mascot companion with contextual poses/reactions across
  the flow (idle, thinking, celebrate, encourage) — one visible at a time.
- **B5 Exam surface:** formal but premium — clean IOE-style paper sheet, timer,
  progress, calm palette; distinct register from play surface by design.
- **B6 Brand:** navy/gold VieSchool kept; richer gradient ramps, no generic
  AI-purple/indigo scatter.

## Workstream C — Mechanics breadth (learned from competitors)

- **C1 Tracing** (from Duolingo ABC / ABC Kids): letter tracing canvas for G1-2
  writing items — deferred CR-80 scope now lands here.
- **C2 Drag expansion:** extend drag mechanics beyond pair-matching where the
  gesture fits the pedagogy (drag word into sentence gap, drag letters to spell)
  for G1-2; tap remains everywhere as fallback.
- **C3 Flashcard mode:** swipeable vocab flashcards (Monkey Junior pattern) as a
  new practice mode per grade.
- **C4 Exam flow polish:** progress ring, question navigator, review-before-submit
  pattern from real test prep products.
- **C5 Micro-interactions:** springy press, streak bursts, sound-consistent rewards.

## Constraints

- Keep: navy/gold brand, semantic tokens, touch floors (76/64/48), reduced-motion,
  testids/aria, feedback-sheet contract, one-mascot rule, band gating (G1-2 vs G3-5).
- Vietnamese copy: hyphen `-` only.
- No new heavy deps unless justified (tracing = canvas, no lib needed).

## Acceptance

- A: zero known-broken items served by RPC (verified by re-query + real exam run);
  audit script committed and documented.
- B: side-by-side screenshots (3 viewports × play + exam surfaces) show a
  materially new visual language; impeccable detector clean on new code.
- C: tracing + at least one new drag surface + flashcard mode verified end-to-end.
- Gates: tsc, full vitest, build, Playwright real-flow, external review loop to CLEAN.
