# PRD - Kids-UX Redesign + Parent Conversion (r2)

Status: r2 → BA lead review → HUMAN GATE.
Upstream: `docs/INTENT.md`, `discovery-kids-ux.md`, `plan-kids-ux.md`,
`research-kids-ux.md`, `research-parent-funnel.md`, `DESIGN_SYSTEM.md`.
r2 fixes: BA findings 1-15 (guest-capture mechanism, vi-VN TTS gap, OM-2
premise, missing scope items, privacy matrix, intentional-change list, AC
scoping/testability).

## Personas

- **Bé G1-2 (6-8yo, pre/early reader):** reads simple Vietnamese slowly;
  navigates by icons + voice; imprecise touch. Needs voice-first, ≤2 choices,
  76px targets, no-fail encouragement.
- **Bé G3-5 (9-11yo):** reads fine; wants progress + collection + light
  competition. Needs visible progress, free-choice area, denser UI OK.
- **Ba/mẹ (buyer):** mobile-first, arrives via school/parent groups; decides
  on progress visibility, IOE alignment, safety, price.
- **Guest kid:** 1 free round/grade today; trial funnel entry.

## Delivery shape (ruling needed at gate)

**Drop-1 (this run):** R1-R4, R7, R8 - kid surfaces + feedback/reward +
voice. **Drop-2 (this run if OM-5 approved, else CR-70):** R5, R6, R9 -
parent gate, enriched report, conversion surfaces. Both share BA+Design now.
Dev WPs (renumbered to avoid clash with Tester WP-20): Drop-1 = WP-14..18
(plan); Drop-2 = WP-19a parent-gate+report enrich (1.5), WP-19b email digest
sections (0.5), WP-19c conversion surfaces per OM-1/OM-2 rulings (2.0) -
+4 WP total. Buffered totals: Drop-1 only = 46 WP (unchanged);
Drop-1+Drop-2 = 46 + 4 + 20% on new WP ≈ **51 WP**.

## Requirements

### R1 - Voice-first instructions (band: G1-2 default, opt-in G3-5)

AC-1.1 Given any instruction/prompt on a kid surface, when it renders, then a
persistent speaker affordance is attached and tapping it plays the instruction.
AC-1.2 Given `speech.ts`, when a Vietnamese instruction is requested, then it
supports `lang='vi-VN'` via vi-VN browser voice selection (English content
keeps en-US + existing en asset files; no vi-VN asset generation this run -
AC-1.4 covers voice-absent degrade). New capability, closes BA-F2 gap.
AC-1.3 Given a question screen mounts on G1-2, when the instruction auto-plays
once, then the speaker pulses during playback; if autoplay is blocked, the
speaker shows a pulsing "tap to hear" cue instead (no silent failure).
AC-1.4 Given audio fails entirely, when a G1-2 kid proceeds, then every
instruction remains completable via icons/visual state (no dead end).

### R2 - StartBatchScreen restructure

AC-2.1 Given a G1-2 profile, when the screen renders, then first paint shows:
1 primary CTA "Chơi", mascot, speaker, back pill, and one "Khám phá" secondary
entry. CoachCard, PetCard (collectible home), quests, review, arena,
leaderboard, exam programs live inside the secondary sheet.
AC-2.2 Given a G3-5 profile, then ≤6 primary decisions at first paint
(measurement: count of visible interactive elements outside the secondary
sheet in the DOM); exam programs group under one "Thi & luyện đề" entry.
AC-2.3 Given the secondary sheet is open, tapping outside or close returns to
launchpad with no navigation away.
AC-2.4 Given a batch/round completes, when the summary shows, then an explicit
"Xong rồi / Chơi tiếp?" fork presents a natural stopping point - no automatic
chaining into the next round.

### R3 - Mascot + feedback personality

AC-3.1 Given correct/wrong/thinking events, when they fire, then mascot shows
exactly one of the approved state list {celebrate, encourage, think, idle};
no state may depict sadness/guilt (copy+asset scan enforces).
AC-3.2 Given a wrong answer **in practice/batch mode only** (exam mode keeps
IOE no-feedback fidelity), when feedback shows, then a gentle sound plays,
the correct option highlights after the attempt window, and retry or
hear-a-demo is offered before advancing.
AC-3.3 Given `prefers-reduced-motion`, celebrations render static states.

