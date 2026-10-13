# Implementation Plan - Kids-UX (WP-14..19c)

Upstream: prd-kids-ux.md (ACs+rulings), design-kids-ux.md (specs+tokens),
adr-kids-ux.md (KUX-1..13, fitness functions, rollback).
Convention: committed before/with first code commit; departures update this file.

## Order of work

| Step | Package | Files (planned) | Proof |
|---|---|---|---|
| 1 | R0 forward-compat sync | `src/lib/engagement/sync.ts` (sanitizeRemote/mergeEngagement preserve homeItems/giftGrants/grantedObjectives/schemaVersion) + tests | unit: merge preserves unknown-new fields; deploys to prod BEFORE Drop-1 |
| 2 | Foundation | `src/lib/ui/tokens.ts` (new tokens per design §4.1: CTA_GOLD_XL, SHEET, TRAIL_TILE, GIFT_BOX, OPTION_PICKED_WRONG, OPTION_REVEAL_CORRECT, DISCLOSURE_BTN, END_SESSION fix, BTN_DRILL/EXAM/ADVANCED, PAPER_*, GATE_KEY, BTN_PAPER_SECONDARY, EXAM_HEADER_BRAND); `src/lib/ui/theme.ts` bandForGrade; `src/lib/viewer/ViewerContext.tsx` | tsc + token pairing guard green |
| 3 | Speech | `src/lib/speech.ts` speakInstruction(lang vi-VN voice pick, skip mp3 lookup for vi, status events ended/blocked/unavailable, autoplay-guard), tests | unit: vi voice select, statuses, en path unchanged |
| 4 | Store | `engagement/store.ts` homeItems/giftGrants/grantedObjectives, grantHomeItem, objectiveId params on record*Result, alreadyGranted path; `src/data/homeItems.ts` pool (24 items, vi names) | unit: no double-grant, replay same item |
| 5 | Shared components | `InstructionSpeaker.tsx` (persistent speaker, pulse sync, blocked cue), `ParentGate.tsx` (arithmetic gate + in-memory 5min token + clear-on-leave), `GatedLink.tsx` (allowed-origins), modal-behavior hook extracted from ConfirmEndDialog (props/DOM unchanged) | unit: gate pass/fail, token TTL, focus trap reuse |
| 6 | Mascot system | `public/mascot/svg/pig-{idle,celebrate,encourage,think}.svg` (authored, owned-generated, attribution.json entries), `Mascot.tsx` state prop mapping, EmojiVisual fallback preserved | visual verify + attribution check exit 0 |
| 6b | Mascot (departure) | Replaced authored SVGs with **Noto Animated Emoji `1f416`** (`public/emoji/lottie/1f416.json` + `svg/1f416.svg`, same CC-BY source + attribution pipeline as all emoji assets); `Mascot.tsx` keeps mood accents/animation, glyph now `🐖` with `animated` | visual verify + attribution check |
| 7 | StartBatchScreen + GradeSelect | sheet "Khám phá" per §3.1 (tiles, empty wrapper, band-aware sizing, close paths), gold CTA, ≤6/≤2 decisions, band-aware account pills | unit + e2e selector updates |
| 8 | Feedback/reward flow | gentle wrong-answer sound (sfx), OPTION_PICKED_WRONG/OPTION_REVEAL_CORRECT application, retry/demo affordance (display-only, scoring untouched), gift-box flow in summaries, stars-primary display, "Xong rồi / Chơi tiếp?" fork, InstructionSpeaker wiring on kid surfaces (autoplay once/round) | unit: scoring identical, gift deterministic |
| 9 | Exam hybrid | `EXAM_HEADER_BRAND` header + mascot in ExamScreen chrome; ExamResult extracted to own file then brand celebration restyle | unit: existing exam tests green |
| 10 | Parent surfaces | ParentGate wiring on report pill + external links; ParentReportScreen enrich (serverReport.ts: fetchWeekMinutes, fetchMockTrend paginated, weakest-3 cap + suggestion); guest teaser | unit + denial test |
| 11 | Conversion | `pricingFamily.ts` (values from 01-pricing.md, test asserts), PricingCard + transfer note `VS <sdt> <goi>` + Zalo hidden-until-config, ShareCard (Canvas 2D + Web Share, lazy module, fixed-string list test), "Gửi kết quả" card on Batch/Round/Exam summaries (logged-in) | unit + e2e |
| 12 | Digest migration | `supabase/migrations/0039_*.sql` (helper fns + section builder, per-parent error guard) + `supabase/rollback/0039_down.sql` | migration applies clean on staging-equivalent |
| 13 | Fitness functions + tests | no-ungated-purchase-link scanner, G1-2 76px DOM assertions, funnel event bus (client-only), updated e2e | all gates green |

## Test strategy
- TDD where behavior changes (store idempotency, gate, speech statuses).
- Existing 1020+ unit suite must stay green except intentional changes listed
  in PRD behavior-change table (update those tests in same commit).
- E2e: new specs for sheet, gate, gift flow, fork, pricing card; existing
  specs updated for moved selectors (release-contract change #8).

## Risks
- ExamScreen (1234 lines) edits → smallest possible diff, header-only.
- Sheet nesting of existing cards → keep components unchanged, wrap.
- Asset creation quality → authored SVG pigs kept simple/flat, consistent
  stroke; Lottie optional layer skipped if assets insufficient.
