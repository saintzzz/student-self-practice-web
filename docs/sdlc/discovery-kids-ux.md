# Discovery Baseline - Kids-UX Redesign + Parent Conversion

Class: **brownfield**. Baseline: `docs/sdlc/discovery-baseline.md` (whole-app) still
authoritative for behavior/data; this doc is the UX-surface baseline for the
redesign intent in `docs/INTENT.md`.

## Surface inventory (as-is)

| Screen | Component | Size | Notes |
|---|---|---|---|
| login | `AuthScreen.tsx` | 122 | login + guest only; no signup, no forgot-PIN, no parent path |
| grade-select | `GradeSelect.tsx` + `EngagementBar.tsx` + cards | 285 | 5 lands, quests/review/pet/leaderboard/arena chips; guest lock wall |
| start-batch | `StartBatchScreen.tsx` | 215 | ~16 tap targets around 1 CTA (CR-69 critique P1) |
| batch | `BatchScreen.tsx` + `QuestionCard.tsx` + 15 question types | 172 + q-types | strongest surface: good error copy, FeedbackPanel |
| round-summary | `RoundSummary.tsx` | - | sticker chip fixed in CR-69 |
| batch-summary | `BatchSummary.tsx` | - | zero-answer gate fixed in CR-69 |
| exam | `ExamScreen.tsx` | 1234 | deliberate IOE-clone "exam hall" - diverges from shell theme |
| placement | `PlacementScreen.tsx` | - | placement quiz |
| credits | `CreditsScreen.tsx` | - | |
| admin | `AdminScreen.tsx` | - | staff surface, out of kids scope |
| report | `ParentReportScreen.tsx` | 293 | EXISTS - parent progress report; entry point lives in grade-select |

Assets/system: `LandShell` + `scene/LandScene.tsx` (journey map), `Mascot.tsx`
(emoji-based), `EmojiLottiePlayer.tsx` (lottie infra exists), `celebrations/`
(ChestReveal, Confetti, StarRain), `DESIGN_SYSTEM.md` (navy/gold VieSchool law).

## Known UX debt (from CR-69 critique + audits)

1. StartBatchScreen choice overload (~16 targets) - P1, deferred from CR-69.
2. Emoji mascot + stock "key-cap" option buttons = generic at the touch points
   kids hit most (specificity verdict: authored shell, generic components).
3. No pre-reader support: all instruction text is read, nothing read aloud.
4. No parent onboarding/landing/signup/forgot-PIN; parent report exists but is
   buried behind grade-select; no conversion surface (trial/pricing/lead).
5. ExamScreen visual identity split (deliberate, needs a ruling: keep IOE-clone
   vs unify with brand).
6. Detector warnings: gray-on-color, ai-color-palette (indigo/violet),
   side-tab, bounce-easing - cosmetic, deferred.
7. 4 parallel reward currencies (points/stars/XP/badges) compete.

## Strangler-vs-rewrite ruling

Recommendation: **strangler/incremental restyle** - the shell, design tokens,
land map, rewards infra, and question mechanics work and are covered by 1000+
tests. Rewrite risk > benefit. Redesign concentrates on: StartBatchScreen IA,
AuthScreen/parent funnel, question-surface visual language, mascot/art system,
pre-reader voice guidance - all behind the existing screen router.

## Domain pack (draft, to be validated in BA)

- Audience: VN elementary kids 6-11 (grades 1-5), pre-readers in grade 1-2.
- Domain UX anchors: Duolingo ABC, Khan Academy Kids, Monkey Junior, VioEdu.
- Fault classes: dead ends for non-readers, accidental destructive taps
  (mitigated CR-69), reward inflation, screen-time/parental-trust issues.
- Glossary: batch (round set), round (4 per batch), land (grade theme),
  IOE (VN national online English olympiad).

## Research inputs

Two commissioned research reports (subagents) feed Phase 2/3:
- kids-edtech UX benchmarks (Duolingo ABC, Khan Kids, Lingokids, VN apps)
- parent conversion psychology + funnel patterns