### R4 - Reward simplification + collectible home

AC-4.1 Given a batch with ≥1 answered question completes, when the summary
renders, then stars are the single primary kid-visible currency; points/XP
move to parent/secondary display.
AC-4.2 Given a reward milestone (sticker/badge unlock - existing trigger
points), when the summary shows, then a gift-box pick-1-of-3 places the
collectible in the pet/scene home.
AC-4.3 Given streak UI, copy uses forgiving framing ("học 3-4 buổi/tuần là
tuyệt rồi" register); no loss-threat copy (source scan enforces).
AC-4.4 Given a replayed batch/objective, rewards don't double-grant.

### R5 - Parent gate + enriched report

AC-5.1 Given the report pill or any pricing/email/external-link surface, when
tapped, then a parent gate (hold-3s OR arithmetic challenge, one pattern per
design) blocks until passed. No ungated purchase/external link on kid
surfaces.
AC-5.2 Given the gate passes on an authenticated account, when the report
opens, then it shows existing content PLUS: minutes/day (from
`results.time_used_sec` server data), mock-score trend (from `program`
results rows), and the existing weakest-first breakdown is capped at 3 skills
with a suggested next session. On guest accounts these server-sourced
sections show a "đăng nhập để xem đầy đủ" state.
AC-5.3 Given account A authenticated, when A requests B's report data via
client or RPC, then denied (denial test in WP-22).

### R6 - Trial→parent handoff

AC-6.1 Given a **logged-in** student finishes a round/exam, when the summary
shows, then a gated "Gửi kết quả cho ba mẹ" card offers parent email capture
via existing `request_parent_verify`/`confirm_parent_email`.
AC-6.2 (deferred → CR backlog) Guest-session parent email capture requires a
new anonymous-contact mechanism storing child-linked data - formal CR, not
in this run (BA-F1).
AC-6.3 Given captured parent email, weekly digest gains exam-readiness trend
+ weakest skills sections (extends existing worker).

### R7 - Exam-screen identity

AC-7.1 Given OM-3 ruling = C (hybrid), when exam renders, then exam
chrome/question layout keeps IOE fidelity while header carries mascot +
brand surface color, and results screen uses full brand celebration.

### R8 - Grade-band typography + targets

AC-8.1 Given G1-2 surfaces, prompt/reading text uses ≥18px-equivalent tokens;
if glyph audit finds Baloo 2/Be Vietnam Pro lack infant characters
(single-storey a/g), Andika is added for reading text only.
AC-8.2 Given kid surfaces, when measured via DOM box assertion in e2e: G1-2
ALL interactive targets ≥76px; G3-5 option tiles ≥76px, other controls ≥44px;
exam-hall interior controls ≥44px (IOE fidelity exception, recorded).
AC-8.3 Given any surface, copy uses sentence case, left-aligned; no all-caps
passages or justified text on reading surfaces.

### R9 - Parent conversion surfaces (Drop-2)

AC-9.1 Given OM-1 ruling, when the chosen mechanism ships, then a parent
reaches purchase intent in ≤2 steps (a step = one tap or one screen change)
after the gate: either (A) tư-vấn lead form with Zalo/hotline, or (B)
pricing card + VietQR/transfer instructions. Prices shown ONLY from
`docs/sales/01-pricing.md` (CR-60 single source of truth, "KHÔNG bịa số");
post-payment flow is manual reconciliation per CR-60 §3 - the pricing card
states activation method honestly, no fake instant-unlock.
AC-9.2 Given a milestone (batch complete, mock exam, sticker), when the
summary or report shows, then a "Chia sẻ thành tích" card offers a branded
achievement image for Facebook/Zalo (generated client-side, no PII beyond
first name + grade).
AC-9.3 Given the landing question from INTENT, a public landing route is
**deferred to CR-70** - the conversion entry this run is the in-app gated
parent flow; marketing landing needs its own content/legal review.
(Deferral recorded in `cr-backlog.md` CR-70.)

### R10 - Explicit deferrals (recorded in `cr-backlog.md` CR-70)

- Public marketing landing (AC-9.3 above).
- Parent magic-link remote view (OM-2C).
- Guest-session parent email capture (AC-6.2).
- Auth/onboarding redesign: parent-vs-kid split, signup, PIN recovery
  (plan scope item 4 - deferred; current PIN login + guest stay).
- Real payment gateway (OM-1C).

## Intentional behavior changes (release-contract list, plan §contract)

| # | Change | AC ref |
|---|---|---|
| 1 | Wrong answer in batch mode: gentle sound + highlight + retry/demo before advance (was: buzzer + advance) | AC-3.2 |
| 2 | Kid surfaces show stars as primary; points/XP move to parent view | AC-4.1 |
| 3 | Report pill now passes parent gate before opening | AC-5.1 |
| 4 | Replayed objectives don't re-grant rewards | AC-4.4 |
| 5 | Guest "1 free round" unchanged; post-round parent card added (logged-in only) | AC-6.1 |
| 6 | Instructions auto-play once on G1-2 screens | AC-1.3 |
| 7 | Exam header gains mascot/brand; interior layout unchanged | AC-7.1 |
| 8 | StartBatchScreen: CoachCard/PetCard/quests/arena/leaderboard move behind "Khám phá" sheet (existing e2e selectors updated) | AC-2.1/2.2 |
| 9 | Gift-box pick-1-of-3 reward moment added at unlock milestones | AC-4.2 |
| 10 | Streak copy rewritten to forgiving framing | AC-4.3 |
| 11 | Authenticated report data source: local store -> server `results`/`engagement_state` | AC-5.2 |
| 12 | Possible Andika font addition for reading text | AC-8.1 |
| 13 | Weekly digest gains exam-readiness + weakest-skill sections | AC-6.3 |
| 14 | Batch end gains "Xong rồi / Chơi tiếp?" fork | AC-2.4 |

## Privacy matrix (WP-6 deliverable)

| Data | Kid surface | Parent (owner, gated) | Parent (other acct) | Guest | Public |
|---|---|---|---|---|---|
| Own progress/stars | read | read | denied (AC-5.3) | local-only | never |
| Parent email | write via gate | read own | denied | n/a (deferred) | never |
| Report (minutes, mock trend) | n/a | read own child | denied | teaser only | never |
| Achievement share image | gated | generate+share | n/a | n/a | no PII beyond first name+grade |
| Analytics/funnel events | step events only; forbidden identifiers: user_id, display name, email, device-bound id; grade-level aggregate permitted | - | - | - | aggregate only |
| Parent token/magic-link | none issued this run; any issuance = CR-70 + authz review | | | | |
| New PII fields | **0 permitted** - any exception = formal CR | | | | |

## Options matrices

### OM-1: Purchase path → **recommend B** (pricing card + manual VietQR/transfer + Zalo lead)
A=lead-capture only; C=real gateway (deferred, compliance weight).

### OM-2: Parent remote access → **recommend A+enriched** for this run
Correction (BA-F3): server engagement sync EXISTS for logged-in users
(`engagement_state`, CR-45); the "local-only" warning applies to guests only.
A=keep in-app gated report + enriched email (cheap, ships now).
C=parent magic-link remote view - still valuable, still needs parent-token
authz work → CR-70.

### OM-3: Exam identity → **recommend C** hybrid (see AC-7.1).

### OM-4: Mascot/art → **recommend C** AI-generated isolated asset module
(constitution-compliant: owned, license recorded).

### OM-5: Scope → **recommend B** two drops, both designed now; Drop-2 ships
this run only if OM-1/OM-2 picks stay light (B+A) and human approves the
extended estimate (+4 WP, breakdown in Delivery shape → ~51 WP total).

## Open questions for human gate

1. OM-1 purchase path (B recommended).
2. OM-2 remote access (A recommended; C → CR-70).
3. OM-5 scope split (B recommended).
4. Mascot continuity: pig stays, becomes illustrated character?

## Rulings (human gate, 2026-02-16)

- OM-1 = **B**: pricing card từ `docs/sales/01-pricing.md` (249k/6mo,
  399k/năm, founding 299k) + VietQR/chuyển khoản manual + Zalo lead. No gateway.
- OM-2 = **A**: enrich in-app gated report + email digest; magic-link remote
  view -> CR-70.
- OM-3 = **C**: exam hybrid - IOE layout preserved, mascot + brand header/
  results.
- OM-4 = **C**: pig stays, becomes authored illustration/Lottie set in an
  isolated asset module.
- OM-5 = **B**: both drops ship in this run (~51 WP total).
